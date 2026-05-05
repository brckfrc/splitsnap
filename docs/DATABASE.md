# SplitSnap — Veritabanı ve Supabase backend

Bu dosya **PostgreSQL şeması**, **ER ilişkileri**, **Row Level Security (RLS)**, **Realtime**, **davet sistemi** ve ileride eklenecek **Storage / RPC** kararlarının tek kaynağıdır. Şema veya politika değişecekse önce burayı güncelleyin; uygulama kodu (`src/services/`, `src/types/`) bu dokümana göre hizalanır.

**İlgili:** [`src/types/index.ts`](../src/types/index.ts) · [`src/lib/supabase.ts`](../src/lib/supabase.ts) · [`docs/AGENTS.md`](./AGENTS.md)

---

## 1. İlkeler

| Konu | Karar |
|------|--------|
| Şema | `public` |
| Kimlik | `uuid`; kullanıcı kimliği `auth.users.id` ile aynı |
| Zaman | `timestamptz` (`created_at`, `joined_at`, `deleted_at`, …) |
| Sütun adları | SQL'de `snake_case`; uygulamada `camelCase` mapper (`src/services/` katmanında) |
| Backend | Özel sunucu yok; tüm erişim **Supabase istemcisi** + RLS |
| Para | **`numeric(12,2)`** — doğrudan TL değeri; eşit bölüşümde yuvarlama farkı son kişiye atanır |
| Para birimi | Her grubun kendi `currency` alanı; default `'TRY'` |
| Silme stratejisi | **Soft delete** — ilgili tablolarda `deleted_at timestamptz` nullable; uygulama `deleted_at IS NULL` filtreler, geçmiş veriler korunur |
| Realtime | `groups`, `group_members`, `expenses`, `expense_shares`, `settlements`, `friend_requests` — Supabase Realtime aboneliği ile canlı senkron; RLS politikaları Realtime erişimini de yönetir |
| Profil oluşturma | **DB trigger** (`on_auth_user_created`) `profiles` satırı oluşturur (`display_name` = `raw_user_meta_data->>'full_name'`); uygulama tarafı gerektiğinde upsert ile günceller |

### 1.1 Kesin ürün kararları (plan)

| # | Konu | Karar |
|---|------|--------|
| P1 | **Arkadaş ekleme** | İsim/e-posta ile serbest arama yok. Kullanıcının benzersiz **`user_invite_code`** değeri girilir; kod eşleşen profil varsa doğrudan **arkadaşlık isteği** (`friend_requests`) oluşturulur. Eşleşme yoksa uygulama *“böyle bir kullanıcı yok”* gösterir. Kod çözümleme / istek oluşturma **`SECURITY DEFINER` RPC** ile (ör. `lookup_user_by_friend_code`, `send_friend_request_by_code`) — tüm `profiles` satırlarını listeleyerek tarama yapılmaz. |
| P2 | **`profiles.email` senkronu** | Kayıtta trigger ile doldurulur; **Auth’ta e-posta değişince** `profiles.email` güncellenir — öncelik **uygulama tarafı:** oturum yenileme / `onAuthStateChange` / profil ekranında `auth.getUser()` sonrası `profiles` upsert. (Hosted Supabase’te `auth.users` üzerine özel trigger her projede mümkün olmayabilir; webhook yok, özel sunucu yok.) |
| P3 | **Grup davet kodu (v1)** | Yalnızca güncel `groups.invite_code`; yenilemede eski kod **anında geçersiz**. İleride ihtiyaç olursa şemaya `invite_code_previous` + `invite_code_grace_until` eklenerek esnek mod ayrı migration ile açılır (şu an şema ve RPC sade tutulur). |
| P4 | **Para birimi** | **Şimdilik:** grup başına tek para birimi (`groups.currency`). **Sonrası (öneri):** (a) harcama bazında `currency` + o anki kur anlık görüntüsü (`fx_rate_to_group_currency`); (b) grup “baz para birimi” + tüm tutarların buna çevrilmesi; (c) çoklu para birimli grupta özet ekranında sadece baz para gösterme. |
| P5 | **`left_at` üyeleri** | Ayrılmış üye **her yerde** görünür (üye listesi, harcama satırları, borç özeti); profiline **gidilebilir** (navigasyon). Liste/etiket UX: “Ayrıldı” vb. |
| P6 | **`activity_log`** | **Sayfalama** (cursor / `created_at` + `id`). **Arşiv:** `activity_log_archive` tablosu (aynı sütunlar); taşıma işi **Supabase’te `pg_cron` uzantısı** ile periyodik SQL (ör. her gece: `created_at < now() - interval '90 days'` satırları `INSERT … SELECT` + kaynak satırı `DELETE` veya tek transaction’da taşı). Uygulama veya manuel job’a bağlı kalmaz; `pg_cron` kapalı projelerde geçici olarak Dashboard SQL veya tek seferlik migration ile aynı mantık çalıştırılır. |
| P7 | **Borç kaynağı** | **Temiz model:** Ayrı ama birlikte — ayrıntı §5.9. |

