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

    const { email, password } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Admin User",
        role: "admin",
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("already been registered")) {
        // Get existing user and update role
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find((u) => u.email === email);

        if (existingUser) {
          // Ensure admin role exists
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("*")
            .eq("user_id", existingUser.id)
            .single();

          if (!existingRole) {
            await supabaseAdmin.from("user_roles").insert({
              user_id: existingUser.id,
              role: "admin",
            });
          } else if (existingRole.role !== "admin") {
            await supabaseAdmin
              .from("user_roles")
              .update({ role: "admin" })
              .eq("user_id", existingUser.id);
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Admin role assigned to existing user",
              user_id: existingUser.id,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
      throw authError;
    }

    // Create profile for admin
    await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      full_name: "Admin User",
      email: email,
    });

    // Create admin role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: "admin",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully",
        user_id: authData.user.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating admin:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
