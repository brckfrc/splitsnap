# App Store Notları

Kişisel referans — SplitSnap'in App Store yayın sürecine dair kararlar ve yapılan işlemler.

---

## Kimlik Bilgileri (Public)

| Alan | Değer |
|---|---|
| Bundle ID | `dev.borak.splitsnap` |
| App Store Connect App ID (ascAppId) | `6774394620` |
| Apple Team ID | `762X6VC8GW` |
| EAS Project ID | `8e4f6003-7d50-4798-8f12-629afdce2834` |
| EAS Owner (Expo kullanıcı adı) | `brckfrc` |
| App Store URL | https://apps.apple.com/app/id6774394620 |

> Bu değerler herkese açık tanımlayıcılardır, repoya commit edilmeleri sorunsuz.

---

## Komutlar

### Günlük geliştirme

```bash
# Simülatörde çalıştır (en hızlı)
npx expo run:ios

# Fiziksel cihaza USB ile yükle (local build, ~2-3 dk)
npx expo run:ios --device

# Simülatörde belirli bir cihaz seç
npx expo run:ios --simulator "iPhone 14 Pro Max"
```

### Fiziksel cihaz — ilk kurulum (bir kez yapılır)

```bash
# 1. Cihazı EAS'a kaydet (QR kod çıkar, telefondan okut)
eas device:create

# 2. Yeni cihazla güncel provisioning profile oluşturmak için development build al
eas build --profile development --platform ios
#    → Build biter → .ipa linki gelir → Expo Go veya EAS ile cihaza yükle
#    → Bundan sonra artık `expo run:ios --device` yeterli
```

### Test dağıtımı (başkasına göndermek için)

```bash
# Internal preview build — kayıtlı cihazlara link ile dağıtılır
eas build --profile preview --platform ios
#    → EAS Dashboard'dan .ipa linkini paylaş
```

### App Store release (her yeni sürümde)

```bash
# 1. Production build al — EAS bulutunda derlenir (~10-15 dk)
#    autoIncrement: true → build number otomatik artar
eas build --platform ios --profile production

# 2. Build bitti → App Store Connect'e gönder
eas submit --platform ios --profile production

# 3. ASC'de: Hazırladığın versiyona build'i ata → Add for Review
```

### Versiyon yönetimi

```bash
# Build number → autoIncrement ile EAS otomatik artırır (1, 2, 3...)
# Marketing version (1.0.0) → app.json'da manuel güncellenir, örneğin:
#   "version": "1.1.0"   ← minor güncelleme
#   "version": "2.0.0"   ← major güncelleme
```

### Supabase

```bash
# Edge function deploy (kod değişince)
supabase functions deploy parse-receipt
supabase functions deploy delete-account

# DB migration push
supabase db push

# Secret ekle (OPENAI_API_KEY gibi — bir kez)
supabase secrets set OPENAI_API_KEY=sk-...

# Proje aktif değilse önce dashboard'dan restore et
```

### EAS genel

```bash
# Giriş yap
eas login

# Mevcut build'leri listele
eas build:list

# Build loglarını takip et (build ID ile)
eas build:view

# Kayıtlı cihazları listele
eas device:list
```

---

## Build & Submit — Ne Zaman Yapılır?

`eas build` + `eas submit` her commit'te yapılmaz. Yalnızca **App Store'a yeni sürüm gönderirken** gereklidir.

| Durum | Komut |
|---|---|
| Her gün geliştirme (simülatör) | `npx expo run:ios` |
| Her gün geliştirme (USB, fiziksel cihaz) | `npx expo run:ios --device` |
| Cihaz kayıt + dev client (bir kez) | `eas build --profile development` |
| Başkasına test için gönder | `eas build --profile preview` |
| App Store'a yeni sürüm | `eas build --profile production` → `eas submit` |

`autoIncrement: true` sayesinde her `eas build --profile production` build number'ı otomatik artırır. `version` (1.0.0) ise `app.json`'da manuel güncellenir.

---

## App Store Connect — Yapılan Ayarlar

### App Information
- **Name:** SplitSnap
- **Subtitle:** Grup harcamalarını fişle böl
- **Category:** Finance
- **Privacy Policy URL:** https://splitsnap.borak.dev/privacy
- **Support URL:** https://splitsnap.borak.dev

