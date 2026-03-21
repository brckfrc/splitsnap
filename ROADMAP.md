# SplitSnap - Yol Haritası

> **Not:** Bu dosya üniversite proje raporundan türetilmiştir ve Türkçe kalmalıdır.
> Diğer tüm dokümantasyon dosyaları İngilizce yazılmıştır.
>
> **Kullanım kuralları:**
> - Bu roadmap'teki maddeler `docs/archive/SplitSnap Tanıtım Raporu.md` Bölüm 7 ile birebir aynıdır ve **değiştirilemez**.
> - Tek yapılacak işlem tamamlanan maddelere `[x]` koymaktır.
> - Planlananın dışında yapılan ek çalışmalar, ilgili haftanın altına **`### Ekstra`** başlığıyla eklenir.
> - Böylece proje tesliminde orijinal plan değişmemiş, ekstra yapılanlar da görünür olmuş olur.

React Native + TypeScript ile iOS için geliştirilecek ortak harcama takip uygulaması.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native (Expo SDK 55) |
| Dil | TypeScript |
| Platform | iOS (Xcode, iOS Simulator) |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Tasarım | Figma |
| OCR | iOS cihaz içi metin tanıma |
| Sürüm Kontrolü | Git & GitHub |

## Veri Modelleri

- **User / Profile** — id, ad, e-posta, oluşturulma tarihi
- **Group** — id, grup adı, açıklama, oluşturulma tarihi, grup sahibi
- **GroupMember** — id, grup id, kullanıcı id, katılım tarihi
- **Expense** — id, grup id, başlık, açıklama, tarih, toplam tutar, ödeyen, paylaşım tipi, fiş görseli, OCR alanları
- **ExpenseSplit** — id, harcama id, kullanıcı id, düşen tutar
- **SettlementSummary** — toplam harcama, kullanıcı bazlı ödenen/düşen, alacaklı/borçlu listesi

---

## Hafta 1 — Proje Kurulumu ve Temel Yapı

- [x] Proje konusunun netleştirilmesi
- [x] GitHub deposunun oluşturulması
- [x] React Native + TypeScript proje kurulumunun yapılması
- [x] Temel klasör yapısının oluşturulması
- [x] Navigation yapısının ilk kurulumu
- [x] Figma üzerinde ilk ekran taslaklarının hazırlanması
- [x] Açılış, giriş ve kayıt ekranlarının ilk sürümünün yapılması

### Ekstra

- [x] Expo SDK 55 + `default@sdk-55` şablonu ile proje oluşturulması (Expo Router, `src/app/`)
- [x] Supabase istemcisi için paketler ve ortam değişkenleri (`.env` / `.env.example`)
- [x] Zustand, react-native-mmkv, react-native-nitro-modules, expo-secure-store, expo-image-picker kurulumu
- [x] İlk iOS development build (`expo run:ios`) ve `expo-doctor` doğrulaması
- [x] `README.md`, `docs/AGENTS.md`, `docs/PROGRESS.md` ve arşiv rapor yolu güncellemeleri
- [x] `design/` klasörü — Figma çıktısına uygun referans UI (Vite/React prototip: Login, Register, grup/harcama sayfaları, tema dosyaları)

## Hafta 2 — Kimlik Doğrulama ve Tema

- [x] Supabase projesinin oluşturulması
- [ ] Supabase Auth entegrasyonunun yapılması
- [ ] Kullanıcı kayıt ve giriş akışının çalışır hale getirilmesi
- [ ] Oturum yönetimi mantığının kurulması
- [ ] Temel uygulama tema ve ortak bileşen yapısının oluşturulması
- [ ] Grup listesi ekranının ilk sürümünün hazırlanması

## Hafta 3 — Veritabanı ve Grup Yapısı

- [ ] Veritabanı tablolarının planlanması
- [ ] user/profile, group ve group_member yapılarının oluşturulması
- [ ] Grup oluşturma ekranının yapılması
- [ ] Gruba katılma mantığının tasarlanması
- [ ] Kullanıcının dahil olduğu grupları listeleme

## Hafta 4 — Grup Detay ve Harcama Temeli

- [ ] Group ve membership akışlarının backend ile tam bağlanması
- [ ] Grup detay ekranının yapılması
- [ ] Grup üyelerinin görüntülenmesi
- [ ] Harcama ekranları için veri modellerinin hazırlanması
- [ ] Harcama ekleme ekranının ilk sürümünün yapılması

## Hafta 5 — Harcama Yönetimi

- [ ] Harcama ekleme işleminin tamamlanması
- [ ] Harcama düzenleme ve silme işlemlerinin eklenmesi
- [ ] Ödeyen kişi ve katılımcı seçme yapısının kurulması
- [ ] Eşit bölüşüm mantığının ilk sürümünün eklenmesi

## Hafta 6 — Paylaşım ve Hesaplama

- [ ] ExpenseSplit yapısının tamamlanması
- [ ] Manuel kişi bazlı tutar dağıtım özelliğinin eklenmesi
- [ ] Borç-alacak hesaplama mantığının yazılması
- [ ] Grup özet ekranının yapılması

## Hafta 7 — Yerel Veri Saklama ve İyileştirmeler

- [ ] Yerel veri saklama yapısının eklenmesi
- [ ] Kullanıcı oturumu ve bazı temel verilerin cihaz üzerinde tutulması
- [ ] Uygulama açılış performansının iyileştirilmesi
- [ ] Form doğrulama ve hata kontrollerinin güçlendirilmesi

## Hafta 8 — Fiş ve OCR Altyapısı

- [ ] Fiş görseli ekleme altyapısının hazırlanması
- [ ] Supabase Storage ile fiş görseli saklama yapısının kurulması
- [ ] iOS local OCR araştırmasının ve ilk entegrasyonunun yapılması
- [ ] OCR sonucu ile tarih, işletme adı ve toplam tutar alanlarının otomatik doldurulması

## Hafta 9 — OCR Entegrasyonu ve Arayüz

- [ ] OCR akışının harcama oluşturma ekranına bağlanması
- [ ] Fiş toplamı üzerinden otomatik eşit bölüşüm önerisinin yapılması
- [ ] Manuel kişi bazlı paylaştırma ile OCR sonucunun birlikte çalışır hale getirilmesi
- [ ] Arayüz iyileştirmeleri

## Hafta 10 — Son Düzenlemeler ve Final

- [ ] Genel hata düzeltmeleri
- [ ] Kod temizliği ve klasör düzeninin son halinin verilmesi
- [ ] Ekranların görsel olarak iyileştirilmesi
- [ ] GitHub üzerindeki açıklamaların toparlanması
- [ ] Final gösterimine uygun stabil sürümün hazırlanması

---

## Kapsam Dışı (Gelecek Sürüm)

Aşağıdaki özellikler bilinçli olarak ilk sürüm kapsamı dışında bırakılmıştır:

- Android desteği
- Fişteki ürünleri kalem kalem otomatik ayrıştırma
- Gelişmiş YZ destekli fiş analizi
- Gerçek para transferi
- Banka veya kart entegrasyonu
- Tam App Store yayın süreci
