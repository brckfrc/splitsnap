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

## Ekran Görüntüleri

### Nerede duruyor

```
docs/store-assets/<sürüm>/
  raw/      → App Store Connect'e yüklenen ham kareler
  mockup/   → README'de kullanılan, cihaz giydirmeli hâlleri
```

`docs/roadmap-screenshots/` bunlarla karıştırılmamalı; orası okul projesinin haftalık geliştirme günlüğü ve `docs/school/ROADMAP.md` tarafından kullanılıyor.

### Boyut

Tek boyut yeterli: **1320 × 2868** (6.9", iPhone 17 / 16 Pro Max'in tam çözünürlüğü). Apple 1290×2796 ve 1260×2736'yı da kabul ediyor, ve verdiğin bu tek seti küçük cihazlara kendisi ölçekliyor. Yerelleştirme başına **en fazla 10** kare yüklenebilir.

**İlk 3 kare** arama sonuçlarında ve yükleme sayfasında görünen tek karelerdir; gerisini çoğu kullanıcı hiç görmez.

### ⚠️ Alfa kanalı tuzağı

Simülatörün kaydettiği PNG'lerde alfa kanalı bulunur ve **App Store Connect saydamlık içeren görselleri reddeder**. Yüklemeden önce mutlaka kontrol et:

```bash
sips -g hasAlpha ekran.png          # "hasAlpha: yes" ise temizlenmeli
```

Temizleme (boyutu ve PNG formatını korur, repoda ImageMagick yok ama ffmpeg var):

```bash
ffmpeg -y -i girdi.png -pix_fmt rgb24 cikti.png
```

Toplu iş için `while read` döngüsü kullan; **zsh dizileri 1'den başladığı için** `for i in $(seq …)` ile dizi indekslemek isimleri bir kaydırır.

### İçerik kuralları

Yaş sınırımız **4+** ve ankette her şeye "No" dedik. Ekran görüntülerindeki içerik bununla tutarlı olmak zorunda. Özellikle fiş fotoğraflarına dikkat: gerçek bir masada çekilen karede **sigara paketi, küllük, alkol** gibi nesneler görünürse reddedilme veya yaş sınırının yükseltilmesi riski var. Fiş fotoğrafını temiz bir yüzeyde çek.

### Demo verisi

Ekran görüntüleri için gerçekçi veri üreten betikler `supabase/seed-local/` altında (gitignore'lu, repoya girmez):

| Betik | İşi |
|---|---|
| `screenshot-seed.sql` | 5 test hesabı için 3 grup, harcamalar, ödeşme kaydı oluşturur |
| `screenshot-refresh-dates.sql` | Tarihleri bugüne kaydırır; "Bu ayki harcaman" ve "Bugün / Dün" etiketleri tazelenir |
| `screenshot-teardown.sql` | Hepsini siler |

Hesaplar panelden **Authentication > Users > Add user** ile ("Auto Confirm User" işaretli) açılır. Kare çekmeden önce `screenshot-refresh-dates.sql` çalıştır.

Fiş fotoğrafı ve manuel bölüşüm SQL ile kurulamıyor, o iki kare için uygulamada elle harcama eklemek gerekiyor. Simülatörde kamera olmadığından fiş görselini simülatör penceresine sürükleyip bırak, Fotoğraflar'a düşer, sonra "Galeriden Seç" ile al.

### v1.2.0 kare listesi

App Store'a `01`–`10` gidiyor (sınır zaten 10). `11` yedek: profil ekranı bilgi olarak iyi ama görsel olarak zayıf, açık temayı ana sayfa karesi çok daha iyi anlatıyor.

| # | Kare | Store | README |
|---|---|---|---|
| 01 | Ana sayfa özeti (koyu) | ✅ | ✅ mockup/1 |
| 02 | Fiş tarama ve otomatik doldurma | ✅ | ✅ mockup/2 |
| 03 | Ödeşme özeti | ✅ | ✅ mockup/4 |
| 04 | Ödeşmede harcama detay sheet'i | ✅ | |
| 05 | Grup detayı | ✅ | |
| 06 | Çoklu ödeyen seçici | ✅ | ✅ mockup/3 |
| 07 | Tam ekran fiş | ✅ | |
| 08 | Alacak dökümü sheet'i | ✅ | |
| 09 | Hızlı ekle grup seçici | ✅ | |
| 10 | Ana sayfa (açık tema) | ✅ | ✅ mockup/5 |
| 11 | Profil (açık tema) | | |

README'nin beş bölümü sırasıyla gruplar, fiş tarama, bölüşüm, ödeşme ve tema anlatıyor; `mockup/` numaraları bu sırayı takip ediyor, ham kare numaralarını değil.

### Yayın öncesi kontrol listesi

1. `screenshot-refresh-dates.sql` çalıştırıldı mı
2. Rahatsız Etmeyin açık mı (bildirim şeridi kareye girmesin)
3. Tüm kareler 1320×2868 mi
4. `hasAlpha: no` mu
5. Fotoğraflarda 4+ ile çelişen bir nesne var mı
6. İlk 3 kare en güçlü özellikleri mi anlatıyor
7. Kareler bittiğinde `screenshot-teardown.sql` (veri bir sonraki sürümde tekrar kullanılacaksa atla)

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
