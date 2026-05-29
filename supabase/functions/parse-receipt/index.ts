/**
 * parse-receipt — Supabase Edge Function (Deno)
 *
 * Receives raw OCR text from the client and returns structured receipt data
 * via gpt-4o-mini (JSON schema output). The OPENAI_API_KEY is stored as a
 * Supabase secret (never in the client bundle).
 *
 * Deploy:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase functions deploy parse-receipt
 *
 * verify_jwt = true (default) — only authenticated Supabase users can call this.
 */

import OpenAI from 'npm:openai@^4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

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

  let text: string;
  try {
    const body = await req.json() as { text?: unknown };
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'missing_text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    text = body.text;
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
    max_tokens: 160,
  });

  const content = completion.choices[0]?.message?.content ?? '{"merchantName":null,"date":null,"total":null,"currency":null}';

  return new Response(content, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
