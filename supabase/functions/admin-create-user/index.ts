// Supabase Edge Function: admin-create-user
// Requires caller JWT of an active administrator (or principal).
// Uses SERVICE ROLE only on the server — never expose to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", caller.id)
      .maybeSingle();

    const role = callerProfile?.role;
    const active = (callerProfile?.status || "active") === "active";
    if (!active || (role !== "administrator" && role !== "principal")) {
      return new Response(JSON.stringify({ error: "Only administrators can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const full_name = String(body.full_name || "").trim();
    const userRole = String(body.role || "student").toLowerCase();
    const title = String(body.title || "");
    const phone = String(body.phone || "");
    const status = String(body.status || "active");

    const allowed = [
      "administrator",
      "principal",
      "registrar",
      "finance_officer",
      "lecturer",
      "librarian",
      "reception",
      "student",
    ];
    if (!email || !password || password.length < 6 || !full_name) {
      return new Response(JSON.stringify({ error: "full_name, email, and password (min 6) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!allowed.includes(userRole)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only existing administrators may create another administrator
    if (userRole === "administrator" && role !== "administrator") {
      return new Response(JSON.stringify({ error: "Only administrators may create administrator accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: userRole, title },
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Auth user creation failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      full_name,
      role: userRole,
      title,
      phone,
      status,
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("audit_logs").insert({
      user_email: caller.email || "admin",
      action: "CREATE_USER",
      details: `Created ${userRole} account ${email}`,
    });

    return new Response(
      JSON.stringify({
        user: {
          id: created.user.id,
          email,
          full_name,
          role: userRole,
          title,
          phone,
          status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
