/**
 * Receipt parsing service — converts raw OCR text into structured data.
 *
 * Two-layer strategy:
 *   1. parseReceiptText()   → calls Supabase Edge Function "parse-receipt"
 *                             (gpt-4o-mini, structured JSON output).
 *                             Falls back to local heuristic if the function
 *                             is unavailable (key not yet set, offline, error).
 *   2. parseReceiptTextLocal() → deterministic regex heuristic for Turkish
 *                             receipts. Works offline, no API key needed.
 *
 * parseReceipt(imageUri) is the top-level helper used by the UI:
 *   image URI → OCR text → parseReceiptText() → ReceiptScan
 */

import { supabase } from '@/lib/supabase';
import { extractReceiptText } from '@/services/ocr';

export type ReceiptParseResult = {
  merchantName?: string;
  date?: string;     // ISO YYYY-MM-DD
  total?: number;
  currency?: string; // ISO 4217: "TRY", "EUR", "USD", "GBP" … null if unclear
};

/**
 * Outcome of a full scan. Lets the UI tell apart "we filled your form" from
 * "that image probably isn't a receipt", instead of claiming success for an
 * empty result.
 */
export type ReceiptScanStatus =
  /** At least one usable field was recognised. */
  | 'filled'
  /** Text was read, but nothing receipt-like could be parsed out of it. */
  | 'empty'
  /** OCR found no readable text at all — likely not a receipt photo. */
  | 'no_text'
  /** OCR itself failed (unsupported device, unreadable file). */
  | 'failed';

export type ReceiptScan = {
  status: ReceiptScanStatus;
  result: ReceiptParseResult;
};

/**
 * `currency` is deliberately excluded: a stray "$" or "TL" can appear in any
 * text, so on its own it is not evidence that the image was a receipt.
 */
function hasUsableFields(r: ReceiptParseResult): boolean {
  return Boolean(r.merchantName || r.date || r.total != null);
}

// ---------------------------------------------------------------------------
// Local heuristic parser (Faz 4 fallback — works without API key)
// ---------------------------------------------------------------------------

/**
 * Parses raw OCR text from a Turkish receipt using deterministic regex rules.
 * Handles amounts in both "1.234,56" (TR) and "1234.56" (EN) formats.
 */
export function parseReceiptTextLocal(rawText: string): ReceiptParseResult {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ReceiptParseResult = {};

  // --- Date ---
  // Matches dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy (and 2-digit year variants)
  const dateRe = /\b(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})\b/;
  for (const line of lines) {
    const m = dateRe.exec(line);
    if (m) {
      let y = parseInt(m[3], 10);
      if (y < 100) y += y < 50 ? 2000 : 1900;
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[1], 10);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        result.date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        break;
      }
    }
  }

  // --- Total ---
  // Strategy: scan from bottom up; first line matching a total keyword wins.
  // Amount format: "1.234,56" (TR) | "1234,56" | "1234.56"
  const totalKeywordRe = /toplam|ödenecek|tutar|total/i;
  const amountRe = /\d{1,3}(?:[.]\d{3})*[,]\d{2}|\d+[,]\d{2}|\d+[.]\d{2}/g;

  let foundTotal = false;
  for (let i = lines.length - 1; i >= 0 && !foundTotal; i--) {
    if (totalKeywordRe.test(lines[i])) {
      // Check this line and the next line together (amount may wrap)
      const text = lines[i] + ' ' + (lines[i + 1] ?? '');
      amountRe.lastIndex = 0;
      const m = amountRe.exec(text);
      if (m) {
        const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
        if (v > 0) { result.total = v; foundTotal = true; }
      }
    }
  }

  // Fallback: largest amount in bottom half of receipt
  if (!foundTotal) {
    let max = 0;
    for (const line of lines.slice(Math.floor(lines.length / 2))) {
      const re = /\d{1,3}(?:[.]\d{3})*[,]\d{2}|\d+[,]\d{2}|\d+[.]\d{2}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
        if (v > max && v < 50_000) max = v; // sanity cap
      }
    }
    if (max > 0) result.total = max;
  }

  // --- Merchant name ---
  // First line in the top 6 that looks like a business name
  // (has at least one letter, doesn't start with a digit, length ≥ 3)
  for (const line of lines.slice(0, 6)) {
    if (
      line.length >= 3 &&
      !/^\d/.test(line) &&
      /[A-Za-zçğışöüÇĞİŞÖÜ]/.test(line)
    ) {
      result.merchantName = line;
      break;
    }
  }

  // --- Currency ---
  // Scan entire text for currency symbols; first match wins.
  // TRY is checked last so a non-₺ symbol on a Turkish receipt wins.
  const allText = rawText;
  if (/€|EUR\b/i.test(allText)) result.currency = 'EUR';
  else if (/\$|USD\b/i.test(allText)) result.currency = 'USD';
  else if (/£|GBP\b/i.test(allText)) result.currency = 'GBP';
  else if (/₺|\bTL\b|\bTRY\b/i.test(allText)) result.currency = 'TRY';

  return result;
}

// ---------------------------------------------------------------------------
// LLM parser via Supabase Edge Function (Faz 5 — active once key is set)
// ---------------------------------------------------------------------------

/**
 * Mirrors the edge function's own cap so a long receipt is shaped here rather
 * than server-side. Head and tail are kept because the merchant name is at the
 * top of a receipt and the total at the bottom.
 */
const MAX_TEXT_CHARS = 6_000;

function clampText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  const half = Math.floor(MAX_TEXT_CHARS / 2);
  return `${text.slice(0, half)}\n[...]\n${text.slice(-half)}`;
}

/**
 * Sends OCR text to the "parse-receipt" Supabase Edge Function which calls
 * gpt-4o-mini for structured JSON output. Falls back to the local heuristic
 * transparently on any failure: function not deployed, offline, provider error,
 * or the caller's daily AI quota being spent (429).
 */
export async function parseReceiptText(rawText: string): Promise<ReceiptParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke<ReceiptParseResult>(
      'parse-receipt',
      { body: { text: clampText(rawText) } },
    );
    if (error || !data) throw new Error(error?.message ?? 'no_data');
    return data;
  } catch {
    // Edge function unavailable (key not set, offline, deploy pending) → heuristic
    return parseReceiptTextLocal(rawText);
  }
}

// ---------------------------------------------------------------------------
// Top-level helper used by the UI
// ---------------------------------------------------------------------------

/**
 * Full pipeline: image URI → on-device OCR → parse (LLM or heuristic).
 * Never throws — every failure mode is reported through `status` so the UI can
 * warn the user instead of silently pretending the scan worked.
 */
export async function parseReceipt(imageUri: string): Promise<ReceiptScan> {
  let text: string;
  try {
    text = await extractReceiptText(imageUri);
  } catch {
    return { status: 'failed', result: {} };
  }

  if (text.trim().length === 0) {
    return { status: 'no_text', result: {} };
  }

  const result = await parseReceiptText(text);
  return { status: hasUsableFields(result) ? 'filled' : 'empty', result };
}