---

## 2. ER diyagramı

`auth.users` Supabase tarafından yönetilir; uygulama doğrudan tabloya yazmaz.

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "id"
  PROFILES ||--o{ GROUPS : "owner_id"
  GROUPS ||--o{ GROUP_MEMBERS : "group_id"
  PROFILES ||--o{ GROUP_MEMBERS : "user_id"
  GROUPS ||--o{ EXPENSES : "group_id"
  EXPENSES ||--o{ EXPENSE_SHARES : "expense_id"
  PROFILES ||--o{ EXPENSES : "paid_by"
  PROFILES ||--o{ EXPENSE_SHARES : "user_id"
  GROUPS ||--o{ SETTLEMENTS : "group_id"
  PROFILES ||--o{ SETTLEMENTS : "from_user_id"
  PROFILES ||--o{ SETTLEMENTS : "to_user_id"
  GROUPS ||--o{ ACTIVITY_LOG : "group_id"
  PROFILES ||--o{ ACTIVITY_LOG : "actor_id"
  PROFILES ||--o{ FRIEND_REQUESTS : "from_user_id"
  PROFILES ||--o{ FRIEND_REQUESTS : "to_user_id"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }

  PROFILES {
    uuid id PK_FK
    text display_name
    text email
    text user_invite_code UK
    text avatar_url
    timestamptz created_at
    timestamptz updated_at
  }

  FRIEND_REQUESTS {
    uuid id PK
    uuid from_user_id FK
    uuid to_user_id FK
    text status
    timestamptz created_at
  }

  GROUPS {
    uuid id PK
    text name
    text description
    uuid owner_id FK
    text invite_code UK
    text currency
    timestamptz created_at
    timestamptz deleted_at
  }

  GROUP_MEMBERS {
    uuid group_id PK_FK
    uuid user_id PK_FK
    text role
    timestamptz joined_at
    timestamptz left_at
  }

  EXPENSES {
    uuid id PK
    uuid group_id FK
    text title
    text description
    numeric amount
    date expense_date
    uuid paid_by FK
    uuid created_by FK
    text split_type
    text receipt_storage_path
    jsonb ocr_suggestions
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  EXPENSE_SHARES {
    uuid expense_id PK_FK
    uuid user_id PK_FK
    numeric amount
  }

  SETTLEMENTS {
    uuid id PK
    uuid group_id FK
    uuid from_user_id FK
    uuid to_user_id FK
    numeric amount
    text note
    timestamptz created_at
    timestamptz deleted_at
  }

  ACTIVITY_LOG {
    uuid id PK
    uuid group_id FK
    uuid actor_id FK
    text action
    text entity_type
    uuid entity_id
    jsonb details
    timestamptz created_at
  }
```

**Durum:** `profiles` (+ `user_invite_code`), `friend_requests`, `groups`, `group_members` — **Hafta 3** hedefi. `expenses`, `expense_shares` — Hafta 4–6. `settlements` — Hafta 6. `activity_log` (+ `activity_log_archive`) — Hafta 3+ (şema erken, arşiv job’u ürün olgunlaşınca). Storage — Hafta 8+.

---

## 3. Tablolar (sütun detayı)

### 3.1 `public.profiles`

Kullanıcı profili; `auth.users` ile bire bir.

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, `references auth.users(id) on delete cascade` | |
| `display_name` | `text` | not null | Kayıt sırasında `raw_user_meta_data->>'full_name'` ile doldurulur (trigger). Kayıt formunda "Ad Soyad" zorunlu alan. |
| `email` | `text` | nullable | `auth.users.email` ile senkron; trigger veya upsert aracılığıyla. JOIN'siz profil sorguları için. UI'da gösterim şart değil, backend kolaylığı. |
| `user_invite_code` | `text` | not null, **unique** | Kullanıcı arkadaşlık kodu; `handle_new_user` veya `BEFORE INSERT` ile üretilir. **`groups.invite_code` ile çakışmaması** için ortak üretici fonksiyon her iki tabloda da benzersizlik kontrol eder (§6). |
| `avatar_url` | `text` | nullable | URL veya Storage yolu |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | nullable | `set_updated_at` trigger'ı ile otomatik |

### 3.2 `public.friend_requests`

Arkadaşlık isteği; arama yalnızca `user_invite_code` ile RPC üzerinden (P1).

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `from_user_id` | `uuid` | not null, FK → `profiles(id)` on delete cascade | İsteği gönderen |
| `to_user_id` | `uuid` | not null, FK → `profiles(id)` on delete cascade | Alıcı |
| `status` | `text` | not null, check in (`'pending'`, `'accepted'`, `'rejected'`) | |
| `created_at` | `timestamptz` | default `now()` | |

Kısıtlar: `from_user_id <> to_user_id`. Aynı çift için **en fazla bir `pending`** satır — `unique (from_user_id, to_user_id) where status = 'pending'` (kısmi unique indeks).

### 3.3 `public.groups`

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | not null | |
| `description` | `text` | nullable | |
| `owner_id` | `uuid` | not null, FK → `profiles(id)` | Grubun yöneticisi / oluşturanı |
| `invite_code` | `text` | unique, not null | 8 karakter; gruba özel; üretimde `profiles.user_invite_code` ile çakışma yok (§6). Yenilemede eski kod geçersiz (P3). |
| `currency` | `text` | not null, default `'TRY'` | ISO 4217; **grup başına tek para birimi** (P4). |
| `created_at` | `timestamptz` | default `now()` | |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

**Tetikleyiciler:**
- `BEFORE INSERT` — `invite_code` boşsa otomatik üret (`generate_invite_code()`).
- `AFTER INSERT` — `owner_id` için `group_members` satırı ekle (sahip otomatik üye, `role = 'admin'`).

### 3.4 `public.group_members`

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `group_id` | `uuid` | FK → `groups(id)` on delete cascade | |
| `user_id` | `uuid` | FK → `profiles(id)` on delete cascade | |
| `role` | `text` | not null, default `'member'`, check in (`'admin'`, `'member'`) | **Hafta 3:** alan oluşturulur; uygulama şimdilik sadece `groups.owner_id` ile yönetici belirler. İleride `role` tabanlı yetkilendirmeye geçilebilir. |
| `joined_at` | `timestamptz` | default `now()` | |
| `left_at` | `timestamptz` | nullable | `null` = aktif üye; dolu = gruptan ayrılmış. Satır **silinmez**; borç/harcama geçmişi korunur. |

Birincil anahtar: `(group_id, user_id)`.

**Ayrılma davranışı:** Kullanıcı kendini veya admin başkasını "ayrıldı" yapabilir (`left_at = now()`). Ayrılan üye:
- Grubun üye listesinde *ayrıldı* etiketiyle görünmeye devam eder.
- Açık borçları hâlâ hesaplanır ve gösterilir.
- Yeni harcama ekleyemez, oy kullanamaz, vb.
- Borç kapatıldıktan sonra da kayıt kalır (geçmiş bütünlüğü).
- Tekrar katılmak isterse `left_at = null` yapılır (re-join).

### 3.5 `public.expenses`

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `group_id` | `uuid` | not null, FK → `groups(id)` | |
| `title` | `text` | not null | |
| `description` | `text` | nullable | |
| `amount` | `numeric(12,2)` | not null, check `> 0` | TL cinsinden |
| `expense_date` | `date` | not null | Uygulama `Expense.date` |
| `paid_by` | `uuid` | not null, FK → `profiles(id)` | Ödemeyi yapan kişi |
| `created_by` | `uuid` | not null, FK → `profiles(id)` | Harcamayı sisteme giren kişi (farklı olabilir) |
| `split_type` | `text` | not null, check in (`'equal'`, `'manual'`) | |
| `icon` | `text` | nullable | Kategori emojisi (örn: 🍔, 🚕) |
| `receipt_storage_path` | `text` | nullable | Storage bucket yolu (Hafta 8+) |
| `ocr_suggestions` | `jsonb` | nullable | `{ "merchant_name": "...", "date": "...", "total": 0 }` |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | nullable | `set_updated_at` trigger |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

### 3.6 `public.expense_shares`

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `expense_id` | `uuid` | FK → `expenses(id)` on delete cascade | |
| `user_id` | `uuid` | FK → `profiles(id)` | |
| `amount` | `numeric(12,2)` | not null | Kişiye düşen tutar |

Birincil anahtar: `(expense_id, user_id)`.

### 3.7 `public.settlements`

Borç ödemeleri / kapatma kayıtları.

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `group_id` | `uuid` | not null, FK → `groups(id)` | |
| `from_user_id` | `uuid` | not null, FK → `profiles(id)` | Ödemeyi yapan (borçlu) |
| `to_user_id` | `uuid` | not null, FK → `profiles(id)` | Ödemeyi alan (alacaklı) |
| `amount` | `numeric(12,2)` | not null, check `> 0` | |
| `note` | `text` | nullable | Opsiyonel açıklama |
| `created_at` | `timestamptz` | default `now()` | |
| `deleted_at` | `timestamptz` | nullable | Soft delete (yanlış giriş düzeltme) |

### 3.8 `public.activity_log`

Grup bazlı değişiklik geçmişi. UI'da kullanıcı dostu bir "etkinlik akışı" olarak gösterilebilir.

| Sütun | Tip | Kısıtlama | Not |
|-------|-----|-----------|-----|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `group_id` | `uuid` | not null, FK → `groups(id)` | |
| `actor_id` | `uuid` | not null, FK → `profiles(id)` | İşlemi yapan kullanıcı |
| `action` | `text` | not null | Eylem kodu (aşağıya bkz.) |
| `entity_type` | `text` | nullable | `'expense'`, `'settlement'`, `'member'`, `'group'` |
| `entity_id` | `uuid` | nullable | İlgili kaydın `id`'si |
| `details` | `jsonb` | nullable | Ek bağlam: eski/yeni değerler, açıklama, vb. |
| `created_at` | `timestamptz` | default `now()` | |

**Eylem kodları (başlangıç seti):**

| `action` | Açıklama |
|----------|----------|
| `expense.created` | Harcama eklendi |
| `expense.updated` | Harcama düzenlendi (details: değişen alanlar) |
| `expense.deleted` | Harcama silindi (soft) |
| `settlement.created` | Ödeme kaydedildi |
| `settlement.deleted` | Ödeme geri alındı |
| `member.joined` | Üye gruba katıldı |
| `member.left` | Üye gruptan ayrıldı |
| `member.removed` | Üye admin tarafından çıkarıldı |
| `group.updated` | Grup bilgileri güncellendi |
| `group.deleted` | Grup silindi (soft) |

**Oluşturma stratejisi:** Uygulama tarafı (`src/services/`) ilgili işlemi yaparken aynı anda `activity_log` satırı ekler. Alternatif: DB trigger'ları ile otomatik log — daha güvenli ama `details` alanını doldurmak zorlaşır. **Önerilen:** uygulama tarafı; kritik işlemler için trigger ile yedek log düşünülebilir.

**UI notu:** Grup detay ekranında "Etkinlik" sekmesi veya bölümü — tarihsel akış, kullanıcı dostu stil. Roadmap'te resmi madde değil ama Ekstra olarak eklenebilir.

**Ölçek (P6):** İstemci liste çağrıları `limit` + `cursor` (`created_at`, `id`); büyük gruplarda arşiv tablosuna taşınan kayıtlar ayrı ekranda veya “daha eski” ile yüklenir.

### 3.9 `public.activity_log_archive`

`activity_log` ile aynı sütun yapısı; `pg_cron` job’u (P6) eski satırları buraya taşır. RLS: yalnızca `is_group_participant` ile okuma (canlı tablo ile aynı mantık) veya servis rolü ile taşıma.

---

## 4. İndeksler

> **Not:** PostgreSQL, `PRIMARY KEY` ve `UNIQUE` kısıtlamaları için otomatik indeks oluşturur. Aşağıdaki liste sadece **ek** indeksleri kapsar. `groups.invite_code` ve `profiles.user_invite_code` unique olduğundan ayrı btree gerekmez.

| Tablo | İndeks | Tip | Amaç |
|-------|--------|-----|------|
| `friend_requests` | `(to_user_id)` where `status = 'pending'` | partial | Gelen istekler gelen kutusu |
| `friend_requests` | `(from_user_id)` | btree | Giden istekler |
| `group_members` | `(user_id)` where `left_at is null` | partial | Kullanıcının aktif gruplarını listeleme |
| `group_members` | `(group_id)` | btree | Grup üyelerini çekme (aktif + ayrılanlar dahil) |
| `expenses` | `(group_id)` where `deleted_at is null` | partial | Aktif harcamaları listeleme |
| `expense_shares` | `(user_id)` | btree | Kullanıcı bazlı borç/alacak sorguları |
| `settlements` | `(group_id)` where `deleted_at is null` | partial | Grup ödemelerini listeleme |
| `activity_log` | `(group_id, created_at desc)` | btree | Etkinlik akışı (son olaylar önce) |
| `activity_log` | `(entity_type, entity_id)` | btree | Belirli bir kaydın geçmişini çekme |

`activity_log_archive` için aynı `(group_id, created_at desc)` indeksi önerilir. Taşıma: **§1.1 P6** (`pg_cron`).

---

## 5. RLS — genel strateji

- RLS **her tabloda açık**; `anon` role'üne politika yazılmaz (yalnızca `authenticated`).
- Varsayılan: **satır yok**; yalnızca açıkça yazılan politikalar erişim verir.
- `auth.uid()` = oturum açmış kullanıcının `uuid`'si (`auth.users.id`).
- Soft delete: RLS politikaları `deleted_at IS NULL` koşulunu **içermez** — filtreleme uygulama katmanında yapılır. Böylece admin veya etkinlik akışı silinmiş kayıtlara da erişebilir.

**Ortak yardımcı:** Aşağıdaki alt sorgular birçok politikada tekrarlanır; okunurluk için SQL fonksiyon olarak tanımlanabilir:

```sql
-- Aktif üye (yeni harcama, davet yönetimi, log yazma vb.)
create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

-- Gruba hiç girmiş (ayrılmış dahil) — grup / harcama / settlement / geçmiş okuma (P5)
create or replace function public.is_group_participant(_group_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id
      and user_id = auth.uid()
  );
$$;
```

### 5.1 `profiles`

| İşlem | Politika |
|-------|---------|
| **SELECT** | Kendi satırı: `id = auth.uid()`. **Diğer profiller:** yalnızca (a) `group_members` üzerinden **ortak grup** (herhangi bir `left_at` — katılımcı), veya (b) `friend_requests` ile **pending veya accepted** ilişki (gönderen veya alıcı olarak). Böylece isim/e-posta ile tüm kullanıcı taranamaz; arkadaş kodu akışı RPC ile kalır (P1). |
| **INSERT** | `id = auth.uid()` |
| **UPDATE** | `id = auth.uid()` |
| **DELETE** | Yok — profil silinmez (`auth.users` cascade ile yönetilir) |

### 5.2 `friend_requests`

| İşlem | Politika |
|-------|---------|
| **SELECT** | `from_user_id = auth.uid()` veya `to_user_id = auth.uid()` |
| **INSERT** | İstemci doğrudan `INSERT` **yapmaz**; yalnızca `send_friend_request_by_code` **`SECURITY DEFINER` RPC** satır ekler (kod doğrulama, kendine istek engeli, mükerrer `pending` kontrolü). |
| **UPDATE** | `to_user_id = auth.uid()` ve yalnızca `status` (`pending` → `accepted` / `rejected`) |
| **DELETE** | İsteğe bağlı: gönderen `pending` iptali |

### 5.3 `groups`

| İşlem | Politika |
|-------|---------|
| **SELECT** | `owner_id = auth.uid() OR is_group_participant(id)` — grup sahibi her zaman görebilir; diğer üyeler `is_group_participant` ile (aktif ve ayrılmış, P5). PostgreSQL 17'de `INSERT … RETURNING` sırasında SELECT politikası da değerlendirildiğinden, AFTER trigger henüz `group_members`'a satır eklemeden önce owner kontrolü gereklidir. |
| **INSERT** | `owner_id = auth.uid()` |
| **UPDATE** | `owner_id = auth.uid()` |
| **DELETE** | Kullanılmaz — soft delete; `UPDATE` ile `deleted_at` set edilir, `owner_id = auth.uid()` |

Eşdeğer SELECT ifadesi:

```sql
owner_id = (select auth.uid()) OR public.is_group_participant(groups.id)
```

### 5.4 `group_members`

| İşlem | Politika |
|-------|---------|
| **SELECT** | `is_group_participant(group_id)` — SECURITY DEFINER fonksiyon üzerinden (self-referencing subquery yerine; doğrudan kendi tablosunu sorgulayan politika PostgreSQL'de sonsuz döngüye neden olur) |
| **INSERT** | `join_group_by_invite()` RPC fonksiyonu üzerinden (§5.6'ya bkz.); doğrudan insert politikası: yalnızca trigger (owner ekleme) |
| **UPDATE** | `left_at` set etme: `user_id = auth.uid()` (kendi ayrılması) veya grup `owner_id = auth.uid()` (admin çıkarma). `role` güncellemesi: yalnızca `owner_id`. |
| **DELETE** | Kullanılmaz — `left_at` ile soft ayrılma |

### 5.5 `expenses` / `expense_shares`

| Tablo | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `expenses` | `is_group_participant(group_id)` | Yalnızca **aktif** üye: `is_group_member(group_id)` + `created_by = auth.uid()` (veya politika genişletmesi) | Aktif üye veya grup `owner_id` | Soft delete: `UPDATE` ile `deleted_at`, aynı yetki |
| `expense_shares` | İlgili `expense` görünürse (`is_group_participant`) | Harcama oluşturma/güncelleme akışında birlikte | Aynı | Cascade (expense silinirse) |

### 5.6 Katılma: `join_group_by_invite(code text)` RPC

Davet koduyla gruba katılma **`SECURITY DEFINER`** fonksiyonu:

```sql
create or replace function public.join_group_by_invite(code text)
returns uuid  -- group_id döner
language plpgsql security definer
as $$
declare
  _group_id uuid;
begin
  select id into _group_id
  from public.groups
  where invite_code = code
    and deleted_at is null;

  if _group_id is null then
    raise exception 'Geçersiz davet kodu';
  end if;

  -- Zaten üye mi (ayrılmış dahil)?
  if exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = auth.uid()
  ) then
    -- Daha önce ayrılmışsa tekrar aktif et
    update public.group_members
    set left_at = null, joined_at = now()
    where group_id = _group_id
      and user_id = auth.uid()
      and left_at is not null;

    return _group_id;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (_group_id, auth.uid(), 'member');

  return _group_id;
end;
$$;
```

Bu sayede `group_members` tablosuna doğrudan INSERT politikası gerekmez (trigger hariç); katılma yalnızca bu RPC ile olur.

### 5.7 `settlements`

| İşlem | Politika |
|-------|---------|
| **SELECT** | `is_group_participant(group_id)` |
| **INSERT** | Aktif üye + (`from_user_id = auth.uid()` veya `to_user_id = auth.uid()`) — ödemeyi yapan veya alan kaydeder |
| **UPDATE** | Yok — kayıt değiştirilemez, yanlışsa soft delete + yeni kayıt |
| **DELETE** | Soft delete: `from_user_id = auth.uid()` veya `to_user_id = auth.uid()` veya admin |

### 5.8 `activity_log`

| İşlem | Politika |
|-------|---------|
| **SELECT** | Grup üyesi (aktif **veya** `left_at` dolu — geçmişi görebilme; P5 ile uyumlu): `exists (select 1 from group_members m where m.group_id = activity_log.group_id and m.user_id = auth.uid())` |
| **INSERT** | `actor_id = auth.uid()` + ilgili grupta aktif üyelik (`left_at is null`) |
| **UPDATE** | Yok — log değişmez |
| **DELETE** | Yok — log silinmez; arşive taşıma servis rolü veya yönetici işlemi (ayrı tasarlanır) |

### 5.9 Borç hesabı: `expense_shares` ve `settlements` birlikte (P7)

İkisi **birbirinin yerine geçmez**; temiz çözüm ikisini birlikte kullanmak:

| Kayıt | Rol |
|-------|-----|
| **`expenses` + `expense_shares`** | Harcama gerçeği: kim ödedi (`paid_by`), tutar ne, paylar kime ne kadar düştü. Silinmedikçe geçmiş korunur. |
| **`settlements`** | Nakit/transfer kaydı: “A, B’ye X TL ödedi”. Harcamayı silmeden **net borcu** düşürür. |

**Net bakiye (soyut):** Önce harcamalardan kişi bazlı net pozisyon üretilir (ödediği − payına düşenler toplamı), sonra her `settlement` için `from_user` borcu azalır / `to_user` alacağı azalır (işaret kuralları uygulama veya tek bir “balance” view fonksiyonunda tutarlı tanımlanır). Özet ekranı ve “kim kime ne borçlu” listesi **bu birleşik modelden** türetilir; veriyi tek tabloda birleştirmeye gerek yok.

**Yanlış olanı:** Sadece `settlements` ile harcama paylarını temsil etmek (fiş geçmişi bozulur) veya ödeme kaydı olmadan payları silmek.

---

## 6. Tetikleyiciler ve fonksiyonlar

| Ad | Tablo / Olay | Amaç |
|----|-------------|------|
| `handle_new_user()` | `AFTER INSERT ON auth.users` | `profiles`: `id`, `display_name`, `email` (yukarıdaki gibi) + **`user_invite_code`** = `generate_global_unique_code()` (`groups.invite_code` ile çakışmaz) |
| *(uygulama)* | Oturum / kullanıcı güncellemesi | E-posta değişince `profiles.email` upsert (P2); `auth.getUser()` veya `onAuthStateChange` sonrası servis çağrısı |
| `generate_global_unique_code()` | SQL fonksiyon | 8 karakter üretir; **`groups` ve `profiles`** üzerinde benzersiz olana kadar döngü |
| `generate_invite_code()` | `BEFORE INSERT ON groups` | `invite_code` null ise `generate_global_unique_code()` ile doldurur |
| `lookup_user_by_friend_code(code text)` | RPC | `SECURITY DEFINER`; eşleşen profil için `id`, `display_name`, `avatar_url` döner — yoksa boş; istemci *“böyle bir kullanıcı yok”* der (P1) |
| `send_friend_request_by_code(code text)` | RPC | `SECURITY DEFINER`; kod → `to_user_id`, `from_user_id = auth.uid()`, `pending` satırı; kendine / mükerrer pending engeli |
| `add_owner_as_member()` | `AFTER INSERT ON groups` | `group_members` satırı: `user_id = new.owner_id`, `role = 'admin'` |
| `set_updated_at()` | `BEFORE UPDATE ON profiles, expenses` | `updated_at = now()` |

### Kod üretimi (grup + kullanıcı)

`generate_invite_code()` trigger içinde hem `public.groups` hem `public.profiles` tablolarında `invite_code` / `user_invite_code` sütunlarında **aynı değer yok mu** diye kontrol edilir; tek fonksiyon (`generate_global_unique_code`) iki tabloyu birlikte tarar.

```sql
create or replace function public.generate_invite_code()
returns trigger
language plpgsql
as $$
declare
  _code text;
  _exists boolean;
begin
  if new.invite_code is not null then
    return new;
  end if;

  loop
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(
      select 1 from public.groups where invite_code = _code
      union all
      select 1 from public.profiles where user_invite_code = _code
    ) into _exists;
    exit when not _exists;
  end loop;

  new.invite_code := _code;
  return new;
end;
$$;

create trigger trg_generate_invite_code
  before insert on public.groups
  for each row execute function public.generate_invite_code();
```

`profiles.user_invite_code` için `BEFORE INSERT ON profiles` veya `handle_new_user` içinde aynı döngü mantığı kullanılır.

---

## 7. Davet sistemi ve deep link

### Kısa davet kodu

Her grup oluşturulduğunda `invite_code` (8 karakter, ör. `A3K9M2X7`) otomatik üretilir. Kullanıcı bu kodu paylaşır; alan kişi uygulama içinde "Katıl" ekranında kodu girer → `join_group_by_invite(code)` RPC çağrılır.

### Davet linki (gelecek)

Derin bağlantı formatı:

| Ortam | URL |
|-------|-----|
| Universal Link (iOS) | `https://splitsnap.app/invite/{invite_code}` |
| Custom scheme (geliştirme) | `splitsnap://invite/{invite_code}` |

Uygulama açılırken veya zaten açıkken bu URL yakalanır (Expo Router deep link veya `expo-linking`); `invite_code` parse edilip `join_group_by_invite()` çağrılır.

**Gereksinimler (ileride):**
- `app.json` → `scheme: "splitsnap"` (custom scheme)
- iOS Associated Domains → `apple-app-site-association` dosyası (universal link)
- `src/app/invite/[code].tsx` — deep link'i karşılayan ekran (onay + katılma)

Şimdilik sadece **kod ile katılma** (UI text input) implement edilir; link paylaşımı backlog'da.

### Grup davet kodu yenileme (P3)

Yönetici yeni kod üretir (`UPDATE` ile `invite_code` sıfırlanıp trigger veya uygulama yeni değer yazar); **eski kod anında geçersiz**. İleride “grace” istenirse ayrı migration ile ek sütunlar ve RPC güncellemesi yapılır.

### Kullanıcı arkadaş kodu (P1)

- Her profilde `user_invite_code` paylaşılabilir (profil ekranı, “kodu kopyala”).
- Arkadaş ekleme: `lookup_user_by_friend_code` → bulunduysa UI onay → `send_friend_request_by_code` veya iki adımlı tek RPC tasarımı.
- Grup katılma ile **aynı metin kutusu** farklı endpoint’lere gidebilir: önce `profiles`’ta kod ara, yoksa `groups.invite_code` ile `join_group_by_invite` (sıra ürün kararı; çakışma üretimde engellendiği için aynı kod iki yerde olamaz).

---

## 8. Realtime

Supabase Realtime, RLS politikalarını kullandığı için ayrı yetkilendirme gerekmez. İstemci şu tabloları dinler:

| Tablo | Kanal | Kullanım |
|-------|-------|----------|
| `groups` | `groups:id=eq.{groupId}` | Grup bilgisi güncellemesi, silinme |
| `group_members` | `group_members:group_id=eq.{groupId}` | Üye katılma/ayrılma |
| `expenses` | `expenses:group_id=eq.{groupId}` | Harcama CRUD — çakışma önleme |
| `expense_shares` | `expense_shares:expense_id=in.(...)` | Pay güncelleme |
| `settlements` | `settlements:group_id=eq.{groupId}` | Ödeme kaydı |
| `friend_requests` | `friend_requests:from_user_id=eq.{uid}` veya `to_user_id=eq.{uid}` | Gelen/giden istekler |

**İstemci tarafı:** `src/services/` veya `src/hooks/` altında Realtime abonelik yardımcıları; Zustand store'u veya React state'i canlı günceller. Detay uygulama aşamasında bu dosyaya eklenir.

---

## 9. Storage (Hafta 8+ — plan)

| Bucket | İçerik | RLS |
|--------|--------|-----|
| `receipts` | Fiş görselleri | Yükleme: aktif üye + harcama sahibi; okuma: grup üyesi |

Obje yolu önerisi: `receipts/{group_id}/{expense_id}/{filename}`.

Detaylar fiş özelliği işlenirken bu dosyaya eklenir.

---

## 10. Uygulama eşlemesi (`src/types`)

| Uygulama tipi | DB kaynağı | Not |
|---------------|------------|-----|
| `User.id` | `profiles.id` (= `auth.uid()`) | |
| `User.name` | `profiles.display_name` | |
| `User.email` | `profiles.email` veya `auth.user.email` | |
| `User.avatar` | `profiles.avatar_url` | |
| `User.userInviteCode` (veya mevcut isimlendirme) | `profiles.user_invite_code` | Paylaşım; UI’da zorunlu değil |
| `Group` | `groups` | `+ currency`, `invite_code`, `deleted_at` eklenecek |
| `Group.ownerId` | `groups.owner_id` | Grup yöneticisi; UI'da "Yönetici" olarak gösterilebilir |
| `GroupMember` | `group_members` + join `profiles` | `+ role`, `left_at` eklenecek; `left_at` dolu üyeler listede ve profil ekranında (P5) |
| `Expense` | `expenses` | `+ created_by`, `updated_at`, `deleted_at` eklenecek |
| `ExpenseShare` | `expense_shares` | |
| `Settlement` | `settlements` — yeni tip | `from`, `to` (User), `amount`, `note` |
| `ActivityLogEntry` | `activity_log` — yeni tip | UI'da etkinlik akışı |
| `FriendRequest` | `friend_requests` + join `profiles` | Gelen/giden istek listesi |

---

## 11. Uygulama kontrol listesi (şemaya göre iş sırası)

Şema bu dokümanda onaylandıktan sonra tipik sıra:

### Hafta 3

1. **SQL:** `profiles` (+ `user_invite_code`), `friend_requests`, `groups`, `group_members`, `activity_log`, `activity_log_archive` + FK + indeks
2. **RLS:** `profiles` → `friend_requests` → `groups` → `group_members` → `activity_log` politikaları
3. **Fonksiyonlar:** `handle_new_user`, `generate_global_unique_code` / `generate_invite_code`, `add_owner_as_member`, `set_updated_at`, `is_group_member`, `is_group_participant`, `join_group_by_invite`, `lookup_user_by_friend_code`, `send_friend_request_by_code`
4. **Supabase:** `pg_cron` etkinse arşiv job SQL’i (P6); değilse Dashboard’dan periyodik çalıştırma
5. **İstemci:** `src/services/profiles.ts`, `src/services/groups.ts`, arkadaşlık servisi; mock’tan Supabase’e geçiş
6. **Test:** İki hesap — grup davet kodu + kullanıcı arkadaş kodu + istek + RLS reddi

### Hafta 4–6

7. **SQL:** `expenses`, `expense_shares`, `settlements` tabloları
8. **RLS:** Harcama ve ödeme politikaları
9. **İstemci:** Harcama servisleri + **birleşik bakiye** (§5.9) + settlement akışı
10. **Realtime:** Grup ekranlarında canlı abonelik
11. **Profil:** Auth e-posta değişiminde `profiles.email` upsert (P2)
12. **Etkinlik:** `activity_log` sayfalama + arşiv job (P6)

### Hafta 8+

13. **Storage:** `receipts` bucket + RLS
14. **OCR:** Harcama oluşturma akışına bağlama

---

## 12. Değişiklik günlüğü

| Tarih | Özet |
|-------|------|
| 2026-04-05 | İlk sürüm: ER, tablo özetleri, RLS stratejisi, katılma modelleri, planlanan expense tabloları |
| 2026-04-05 | v2: Tüm kararlar kesinleştirildi — `numeric(12,2)`, `currency`, soft delete, `role`, `left_at`, `settlements`, `activity_log`, davet kodu (`nanoid`-tarzı), deep link planı, Realtime, `profiles.email`, `expenses.created_by`/`updated_at`, indeks açıklamaları |
| 2026-04-05 | v3: §1.1 ürün kararları (P1–P7); profil SELECT / alternatif model notu; e-posta senkronu (uygulama upsert); davet esnek mod + opsiyonel `invite_code_previous` / `grace_until`; grup para birimi + gelecek seçenekleri; `left_at` UX; `activity_log` sayfalama + arşiv; §5.8 borç modeli; `activity_log` RLS ayrılmış üye okuması; ER/checklist güncellemeleri |
| 2026-04-05 | v4: P1 arkadaş = `user_invite_code` + `friend_requests` + RPC; profil RLS daraltıldı; P3 v1 tek grup kodu; P6 arşiv = `pg_cron` + `activity_log_archive`; global benzersiz kod; Realtime `friend_requests`; §5 yeniden numaralandı (borç §5.9); §13 kaldırıldı |
| 2026-04-05 | Hafta 3 migration uygulandı: [`supabase/migrations/20260405140000_week3_core.sql`](../supabase/migrations/20260405140000_week3_core.sql) — tablolar, RLS, RPC, `auth.users` → `profiles`, Realtime; arşiv cron: [`supabase/README.md`](../supabase/README.md) |

| 2026-04-12 | Hafta 4 migration uygulandı: [`supabase/migrations/20260412140000_week4_expenses.sql`](../supabase/migrations/20260412140000_week4_expenses.sql) — `expenses`, `expense_shares`, `settlements` tabloları, indeksler, RLS politikaları, `set_updated_at` trigger, Realtime |
| 2026-04-26 | Hafta 5 ekstra özellikleri: [`supabase/migrations/20260426233000_expense_icon.sql`](../supabase/migrations/20260426233000_expense_icon.sql) — `expenses` tablosuna `icon` sütunu eklendi |

Yeni migration veya politika eklendiğinde bu tabloya bir satır ekleyin.

| 2026-05-05 | Hafta 7 migration: [`supabase/migrations/20260505000000_emoji_usage_stats.sql`](../supabase/migrations/20260505000000_emoji_usage_stats.sql) — `get_emoji_usage_stats()` RPC fonksiyonu; platform genelinde harcama `title` → `icon` eşleşme istatistiklerini döndürür (dinamik emoji haritası). |
