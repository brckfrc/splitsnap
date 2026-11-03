# Supabase (SplitSnap)

Şema tek kaynak: [`docs/DATABASE.md`](../docs/DATABASE.md).

> **Ortam:** Geliştirme **yerelde** yapılıyor. Simülatör `.env.development.local` üzerinden bu yerel yığına bağlanıyor, production build ise EAS ortam değişkenleriyle canlıya. `supabase db reset` migration'ları ve [`seed.sql`](seed.sql)'i uygular. Seed, yerel test hesaplarını (`deniz@` / `mert@` / `sude@borak.dev`, şifre `localdev123`, sadece yerelde geçerli) ve Test grubu'nu kurar. Kurulum: [`docs/DEVELOPMENT_WORKFLOW.md`](../docs/DEVELOPMENT_WORKFLOW.md) §1.

## Migrations

- Hafta 3 çekirdek şema: [`migrations/20260405140000_week3_core.sql`](migrations/20260405140000_week3_core.sql) (`profiles`, `friend_requests`, `groups`, `group_members`, `activity_log`, `activity_log_archive`, RLS, RPC'ler, Realtime).
- Hafta 4 harcama / settlement şeması: [`migrations/20260412140000_week4_expenses.sql`](migrations/20260412140000_week4_expenses.sql) (`expenses`, `expense_shares`, `settlements`, RLS, Realtime).

Bağlı projeye uygulamak:

```bash
supabase db push
```

Yerel Docker ile test:

```bash
supabase start
supabase db reset
```

## Testler

`tests/` altındaki SQL dosyaları elle çalıştırılır; henüz bir test koşucusu yok. Her kontrol `PASS` / `FAIL` basar ve dosya sonunda `rollback` ile hiçbir iz bırakmaz.

> **Dikkat:** sonuçlar `NOTICE` olarak basılır ve **çıkış kodu her durumda 0'dır**. Yani testin geçip geçmediğini çıkış kodundan anlayamazsın, çıktıda `FAIL` aramalısın. Bunu düzeltmek ROADMAP Sprint #13'ün ilk maddesi.

```bash
supabase start            # Docker açık olmalı
supabase db reset         # YALNIZCA yerel; tüm migration zincirini sıfırdan uygular. Asla --linked ile değil.
for f in supabase/tests/*.sql; do
  echo "== $f"
  docker exec -i supabase_db_splitsnap psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "$f" 2>&1 \
    | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  //'
done
supabase stop             # bitince
```

| Dosya | Kapsam |
|-------|--------|
| [`tests/expense_write_integrity_test.sql`](tests/expense_write_integrity_test.sql) | 19 vaka: `expense_payers` RLS'i, harcama RPC'lerinin pay/ödeyen doğrulaması, gruplar arası harcama ele geçirme senaryosu |
| [`tests/expense_payer_preservation_test.sql`](tests/expense_payer_preservation_test.sql) | 8 vaka: `p_payers` gönderilmeyen düzenlemede ödeyenin korunması (korunur, tutar değiştiyse oranlanır, hiç yoksa `paid_by`'a düşer; açık `p_payers` hâlâ kazanır) |

## Canlıya migration push (kontrollü)

Tek hosted proje var: canlı. Geliştirme yerelde yapılıyor, hosted dev projesi yok ve `db push` **bekleyen tüm** migration'ları uygular. Bu yüzden sıra şu:

```bash
supabase migration list --linked     # yalnızca beklediğini bildiğin dosya(lar) remote="" görünmeli
supabase db push --dry-run           # neyin uygulanacağını basar, hiçbir şey yazmaz
supabase db push --linked            # --linked'i açıkça ver; CLI varsayılan hedefi değiştirecek
supabase migration list --linked     # bekleyen kalmamalı
supabase db dump --linked -f /tmp/prod-schema.sql   # fonksiyon gövdesini oku ve doğrula; asla "-f -"
```

Önce migration yerelde `db reset` ile uygulanmalı ve `tests/` temiz geçmeli. Geri dönüş yolu bir sonraki migration'dır: önceki fonksiyon gövdesi git'teki eski migration dosyasında durur. Canlıya push bir dış eylemdir, geliştiricinin açık onayı olmadan yapılmaz.

Bu dosya aynı zamanda "migration'lar tek başına çalışan bir veritabanı üretiyor mu?" sorusunun da cevabı: `authenticated` rolünün izinleri artık [`migrations/20260727223000_codify_role_grants.sql`](migrations/20260727223000_codify_role_grants.sql) içinde tanımlı, test fixture'ı hiçbir ek `GRANT` vermiyor. İzinler yanlışsa RLS kontrolleri "yanlış nedenle geçmek" yerine `permission denied` ile düşer.

## Denetim (prod, salt okunur)

[`audit/expense_integrity_audit.sql`](audit/expense_integrity_audit.sql) — Supabase SQL editor'a olduğu gibi yapıştırılabilir; yalnızca okur. Dört sorgu:

1. Payları veya ödeyenleri toplamı tutmayan harcamalar
2. Grup başına üye net bakiyeleri — `net_toplam` her grupta `0.00` olmalı, değilse uygulamanın asla kapatamayacağı bir bakiye var demektir
3. Gruba hiç ait olmamış bir kullanıcıya ait pay/ödeyen satırları (bakiye matematiğinden sessizce düşerler)
4. Hiç ödeyen satırı olmayan harcamalar

`20260727215500` öncesinde RPC'ler gelen payları doğrulamadığı için 1. sorgunun boş dönmesi garanti değil; migration yeni bozuk satırı engeller, eskisini onarmaz.

## `activity_log` arşivi (`pg_cron`)

[`docs/DATABASE.md`](../docs/DATABASE.md) P6: eski satırları `activity_log_archive` tablosuna taşıma. `pg_cron` her Supabase planda aynı şekilde açılmaz; bu yüzden **ayrı migration olarak zorunlu koyulmadı**.

**Dashboard'ta:** Database → Extensions → `pg_cron` etkinleştir (mümkünse). Ardından SQL Editor'da örnek job (tarih eşiğini ihtiyaca göre değiştir):

```sql
-- Örnek: 90 günden eski kayıtları arşive taşı (tek transaction)
-- İlk çalıştırmadan önce cron.schedule sözdizimini pg_cron sürümünüze göre doğrulayın.

select cron.schedule(
  'archive-old-activity-log',
  '0 3 * * *', -- her gece 03:00 UTC
  $$
  insert into public.activity_log_archive (
    id, group_id, actor_id, action, entity_type, entity_id, details, created_at
  )
  select id, group_id, actor_id, action, entity_type, entity_id, details, created_at
  from public.activity_log
  where created_at < now() - interval '90 days';

  delete from public.activity_log
  where created_at < now() - interval '90 days';
  $$
);
```

Cron kullanılamıyorsa aynı `INSERT … SELECT` + `DELETE` bloğunu periyodik olarak SQL Editor'dan çalıştırın.

## RPC'ler (istemci)

| Fonksiyon | Amaç |
|-----------|------|
| `join_group_by_invite(code)` | Grup `invite_code` ile katıl / `left_at` kaldır |
| `lookup_user_by_friend_code(code)` | Arkadaş `user_invite_code` ile profil özeti |
| `send_friend_request_by_code(code)` | İstek oluştur |

`authenticated` rolüne `EXECUTE` verilmiştir; doğrudan tablo `INSERT` politikaları kapalıdır (grup üyeliği / arkadaşlık RPC ve trigger'lar üzerinden).
