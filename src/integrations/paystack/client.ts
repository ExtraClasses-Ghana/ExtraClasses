import { supabase } from "@/integrations/supabase/client";

// Dynamically handle VITE or fallback environment variables
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_45b074685f5897c6e6561392ad8ad41b32632551";
const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY || "sk_test_cb1974b91f7a4edf6b0a8430609f58b658588bba";

export interface InitOpts {
  email: string;
  amount: number; // pesewas
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export async function initializeTransaction(opts: InitOpts) {
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...opts,
        callback_url: opts.callback_url || window.location.origin,
      })
    });
    const data = await res.json();
    if (!data.status) throw new Error(data.message);
    return data;
  } catch (err: any) {
    console.error("Direct Initialize Error:", err);
    // Even if initialization fails (CORS), we can still fallback to client-side PaystackPop
    return { status: true, data: { authorization_url: null, reference: opts.reference } };
  }
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
    }
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message);
  return data;
}

export function openPaystackInline({ email, amount, reference, authorization_url }: { email: string; amount: number; reference: string; authorization_url?: string; }) {
  return new Promise<any>((resolve, reject) => {
    try {
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
            reject(new Error("Payment window closed"));
          },
        });

        handler.openIframe();
      };

      if ((window as any).PaystackPop) pay();
      else {
        (window as any).addEventListener("paystackLoaded", pay, { once: true });
        setTimeout(pay, 1000);
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
  verifyTransaction,
};
