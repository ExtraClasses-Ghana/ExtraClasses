import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if this is an admin-initiated deletion
    let targetUserId = user.id;
    
    const body = await req.json().catch(() => ({}));
    if (body.target_user_id && body.target_user_id !== user.id) {
      // Verify the caller is an admin
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "admin") {
        throw new Error("Only admins can delete other users' accounts");
      }

      targetUserId = body.target_user_id;
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete user's data in order (respecting foreign key constraints)
    
    // Delete sessions where user is student or teacher
    await supabaseAdmin
      .from("sessions")
      .delete()
      .or(`student_id.eq.${targetUserId},teacher_id.eq.${targetUserId}`);

    // Delete payments
    await supabaseAdmin
      .from("payments")
      .delete()
      .eq("payer_id", targetUserId);

    // Delete reviews where user is student or teacher
    await supabaseAdmin
      .from("reviews")
      .delete()
      .or(`student_id.eq.${targetUserId},teacher_id.eq.${targetUserId}`);

    // Delete messages
    await supabaseAdmin
      .from("messages")
      .delete()
      .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);

    // Delete favorite teachers
    await supabaseAdmin
      .from("favorite_teachers")
      .delete()
      .or(`student_id.eq.${targetUserId},teacher_id.eq.${targetUserId}`);

    // Delete complaints
    await supabaseAdmin
      .from("complaints")
      .delete()
      .or(`reporter_id.eq.${targetUserId},reported_user_id.eq.${targetUserId}`);

    // Delete verification documents
    await supabaseAdmin
      .from("verification_documents")
      .delete()
      .eq("teacher_id", targetUserId);

    // Delete teacher profile
    await supabaseAdmin
      .from("teacher_profiles")
      .delete()
      .eq("user_id", targetUserId);

    // Delete admin notifications related to user
    await supabaseAdmin
      .from("admin_notifications")
      .delete()
      .eq("related_user_id", targetUserId);

    // Delete user roles
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    // Delete profile
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", targetUserId);

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
