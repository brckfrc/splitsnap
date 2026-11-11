/**
 * parse-receipt — Supabase Edge Function (Deno)
 *
 * Receives raw OCR text from the client and returns structured receipt data
 * via gpt-6-luna (JSON schema output). The OPENAI_API_KEY is stored as a
 * Supabase secret (never in the client bundle).
 *
 * Deploy:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase functions deploy parse-receipt
 *
 * verify_jwt = true (default) — only authenticated Supabase users can call this.
 * Spend is additionally bounded by an input size cap and a per-user daily quota
 * (public.consume_ai_quota), because "authenticated" on its own is not a budget.
 */

import OpenAI from 'npm:openai@^4';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Text longer than this is trimmed rather than rejected: a very long grocery
 * receipt is still a legitimate receipt, it just doesn't need to be sent whole.
 */
const MAX_TEXT_CHARS = 6_000;

/** Anything past this isn't a receipt, and shouldn't even be read into memory. */
const MAX_BODY_BYTES = 64 * 1024;

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

/**
 * Model and reasoning effort are secrets rather than constants so the model can
 * be swapped (or rolled back) with `supabase secrets set`, without a code change.
 * gpt-6-luna replaced gpt-4o-mini, which OpenAI shuts down on 2027-01-14.
 *
 * gpt-6-luna is a reasoning model. Field extraction doesn't need reasoning, and
 * reasoning tokens are billed as output, so the effort defaults to 'none'. For a
 * non-reasoning model (e.g. a rollback to gpt-4o-mini) set
 * OPENAI_RECEIPT_REASONING_EFFORT=omit so the parameter isn't sent at all.
 */
const MODEL = Deno.env.get('OPENAI_RECEIPT_MODEL') || 'gpt-6-luna';
const REASONING_EFFORT = Deno.env.get('OPENAI_RECEIPT_REASONING_EFFORT') || 'none';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Keeps the head and the tail, which is where the answers are: the merchant
 * name sits at the top of a receipt and the total at the very bottom. Cutting
 * from the end would throw away the single most important field.
 */
function clampText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  const half = Math.floor(MAX_TEXT_CHARS / 2);
  return `${text.slice(0, half)}\n[...]\n${text.slice(-half)}`;
}

const SYSTEM_PROMPT = `\
You extract structured data from store receipts (primarily Turkish, but may be in any currency).
Given raw OCR text (possibly noisy / mis-recognised), return ONLY valid JSON.

Rules:
- merchantName: the store / business name, usually at the top. Return null if unclear.
- date: the receipt date in ISO format YYYY-MM-DD. Turkish receipts often use dd.mm.yyyy. Return null if not found.
- total: the grand total amount (look for TOPLAM, GENEL TOPLAM, ÖDENECEK TUTAR, TOTAL). Return a number with dot as decimal separator. Return null if not found.
- currency: the ISO 4217 currency code. Look for ₺ or TL → "TRY", € → "EUR", $ → "USD", £ → "GBP". Return null if the currency cannot be determined.
- Never invent values. If a field is absent or ambiguous, return null for that field.`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // The gateway already enforces verify_jwt, but we need the caller's token
  // anyway to attribute the quota, so treat a missing one as unauthorized here.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'unauthorized' }, 401);
  }

  // Checked before req.json() so an oversized body is never buffered.
  const contentLength = Number(req.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413);
  }

  let text: string;
  try {
    const body = await req.json() as { text?: unknown };
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return json({ error: 'missing_text' }, 400);
    }
    text = clampText(body.text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Consume quota before spending anything. The RPC is SECURITY DEFINER and
  // resolves the user from auth.uid() itself, so forwarding the caller's token
  // is enough and the count can't be attributed to someone else.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ai_quota');
  if (quotaError) {
    console.error('consume_ai_quota failed:', quotaError.message);
    return json({ error: 'quota_check_failed' }, 500);
  }
  if (allowed !== true) {
    return json({ error: 'quota_exceeded' }, 429);
  }

  let content: string;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      ...(REASONING_EFFORT === 'omit'
        ? {}
        // openai@4 types only know 'low' | 'medium' | 'high'; the API also takes
        // 'none', and the SDK passes the value through unchanged.
        : { reasoning_effort: REASONING_EFFORT as 'low' }),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'receipt_data',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              merchantName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              total: { anyOf: [{ type: 'number' }, { type: 'null' }] },
              currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            },
            required: ['merchantName', 'date', 'total', 'currency'],
            additionalProperties: false,
          },
        },
      },
      // Reasoning models reject max_tokens; max_completion_tokens works for both.
      max_completion_tokens: 160,
    });

    content = completion.choices[0]?.message?.content
      ?? '{"merchantName":null,"date":null,"total":null,"currency":null}';
  } catch (err) {
    // Previously an unhandled rejection. The client falls back to its local
    // heuristic parser on any non-2xx, so a clean status is all it needs.
    console.error('openai request failed:', err instanceof Error ? err.message : err);
    return json({ error: 'llm_failed' }, 502);
  }

  return new Response(content, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