### Age Rating
Tüm sorular No / None → hesaplanan rating: **4+**. Override yok.

### Privacy Nutrition Label — Data Collection
Uygulama şu veri tiplerini toplar, hepsi **App Functionality** amaçlı:

| Veri Tipi | Kimliğe Bağlı? | Tracking? |
|---|---|---|
| Name | Yes | No |
| Email Address | Yes | No |
| User ID | Yes | No |
| Financial Info (harcama tutarları) | Yes | No |
| Photos or Videos (fiş görselleri) | Yes | No |

**Tracking kullanılmıyor** — reklam SDK'sı yok, data broker yok. OpenAI'ya yalnızca OCR metni gönderilir (PII yok, görsel yok).

### App Review Information
- **Sign-in Required:** Yes
- Demo hesap bilgileri ASC'ye girildi (App Review Information bölümü)
- Notes: Test hesabı mevcut gruba dahil; OCR testi için fiş fotoğrafı gereklidir

---

## Teknik Altyapı

### EAS (`eas.json`)
```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "ios": { "simulator": true } },
    "preview":     { "distribution": "internal", "ios": { "simulator": true } },
    "production":  { "autoIncrement": true }
  },
  "submit": {
    "production": { "ios": { "ascAppId": "6774394620", "appleTeamId": "762X6VC8GW" } }
  }
}
```

### Privacy Manifest (`app.json → ios.privacyManifests`)
Apple May 2024 zorunluluğu — kullanılan API kategorileri:

| API | Reason Code |
|---|---|
| UserDefaults | CA92.1 — Uygulama ayarlarını saklamak |
| FileTimestamp | C617.1 — Kullanıcı eylemlerine yanıt |
| DiskSpace | E174.1 — İçerik yazma öncesi alan kontrolü |

### Associated Domains
```
applinks:splitsnap.borak.dev      → Grup davet universal link'leri
webcredentials:splitsnap.borak.dev → iOS Keychain otomatik doldurma
```

Apple Developer Portal'da `dev.borak.splitsnap` App ID'sinde **Associated Domains** capability aktif olmalı.

### Export Compliance
`usesNonExemptEncryption: false` — Yalnızca HTTPS (standart/muaf şifreleme). ITSAppUsesNonExemptEncryption `false` → ayrıca French export bildirimi gerekmez.

---

## Website (`splitsnap.borak.dev`)

Cloudflare Pages üzerinde barındırılır (`website/` klasöründen deploy).

| URL | İçerik |
|---|---|
| `/` | Ana sayfa |
| `/privacy` | Gizlilik politikası |
| `/.well-known/apple-app-site-association` | AASA (universal link + webcredentials) |
| `/invite/<KOD>` | Grup davet fallback sayfası |

`_headers`: AASA için `Content-Type: application/json`
`_redirects`: `/invite/*` → `/invite/index.html 200` (URL korunur)

---

## Grup Davet Universal Link Akışı

```
Kullanıcı linke basar
  https://splitsnap.borak.dev/invite/ABC123
        ↓
  [App yüklü?]
  Evet → iOS universal link → src/app/invite/[code].tsx
           ↓
     [Giriş yapılmış?]
     Evet → joinByInviteCode → groups listesi
     Hayır → pendingInviteStore.set(code) → /login
              → login sonrası groups/index mount
              → pendingInviteStore.get() → joinByInviteCode
  
  Hayır → website/invite/index.html gösterilir
           → "App Store'dan İndir" butonu
           → deepLink deneme: splitsnap://invite/ABC123
```

---

## Hesap Silme (Apple 5.1.1(v))

Uygulama içi yol: **Profil → Hesabı Sil**

Supabase Edge Function `delete-account`:
1. Profile anonimleştirilir (`display_name: 'Silinmiş Kullanıcı'`, email/avatar null)
2. Auth kullanıcısı ban edilir (`ban_duration: 876000h`, email/password scramble)

Hard delete yapılmıyor çünkü `expenses.paid_by → profiles RESTRICT (NOT NULL)` — ortak harcama geçmişi kırılır.
