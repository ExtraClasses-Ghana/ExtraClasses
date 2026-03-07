import { supabase } from "@/integrations/supabase/client";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export interface InitOpts {
  email: string;
  amount: number; // in pesewas (GHS * 100)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export async function initializeTransaction(opts: InitOpts) {
  const body = { action: "initialize", ...opts };

  // Try Supabase client functions.invoke first
  try {
    const { data, error } = await supabase.functions.invoke("paystack", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as any;
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("supabase.functions.invoke failed, falling back to fetch:", err);
  }

  // Fallback: call edge function directly via fetch
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase function invocation failed and no SUPABASE_URL/PUBLISHABLE_KEY configured");
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/paystack/initialize`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edge function returned ${res.status}: ${txt}`);
  }

  return await res.json();
}

export async function verifyTransaction(reference: string) {
  const body = { action: "verify", reference };
  try {
    const { data, error } = await supabase.functions.invoke("paystack", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as any;
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("supabase.functions.invoke verify failed, falling back to fetch:", err);
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase function invocation failed and no SUPABASE_URL/PUBLISHABLE_KEY configured");
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/paystack/verify`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ reference }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edge function verify returned ${res.status}: ${txt}`);
  }

  return await res.json();
}

// Opens Paystack inline widget and returns a promise that resolves when inline callback runs
export function openPaystackInline({ email, amount, reference, authorization_url }: { email: string; amount: number; reference: string; authorization_url?: string; }) {
  return new Promise<any>((resolve, reject) => {
    try {
      // Load inline script if not present
      if (!(window as any).PaystackPop) {
        const s = document.createElement("script");
        s.src = "https://js.paystack.co/v1/inline.js";
        s.async = true;
        s.onload = () => window.dispatchEvent(new Event("paystackLoaded"));
        document.head.appendChild(s);
      }

      const pay = () => {
        const PaystackPop = (window as any).PaystackPop;
        if (!PaystackPop) {
          // fallback to opening authorization_url
          if (authorization_url) {
            window.open(authorization_url, "_blank");
            reject(new Error("Paystack inline not available; opened authorization_url"));
          } else {
            reject(new Error("Paystack inline not available"));
          }
          return;
        }

        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email,
          amount,
          ref: reference,
          callback: function (response: any) {
            resolve(response);
          },
          onClose: function () {
            reject(new Error("Payment closed by user"));
          },
        });

        handler.openIframe();
      };

      if ((window as any).PaystackPop) pay();
      else {
        (window as any).addEventListener("paystackLoaded", pay, { once: true });
        // also try to call after small delay
        setTimeout(pay, 800);
      }
    } catch (e) {
      console.error("Failed to open Paystack inline", e);
      if (authorization_url) window.open(authorization_url, "_blank");
      reject(e);
    }
  });
}

export default {
  initializeTransaction,
  openPaystackInline,
};
