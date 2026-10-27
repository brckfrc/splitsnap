/**
 * Money values coming back from Supabase.
 *
 * Postgres `numeric` is serialised by PostgREST as a JSON **string** (`"50.00"`),
 * not a number, so every money column has to pass through here before it touches
 * arithmetic. A single unparsed value is enough to break a whole balance sheet:
 * `balances[id] += "50.00"` turns the accumulator into a string and every later
 * comparison and format silently produces garbage.
 *
 * Not the same as `parseAmount` in `utils/validation.ts`, which parses what a
 * user typed ("1.234,56") and returns NaN when that fails. This one reads values
 * the database produced and always yields a usable number.
 */
export function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
