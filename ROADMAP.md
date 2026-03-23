# SplitSnap - Yol Haritası

> Bu doküman, proje sürecini hafta hafta takip etmek için kullanılmaktadır.
> Haftalık ilerleme, video bağlantıları ve ekran görselleri ilgili haftaların altında paylaşılmaktadır.
> Proje planı, `docs/archive/SplitSnap Tanıtım Raporu.md` dönem başı teslim edilen proje tanıtım raporu içeriğiyle uyumlu şekilde korunmuştur.

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

### Haftalık Notlar

- İlerlemeyi bu dosya üzerinden takip ediyorum. Haftalık maddeleri rapordaki planla uyumlu tutmaya çalışıyorum; tamamlanan işleri işaretliyor, plan dışı yapılanları ise Ekstra bölümünde topluyorum.
- Projede Expo SDK 55, Expo Router ve TypeScript kullanıyorum. Routing yapısı `src/app/` altında dosya tabanlı ilerliyor.
- Supabase için gerekli paket ve `.env` yapısı hazır. Uygulama içindeki gerçek bağlantı ve Auth akışını Hafta 2 kapsamında tamamlamayı planlıyorum.
- MMKV gibi native modüller kullandığım için projeyi Expo Go yerine development build ile (`expo run:ios`) çalıştırıyorum.
- Başlangıçta Zustand, MMKV, AsyncStorage, `expo-image-picker` ve `expo-secure-store` kurulumlarını yaptım. Plan dışı kalan işler Ekstra bölümünde yer alıyor.
- Tasarım tarafında Figma’da oluşturduğum taslağı referans alıyorum. `design/figma_template/` altındaki yapıyı projeye implemente ederken ve tech stack hakkında bilgi toplarken yapay zekadan yararlandım; ancak çıkan içerikleri doğrudan kullanmak yerine düzenleyip projeye uyarladım. Başta oluşturduğum görseller de `design/figma_screenshots/` klasöründe bulunuyor.
- `main` branch'inde derlenebilir temel yapı ve dokümantasyonu korudum. Arayüzü denemek için ayrıca `ui-template` dalını açtım; giriş/kayıt ekranlarını burada emülatörde çalışır hale getirerek Hafta 2’ye fiilen başlamış oldum. Bundan sonraki adım, bu arayüzü `main` ile birleştirip Supabase Auth, oturum yönetimi, tema yapısı ve grup listesi tarafını tamamlamak.

### Video Linki

[Hafta 1 — 23-03-2026](https://youtu.be/uZ3RfGsreec?si=huxHxwlchSmuWuN4)

### Ekran Görselleri

## Hafta 2 — Kimlik Doğrulama ve Tema

- [x] Supabase projesinin oluşturulması
- [ ] Supabase Auth entegrasyonunun yapılması
- [ ] Kullanıcı kayıt ve giriş akışının çalışır hale getirilmesi
- [ ] Oturum yönetimi mantığının kurulması
- [ ] Temel uygulama tema ve ortak bileşen yapısının oluşturulması
- [ ] Grup listesi ekranının ilk sürümünün hazırlanması

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 3 — Veritabanı ve Grup Yapısı

- [ ] Veritabanı tablolarının planlanması
- [ ] user/profile, group ve group_member yapılarının oluşturulması
- [ ] Grup oluşturma ekranının yapılması
- [ ] Gruba katılma mantığının tasarlanması
- [ ] Kullanıcının dahil olduğu grupları listeleme

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 4 — Grup Detay ve Harcama Temeli

- [ ] Group ve membership akışlarının backend ile tam bağlanması
- [ ] Grup detay ekranının yapılması
- [ ] Grup üyelerinin görüntülenmesi
- [ ] Harcama ekranları için veri modellerinin hazırlanması
- [ ] Harcama ekleme ekranının ilk sürümünün yapılması

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 5 — Harcama Yönetimi

- [ ] Harcama ekleme işleminin tamamlanması
- [ ] Harcama düzenleme ve silme işlemlerinin eklenmesi
- [ ] Ödeyen kişi ve katılımcı seçme yapısının kurulması
- [ ] Eşit bölüşüm mantığının ilk sürümünün eklenmesi

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 6 — Paylaşım ve Hesaplama

- [ ] ExpenseSplit yapısının tamamlanması
- [ ] Manuel kişi bazlı tutar dağıtım özelliğinin eklenmesi
- [ ] Borç-alacak hesaplama mantığının yazılması
- [ ] Grup özet ekranının yapılması

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 7 — Yerel Veri Saklama ve İyileştirmeler

- [ ] Yerel veri saklama yapısının eklenmesi
- [ ] Kullanıcı oturumu ve bazı temel verilerin cihaz üzerinde tutulması
- [ ] Uygulama açılış performansının iyileştirilmesi
- [ ] Form doğrulama ve hata kontrollerinin güçlendirilmesi

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 8 — Fiş ve OCR Altyapısı

- [ ] Fiş görseli ekleme altyapısının hazırlanması
- [ ] Supabase Storage ile fiş görseli saklama yapısının kurulması
- [ ] iOS local OCR araştırmasının ve ilk entegrasyonunun yapılması
- [ ] OCR sonucu ile tarih, işletme adı ve toplam tutar alanlarının otomatik doldurulması

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 9 — OCR Entegrasyonu ve Arayüz

- [ ] OCR akışının harcama oluşturma ekranına bağlanması
- [ ] Fiş toplamı üzerinden otomatik eşit bölüşüm önerisinin yapılması
- [ ] Manuel kişi bazlı paylaştırma ile OCR sonucunun birlikte çalışır hale getirilmesi
- [ ] Arayüz iyileştirmeleri

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

## Hafta 10 — Son Düzenlemeler ve Final

- [ ] Genel hata düzeltmeleri
- [ ] Kod temizliği ve klasör düzeninin son halinin verilmesi
- [ ] Ekranların görsel olarak iyileştirilmesi
- [ ] GitHub üzerindeki açıklamaların toparlanması
- [ ] Final gösterimine uygun stabil sürümün hazırlanması

### Haftalık Notlar



### Video Linki



### Ekran Görselleri

---

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

## Kapsam Dışı (Gelecek Sürüm)

Aşağıdaki özellikler bilinçli olarak ilk sürüm kapsamı dışında bırakılmıştır:

- Android desteği
- Fişteki ürünleri kalem kalem otomatik ayrıştırma
- Gelişmiş YZ destekli fiş analizi
- Gerçek para transferi
- Banka veya kart entegrasyonu
- Tam App Store yayın süreci
