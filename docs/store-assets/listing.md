# App Store listing (EN)

The store text as it stands in App Store Connect, copied from the developer's notes on
2026-11-22 so agents can check it against the app at every Sprint close (`docs/AGENTS.md` →
*Outward-facing check*). App Store Connect is the source of truth; when it changes there, change it
here in the same breath. The Turkish listing is not copied yet.

## Name and subtitle

```text
SplitSnap
Split Bills & Shared Expenses
```

## Promotional text

```text
Easily manage shared expenses with roommates or on trips. Snap a photo of your receipt to auto-fill details and settle up instantly!
```

## Description

```text
Easily track and split shared expenses with roommates, travel groups, or friends in seconds using SplitSnap.

Snap a photo of your receipt and let SplitSnap do the rest. Our AI-powered receipt scanning automatically extracts the merchant name, date, and total amount.

FEATURES
• Create groups and invite friends easily with invite codes.
• Split expenses equally or customize shares manually.
• Auto-fill details from receipt photos (On-device OCR and smart parsing).
• See who owes whom. View net balance summaries and settle up with optimized, minimal transactions.
• Access detailed expense history and individual ledger breakdowns.
• Enjoy a fast, responsive interface with native light and dark mode support.
• Load the app instantly with offline caching.

PRIVACY FIRST
Your receipt images are kept private. Text extraction is performed entirely on your device before processing. We care about your privacy.

Rent, groceries, trips, dinners... No matter the expense, let SplitSnap handle the math.
```

## Open issues (checked 2026-11-22, not yet changed in App Store Connect)

1. **"PRIVACY FIRST" overstates.** Text extraction does run on the device, but the extracted text is
   then sent to OpenAI to fill in the fields, and receipt photos are uploaded and visible to the
   group's members (`website/privacy.html` says both). Read together, "kept private" and "entirely on
   your device" suggest nothing leaves the phone. Suggested:
   `Receipt text is read on your device; only that text, never the photo, is sent to our AI service to fill in the details. Receipt photos are shared only with the members of your group.`
2. **"optimized, minimal transactions" overclaims.** The suggestions pair the largest debts with the
   largest credits, which keeps payments few but is not guaranteed minimal (README was corrected
   the same day). Suggested: `See who owes whom and settle up in a few payments.`
3. **Missing since 1.2.0:** several payers on one expense, the home summary, and the full-screen
   receipt viewer are not mentioned.
