# Release Notes (App Store "What's New")

The text pasted into App Store Connect, kept here so it is written while the work is fresh and
archived once it ships. Style: `docs/AGENTS.md` → *Release Notes Guidelines* (user benefit, no
library names or versions, no emoji; Turkish first, English for later localisation).

How it is kept:

- **While working:** a PR that changes something a user can see or feel adds one line under
  *Unreleased*, in both languages. Internal work (tests, CI, docs, server-only changes that are
  already live for every version) does not.
- **On release day:** check *Unreleased* against the commits since the last release tag
  (`git log --oneline <last tag>..main`; the Release workflow lists them in its run summary),
  polish it, then rename the section to the version and build that shipped and start a new empty
  *Unreleased* above it.
- Notes describe the change **since the last version on the App Store**, not since the last
  build: builds that never left TestFlight do not reset the list.

---

## Unreleased

Nothing yet. Covers changes since 1.2.1 (Build 17, tag `v1.2.1-build.17`).

---

## Shipped

1.2.1 onwards: archived from this file with both languages, as pasted into App Store Connect.
1.2.0 and earlier: archived from the developer's notes on 2026-11-22, English only (App Store
Connect has the Turkish under each version). 1.0.0's notes were not kept.

### 1.2.1 (Build 17)

Saved in App Store Connect on 2026-11-24. Builds 15 and 16 of the same version were uploaded but never submitted.

Covers everything since 1.2.0, the version on the App Store (submission prep `43d839e`, 2026-07-27): checked against `git log 43d839e..main` on 2026-11-22, which added Sprint #4's settle-up fixes (`3bcbcf7`) to the first draft.

**TR**

```text
İyileştirmeler:
• Ödeme özetindeki döküm artık kaydedilen ödemeleri de gösteriyor ve en üstteki net bakiyeyle birebir tutuyor.
• Kaydedilen bir ödeme, gruptaki diğer kişilerin ekranına anında yansıyor.
• Uygulamanın altyapısı güncellendi; daha kararlı bir deneyim.

Hata Düzeltmeleri:
• Bir borç bu arada değiştiyse ya da kapandıysa, önerilen ödeme artık sessizce kaydedilmiyor; uygulama önce uyarıyor.
• Ödemeyi onaylarken art arda dokununca açılan çift onay penceresi giderildi.
• Koyu modda tarih seçicideki tarihler artık okunaklı.
• "1.234,56" gibi binlik ayraçlı tutarlar doğru okunuyor; belirsiz bir tutarda uygulama uyarı gösteriyor.
• Manuel bölüşümde 1 kuruşluk yuvarlama farkı her tutarda kabul ediliyor.
• Çok küçük bir tutarı eşit bölüştürürken oluşan hata giderildi.
```

**EN**

```text
Improvements:
• The breakdown on the settle-up screen now includes recorded payments and always adds up to the net balance at the top.
• A recorded payment now shows up on the other group members' screens right away.
• Updated the app's foundations for a more stable experience.

Bug Fixes:
• If a debt changed or was already settled in the meantime, a suggested payment is no longer recorded silently; the app warns you first.
• Fixed a double confirmation dialog when tapping repeatedly to confirm a payment.
• Dates in the date picker are now easy to read in dark mode.
• Amounts with thousands separators (such as "1,234.56") are read correctly; an ambiguous amount now shows a warning.
• A one-cent rounding difference in a manual split is now accepted at any amount.
• Fixed an error when splitting a very small amount equally.
```

### 1.2.0 (Build 13)

**EN**

```text
Features:
• The home screen now opens on a summary: what you are owed, what you owe, how much you have spent this month, and the latest activity across all your groups. Tap a balance to see exactly which groups it came from.
• Any unpaid debt is surfaced on a dedicated card at the top of the home screen, one tap away from the settle-up screen.
• When more than one person paid for an expense, you can now record every payer on that single expense.
• A new floating navigation bar with a center add button makes it much faster to pick a group and jump straight into a new expense.
• Receipt photos can be opened full screen, then pinched to zoom and dragged around so the details are actually readable.
• Tap any expense in the settle-up summary to see its full breakdown: who paid how much, each person's share, and how it affects your balance.
• Joining a group now accepts the whole message or link you were sent; the invite code is extracted automatically. Every member of a group can share an invite, not just the person who created it.
• The expense list can be sorted by the date on the receipt or by the date it was added to the app.
• Password fields have an eye button so you can check what you typed.

Improvements:
• Dark mode moved to a true black background, and light mode gained a new layered look.
• Sheets open and close noticeably more smoothly.
• Recent activity is now ordered by when an expense was added, with easy-to-read labels such as Today and Yesterday.
• Choosing a new password now shows a live strength meter alongside clearer form guidance.
• You are asked to sign in again after changing your password, for security.
• Deleting your account moved to a dedicated screen that spells out what will happen.
• Refreshed visual identity on the login and registration screens with the new logo design.
• General performance and stability improvements.

Bug Fixes:
• Receipt photos were not actually being uploaded and never appeared when you reopened a saved expense. This is fixed, and a failed upload is now reported instead of passing silently.
• Fixed the title staying from the previous receipt when you replaced the photo.
• The app claimed it had filled in the details even for an unreadable image. It now clearly says when a receipt could not be read.
• Fixed the invite link being added to the shared message twice.
• Fixed a connection issue that prevented group and expense details from syncing in real time.
```

### 1.1.0 (assumed: the version before 1.2.0; the note did not name it)

**EN**

```text
Features:
• Updated visual identity on login and registration screens with the new logo design.

Improvements:
• Performance improvements and code optimization for a smoother, faster app experience.

Bug Fixes:
• Fixed an issue where group details and expenses occasionally failed to synchronize in real-time.
```
