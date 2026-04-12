# Hafta 4 — Grup Detay ve Harcama Temeli (İş Sırası)

> Geçici dosya — hafta sonunda silinecek.
> Şema kaynağı: [`docs/DATABASE.md`](./DATABASE.md) · Desen: [`supabase/migrations/20260405140000_week3_core.sql`](../supabase/migrations/20260405140000_week3_core.sql)

## Özet

| Sıra | Görev | Tahmini Süre | Bağımlılık |
|------|-------|--------------|------------|
| 1 | `expenses` + `expense_shares` + `settlements` SQL migration yazımı | 0.5 gün | — |
| 2 | Migration'ı Supabase'e uygulama + RLS test (iki hesapla) | 0.25 gün | 1 |
| 3 | `src/types/index.ts` güncellemesi | 0.25 gün | 1 |
| 4 | `src/services/expenses-supabase.ts` — CRUD servisleri | 1 gün | 2, 3 |
| 5 | `src/services/expenses-sync.ts` — Realtime + ilk yükleme | 0.5 gün | 4 |
| 6 | Store + facade güncelleme (Zustand mock → Supabase) | 0.5 gün | 4, 5 |
| 7 | `add-expense.tsx` → Supabase bağlantısı | 0.5 gün | 6 |
| 8 | Grup detay ekranı iyileştirmeleri (üye rozeti, davet kodu, left_at) | 0.5 gün | 6 |
| 9 | Uçtan uca test (iki kullanıcı, harcama ekle/listele/detay) | 0.5 gün | 7, 8 |

---

## 1. SQL Migration

**Dosya:** `supabase/migrations/20260412140000_week4_expenses.sql`

- `expenses` tablosu (DATABASE.md §3.5)
- `expense_shares` tablosu (DATABASE.md §3.6)
- `settlements` tablosu (DATABASE.md §3.7 — tablo oluşturulur, işlevsellik Hafta 6)
- İndeksler (DATABASE.md §4): `idx_expenses_group_active`, `idx_expense_shares_user`, `idx_settlements_group_active`
- `set_updated_at` trigger → `expenses` (fonksiyon Hafta 3'te mevcut)
- RLS politikaları (DATABASE.md §5.5, §5.7)
- Realtime: `expenses`, `expense_shares`, `settlements`

## 2. Migration Uygulama + RLS Test

```bash
supabase db push
```

- Dashboard'tan tabloların oluştuğunu doğrula
- İki hesapla RLS senaryoları: üye olan/olmayan harcama okuma/yazma

## 3. TypeScript Tip Güncellemeleri

**Dosya:** `src/types/index.ts`

- `Expense` → `createdBy`, `updatedAt`, `deletedAt` ekle
- `Settlement` → DB modeline uygun yeniden yaz (`id`, `groupId`, `fromUserId`, `toUserId`, `amount`, `note`, `createdAt`, `deletedAt`)
- `Group` → `inviteCode`, `currency`, `deletedAt` ekle
- `npm run typecheck` ile kırılan yerleri düzelt

## 4. Harcama Supabase Servisi

**Dosya:** `src/services/expenses-supabase.ts`

- `fetchExpensesForGroup(groupId)` → expenses + expense_shares
- `createExpenseRemote(input)` → expense + shares insert
- `updateExpenseRemote(input)` → expense güncelleme
- `deleteExpenseRemote(expenseId)` → soft delete (`deleted_at = now()`)
- `numeric(12,2)` → `parseFloat()` dönüşümü servis katmanında

## 5. Harcama Senkron Servisi

**Dosya:** `src/services/expenses-sync.ts`

- `groups-sync.ts` deseni: ilk yükleme + Realtime (`expenses`, `expense_shares`)
- AppState refetch sigortası
- Grup detay ekranına girişte başlat, çıkışta durdur

## 6. Store + Facade Güncelleme

**Dosyalar:** `src/stores/split-data-store.ts`, `src/services/split-data.ts`

- `replaceExpensesAndShares(expenses, shares)` — Supabase verisi → store
- `addExpense` / `updateExpense` / `deleteExpense` → Supabase servisi çağır
- Zustand mock veri üretimini harcama tarafından kaldır

## 7. Harcama Ekleme Ekranı → Supabase

**Dosya:** `src/app/(app)/groups/[groupId]/add-expense.tsx`

- `submit()` → `createExpenseRemote(...)` çağrısı
- `created_by` = auth user id
- Loading state + hata yönetimi
- Başarı sonrası geri dönüş (Realtime ile otomatik güncelleme)

## 8. Grup Detay İyileştirmeleri

**Dosya:** `src/app/(app)/groups/[groupId]/index.tsx`

- Üye listesinde admin/sahip rozeti (`group.ownerId` veya `role`)
- `left_at` dolu üyelere "Ayrıldı" etiketi (P5)
- Grup davet kodu gösterimi + kopyalama (sahip için)
- Harcama listesi ve bakiye hesabı DB verisiyle

## 9. Uçtan Uca Test

- İki kullanıcıyla simülatörde test
- Harcama ekle → listede görünsün
- Eşit / manuel bölüşüm doğrulaması
- Realtime: diğer kullanıcının eklediği harcama anında yansısın
- Bakiye hesabı doğru çalışsın

---

## Dikkat Noktaları

- `DATABASE.md`'yi migration'dan önce güncelle (AGENTS.md kuralı)
- RLS test: her tablo değişikliğinde iki farklı kullanıcıyla dene
- Zustand + React 19: `useGroupAggregates` / `useExpenseShares` hook desenini koru
- `numeric(12,2)` → JS `number`: Supabase'den dönen değer string olabilir
- Soft delete: `deleteExpenseRemote` → `UPDATE deleted_at`, fiziksel silme yok
- `npm run check` her adımdan sonra çalıştır
