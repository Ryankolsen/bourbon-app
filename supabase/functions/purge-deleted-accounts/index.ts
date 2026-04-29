import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Find all profiles where pending_deletion_at is more than 30 days ago
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error: queryError } = await serviceClient
    .from("profiles")
    .select("id")
    .not("pending_deletion_at", "is", null)
    .lte("pending_deletion_at", cutoff);

  if (queryError) {
    console.error("Failed to query profiles for deletion:", queryError);
    return new Response(JSON.stringify({ error: "Failed to query profiles" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ success: true, deleted: 0 }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Hard-delete each user from auth.users; profiles cascade via FK
  const results = await Promise.allSettled(
    profiles.map(({ id }) => serviceClient.auth.admin.deleteUser(id)),
  );

  const deleted = results.filter((r) => r.status === "fulfilled" && !r.value.error).length;
  const failed = results.length - deleted;

  if (failed > 0) {
    console.error(`Failed to delete ${failed} of ${profiles.length} accounts`);
  }

  return new Response(JSON.stringify({ success: true, deleted, failed }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
