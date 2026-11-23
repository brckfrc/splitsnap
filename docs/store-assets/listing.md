# App Store listing (TR, EN)

The store text as it stands in App Store Connect, copied from the developer's notes on
2026-11-22 so agents can check it against the app at every Sprint close (`docs/AGENTS.md` →
*Outward-facing check*). App Store Connect is the source of truth; when it changes there, change it
here in the same breath. The Turkish text was copied from App Store Connect on 2026-11-24 (version 1.2.1), after
issues 1–3 below were fixed there.

## Turkish (primary, 1.2.1)

### Promotional text

```text
Arkadaşlarınızla veya ev arkadaşlarınızla ortak harcamaları saniyeler içinde kaydedin, fişleri tarayın ve hesabı en adil şekilde bölün!
```

### Description

```text
SplitSnap ile ev arkadaşlarınızla, tatil grubunuzla veya arkadaş çevrenizle yaptığınız ortak harcamaları saniyeler içinde kaydedin ve adil şekilde bölün.

Fişin fotoğrafını çekin, gerisini SplitSnap halletsin: Yapay zekâ destekli fiş okuma özelliği sayesinde işletme adı, tarih ve tutar otomatik olarak doldurulsun.

ÖZELLİKLER
• Grup oluşturun, davet koduyla arkadaşlarınızı kolayca ekleyin.
• Harcamaları eşit veya kişiye özel olarak manuel bölüştürün.
• Fiş fotoğrafından otomatik doldurma yapın (Cihaz üzerinde yerel OCR ve akıllı ayrıştırma).
• Kimin kime ne kadar borcu olduğunu görün ve birkaç ödemeyle hesaplaşın.
• Ayrıntılı harcama geçmişini ve kişisel harcama dökümünüzü inceleyin.
• Açık ve koyu tema desteğiyle hızlı ve akıcı arayüzün keyfini çıkarın.
• Çevrimdışı önbellek desteği sayesinde uygulamayı anında açın.
• Bir harcamayı birden fazla kişi ödediyse her birinin payını girin.
• Ana sayfada tüm gruplardaki bakiyenizi tek bakışta görün.
• Fiş fotoğrafını tam ekranda açıp inceleyin.

GİZLİLİK ODAKLI
Fişteki metin cihazınızda okunur; alanları doldurmak için yapay zekâ servisimize fotoğraf değil, yalnızca bu metin gönderilir. Fiş fotoğrafları yalnızca grubunuzun üyeleriyle paylaşılır.

Ev kirası, market, tatil, akşam yemeği... Ne olursa olsun, hesabı SplitSnap tutsun.
```

### Keywords

```text
harcama,bölüşme,grup,fiş,hesap,ortak,borç,arkadaş,tatil,masraf,ödeme,ev,para,fatura,pay,bakiye
```

## English

### Name and subtitle

```text
SplitSnap
Split Bills & Shared Expenses
```

### Promotional text

```text
Easily manage shared expenses with roommates or on trips. Snap a photo of your receipt to auto-fill details and settle up instantly!
```

### Description

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

## Open issues in the English text (checked 2026-11-22)

Fixed in the Turkish text on 2026-11-24 (see above); the English listing still has all three.

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
