import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface TriggerPayload {
  id: string;
  bourbon_id: string;
  submitted_by: string | null;
  field_name: string;
}

Deno.serve(async (req: Request) => {
  // Only accept POST from internal trigger (service role key in Authorization header)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: TriggerPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { bourbon_id, submitted_by, field_name } = payload;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Look up the bourbon name
  const { data: bourbon, error: bourbonError } = await serviceClient
    .from("bourbons")
    .select("name")
    .eq("id", bourbon_id)
    .single();

  if (bourbonError || !bourbon) {
    console.error("Failed to look up bourbon:", bourbonError);
    return new Response(JSON.stringify({ error: "Bourbon not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Look up the submitting user's display name
  let displayName = "A community member";
  if (submitted_by) {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("display_name")
      .eq("id", submitted_by)
      .single();
    if (profile?.display_name) {
      displayName = profile.display_name;
    }
  }

  // Query all admin profiles
  const { data: adminProfiles, error: adminsError } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("is_admin", true);

  if (adminsError) {
    console.error("Failed to query admin profiles:", adminsError);
    return new Response(JSON.stringify({ error: "Failed to query admins" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!adminProfiles || adminProfiles.length === 0) {
    // No admins — silent no-op
    return new Response(JSON.stringify({ success: true, sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminIds = adminProfiles.map((p) => p.id);

  // Fetch push tokens for all admin users
  const { data: pushTokenRows, error: tokensError } = await serviceClient
    .from("user_push_tokens")
    .select("token")
    .in("user_id", adminIds);

  if (tokensError) {
    console.error("Failed to query push tokens:", tokensError);
    return new Response(JSON.stringify({ error: "Failed to query push tokens" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!pushTokenRows || pushTokenRows.length === 0) {
    // No admin push tokens registered — silent no-op
    return new Response(JSON.stringify({ success: true, sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notificationTitle = bourbon.name;
  const notificationBody = `${displayName} suggested a change to ${field_name}`;

  // Send one push notification per token; log errors but continue to next token
  let sent = 0;
  for (const { token } of pushTokenRows) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          title: notificationTitle,
          body: notificationBody,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Expo push failed for token ${token}: ${res.status} ${text}`);
      } else {
        sent++;
      }
    } catch (err) {
      console.error(`Expo push request threw for token ${token}:`, err);
    }
  }

  return new Response(JSON.stringify({ success: true, sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
