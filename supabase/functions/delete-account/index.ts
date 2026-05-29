/**
 * delete-account — Supabase Edge Function (Deno)
 *
 * Deletes the calling user's account (Apple App Store Guideline 5.1.1(v)).
 *
 * Why anonymize instead of hard-delete:
 *   profiles.id → auth.users ON DELETE CASCADE, and expenses.paid_by /
 *   groups.owner_id are NOT NULL + RESTRICT. Hard-deleting the auth user would
 *   either fail (FK) or cascade away shared records, breaking other group
 *   members' settlement history. So we ANONYMIZE the profile and DISABLE login
 *   (ban + scrambled email/password): personal data is removed and the account
 *   can never be accessed again, while shared expense history stays intact as
 *   "Silinmiş Kullanıcı".
 *
 * verify_jwt = true (default) — only authenticated users can call this.
 *
 * Deploy:
 *   supabase functions deploy delete-account
 */

import { createClient } from 'npm:@supabase/supabase-js@^2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // 1. Identify the caller from their JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: 'unauthorized' }, 401);
  }
  const userId = userData.user.id;

  // 2. Service-role client (bypasses RLS + admin API).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Anonymize the profile (kept so shared expense/settlement history stays valid).
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      display_name: 'Silinmiş Kullanıcı',
      email: null,
      avatar_url: null,
      user_invite_code: `deleted-${userId}`,
    })
    .eq('id', userId);
  if (profileErr) {
    return json({ error: 'profile_anonymize_failed', detail: profileErr.message }, 500);
  }

  // 4. Disable login: ban + scramble email/password → account inaccessible, PII removed.
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
    email: `deleted-${userId}@deleted.splitsnap.app`,
    password: crypto.randomUUID() + crypto.randomUUID(),
    ban_duration: '876000h', // ~100 years
    user_metadata: {},
  });
  if (banErr) {
    return json({ error: 'auth_disable_failed', detail: banErr.message }, 500);
  }

  return json({ ok: true }, 200);
});
