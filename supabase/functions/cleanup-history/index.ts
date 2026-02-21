import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Cutoff: 48 hours ago
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Delete payments older than cutoff
    const { error: paymentsError } = await supabaseAdmin
      .from("payments")
      .delete()
      .lt("created_at", cutoff);

    // Delete sessions older than cutoff
    const { error: sessionsError } = await supabaseAdmin
      .from("sessions")
      .delete()
      .lt("created_at", cutoff);

    if (paymentsError || sessionsError) {
      const message = [paymentsError?.message, sessionsError?.message].filter(Boolean).join("; ");
      throw new Error(message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Cleanup completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
