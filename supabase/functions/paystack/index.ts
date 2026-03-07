import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InitializePaymentRequest {
  email: string;
  amount: number; // Amount in pesewas (GHS * 100)
  reference: string;
  callback_url: string;
  metadata?: {
    session_id?: string;
    payer_id?: string;
    teacher_id?: string;
  };
  channels?: string[]; // ['card', 'mobile_money', 'bank']
}

interface VerifyPaymentRequest {
  reference: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // Parse JSON body for non-webhook POSTs so clients can call the function
    let bodyJson: any = null;
    if (req.method === "POST") {
      try {
        // For webhook we will read text later
        if (url.pathname.split("/").pop() !== "webhook") {
          bodyJson = await req.json().catch(() => null);
        }
      } catch (_) {
        bodyJson = null;
      }
    }

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Initialize payment
    if ((action === "initialize" || bodyJson?.action === "initialize") && req.method === "POST") {
      const body: InitializePaymentRequest = (bodyJson ?? (await req.json())) as InitializePaymentRequest;

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: body.email,
          amount: body.amount,
          reference: body.reference,
          callback_url: body.callback_url,
          channels: body.channels || ["card", "mobile_money"],
          metadata: body.metadata,
          currency: "GHS",
        }),
      });

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify payment
    if ((action === "verify" || bodyJson?.action === "verify") && req.method === "POST") {
      const body: VerifyPaymentRequest = (bodyJson ?? (await req.json())) as VerifyPaymentRequest;

      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${body.reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Webhook handler
    if (action === "webhook" && req.method === "POST") {
      const payload = await req.text();
      const signature = req.headers.get("x-paystack-signature") ?? "";

      // Verify webhook signature using HMAC SHA512
      const verifySignature = async (secret: string, body: string, headerSig: string) => {
        try {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(secret),
            { name: "HMAC", hash: "SHA-512" },
            false,
            ["sign"]
          );
          const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
          const hex = Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          return headerSig === hex;
        } catch (e) {
          console.error("Signature verify error:", e);
          return false;
        }
      };

      if (!PAYSTACK_SECRET_KEY) {
        console.warn("PAYSTACK_SECRET_KEY not set; rejecting webhook");
        return new Response(null, { status: 401 });
      }

      const isValid = await verifySignature(PAYSTACK_SECRET_KEY, payload, signature);
      if (!isValid) {
        console.warn("Invalid Paystack signature");
        return new Response(null, { status: 401 });
      }

      const event = JSON.parse(payload);

      // Helper: update or insert payment in Supabase via REST
      const upsertPayment = async (data: any) => {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          console.warn("Supabase config missing; skipping DB update");
          return;
        }

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Prefer: "return=representation",
        } as Record<string, string>;

        // Try updating an existing payment by transaction_ref
        if (data.transaction_ref) {
          const patchRes = await fetch(
            `${SUPABASE_URL}/rest/v1/payments?transaction_ref=eq.${encodeURIComponent(
              data.transaction_ref
            )}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({ status: data.status, payment_method: data.payment_method }),
            }
          );

          if (patchRes.ok) {
            const patched = await patchRes.json().catch(() => null);
            if (patched && patched.length > 0) return;
          }
        }

        // Insert a new payment record if update didn't find one
        const insertBody: any = {
          session_id: data.session_id ?? null,
          payer_id: data.payer_id ?? null,
          amount: data.amount ?? null,
          status: data.status ?? "paid",
          payment_method: data.payment_method ?? event.data?.channel ?? null,
          transaction_ref: data.transaction_ref ?? event.data?.reference ?? null,
        };

        await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
          method: "POST",
          headers,
          body: JSON.stringify(insertBody),
        }).catch((e) => console.error("Insert payment error:", e));
      };

      // Handle different event types
      switch (event.event) {
        case "charge.success": {
          console.log("Payment successful:", event.data);
          const d = event.data;
          const metadata = d.metadata ?? {};
          await upsertPayment({
            session_id: metadata.session_id ?? null,
            payer_id: metadata.payer_id ?? null,
            amount: (d.amount ? d.amount / 100 : null),
            status: "paid",
            payment_method: d.channel ?? d.authorization?.channel ?? null,
            transaction_ref: d.reference,
          });
          break;
        }
        case "charge.failed": {
          console.log("Payment failed:", event.data);
          const d = event.data;
          await upsertPayment({
            session_id: d.metadata?.session_id ?? null,
            payer_id: d.metadata?.payer_id ?? null,
            amount: (d.amount ? d.amount / 100 : null),
            status: "failed",
            payment_method: d.channel ?? null,
            transaction_ref: d.reference,
          });
          break;
        }
        default:
          console.log("Unhandled event:", event.event);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Paystack error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
