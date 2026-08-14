// Supabase Edge Function: admin-update-user
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
    } = await userClient.auth.getUser();
    if (!caller) {
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

    if (
      !callerProfile ||
      callerProfile.status === "suspended" ||
      (callerProfile.role !== "administrator" && callerProfile.role !== "principal")
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId = body.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent principals from escalating any account to administrator and
    // prevent non-administrators from modifying an existing administrator.
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", userId)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Target user profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      callerProfile.role !== "administrator" &&
      (targetProfile.role === "administrator" || body.role === "administrator")
    ) {
      return new Response(JSON.stringify({ error: "Only administrators can create or modify administrator accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.role != null) {
      const allowedRoles = [
        "administrator",
        "principal",
        "registrar",
        "finance_officer",
        "lecturer",
        "librarian",
        "reception",
        "student",
      ];
      const requestedRole = String(body.role).toLowerCase();
      if (!allowedRoles.includes(requestedRole)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body.role = requestedRole;
    }

    const patch: Record<string, unknown> = {};
    if (body.full_name != null) patch.full_name = body.full_name;
    if (body.email != null) patch.email = String(body.email).trim().toLowerCase();
    if (body.role != null) patch.role = body.role;
    if (body.title != null) patch.title = body.title;
    if (body.phone != null) patch.phone = body.phone;
    if (body.status != null) patch.status = body.status;
    if (body.deactivate) patch.status = "suspended";

    if (Object.keys(patch).length) {
      const { error } = await admin.from("profiles").update(patch).eq("id", userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (body.password && String(body.password).length >= 6) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
        password: String(body.password),
      });
      if (pwErr) {
        return new Response(JSON.stringify({ error: pwErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (patch.email) {
      await admin.auth.admin.updateUserById(userId, { email: String(patch.email) });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
