# Supabase (SplitSnap)

Şema tek kaynak: [`docs/DATABASE.md`](../docs/DATABASE.md).

## Migrations

- Hafta 3 çekirdek şema: [`migrations/20260405140000_week3_core.sql`](migrations/20260405140000_week3_core.sql) (`profiles`, `friend_requests`, `groups`, `group_members`, `activity_log`, `activity_log_archive`, RLS, RPC’ler, Realtime).
- Harcama / settlement tabloları sonraki migration’larda eklenecek (Hafta 4–6).

Bağlı projeye uygulamak:

```bash
supabase db push
```

Yerel Docker ile test:

```bash
supabase start
supabase db reset
```

## `activity_log` arşivi (`pg_cron`)

[`docs/DATABASE.md`](../docs/DATABASE.md) P6: eski satırları `activity_log_archive` tablosuna taşıma. `pg_cron` her Supabase planda aynı şekilde açılmaz; bu yüzden **ayrı migration olarak zorunlu koyulmadı**.

**Dashboard’ta:** Database → Extensions → `pg_cron` etkinleştir (mümkünse). Ardından SQL Editor’da örnek job (tarih eşiğini ihtiyaca göre değiştir):

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

Cron kullanılamıyorsa aynı `INSERT … SELECT` + `DELETE` bloğunu periyodik olarak SQL Editor’dan çalıştırın.

## RPC’ler (istemci)

| Fonksiyon | Amaç |
|-----------|------|
| `join_group_by_invite(code)` | Grup `invite_code` ile katıl / `left_at` kaldır |
| `lookup_user_by_friend_code(code)` | Arkadaş `user_invite_code` ile profil özeti |
| `send_friend_request_by_code(code)` | İstek oluştur |

`authenticated` rolüne `EXECUTE` verilmiştir; doğrudan tablo `INSERT` politikaları kapalıdır (grup üyeliği / arkadaşlık RPC ve trigger’lar üzerinden).
