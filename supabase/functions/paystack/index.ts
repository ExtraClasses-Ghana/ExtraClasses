import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

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

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Initialize payment
    if (action === "initialize" && req.method === "POST") {
      const body: InitializePaymentRequest = await req.json();

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
    if (action === "verify" && req.method === "POST") {
      const body: VerifyPaymentRequest = await req.json();

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
      const signature = req.headers.get("x-paystack-signature");

      // Verify webhook signature (in production, use crypto to verify)
      console.log("Received webhook:", payload);
      console.log("Signature:", signature);

      const event = JSON.parse(payload);

      // Handle different event types
      switch (event.event) {
        case "charge.success":
          console.log("Payment successful:", event.data);
          // Update payment status in database
          // Send confirmation email
          break;
        case "charge.failed":
          console.log("Payment failed:", event.data);
          break;
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
  } catch (error: any) {
    console.error("Paystack error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
