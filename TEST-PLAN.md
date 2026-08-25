# v1.2.0 Test Planı — geçici dosya

Sprint #3 (sunucu, **deploy edildi**) ve Sprint #4 (istemci, **henüz build alınmadı**) için elle test
adımları. Test bitince bu dosya silinecek; repoya girmesi gerekmiyor.

İki istemci kullanılıyor ve ayrımı karıştırmamak önemli:

| Kısaltma | Ne | Kod durumu |
|---|---|---|
| **YENİ** | Simülatör, `npm run ios:26` | Sprint #4 dahil, çalışma dizinindeki kod |
| **ESKİ** | Fiziksel iPhone, App Store'dan inen 1.2.0 (Build 13) | Sprint #4 ve `MONEY_EPSILON` **öncesi** |

> [!WARNING]
> Tek Supabase projesi var, yani bu testlerin hepsi **canlı veriye** yazıyor. Ekran görüntüsü test
> hesaplarıyla (Deniz / Mert / Sude) çalış, gerçek kullanıcı gruplarına dokunma. Attığın kayıtları G
> bölümünde temizle.

---

## 0. Hazırlık

- [ ] **0.1** ESKİ'yi hazırla: telefonda App Store sürümünü aç, bir test hesabıyla giriş yap. Build
      numarasını Profil ekranından doğrula — 13 olmalı. Bu cihaza **kesinlikle** yeni build kurmuyoruz,
      "eski istemci" kanıtı olarak duruyor.
- [ ] **0.2** YENİ'yi başlat: `npm run ios:26`. İlk build sıfırdan olduğu için uzun sürecek. Açıldıktan
      sonra farklı bir test hesabıyla giriş yap (ESKİ'dekiyle aynı grubun üyesi olmalı).
- [ ] **0.3** Tarihleri tazele: `supabase/seed-local/screenshot-refresh-dates.sql`. Grup boşsa önce
      `screenshot-seed.sql`.
- [ ] **0.4** Not al: test grubunda kaç üye var ve kim hangi cihazda. C ve D bölümleri iki cihazın aynı
      grupta olmasına bağlı.

---

## A. Yeni istemci sıkı sunucuya karşı — normal akışlar bozuldu mu

Hepsi **YENİ** üzerinde. Sprint #3 sunucuya doğrulama ekledi; buradaki amaç günlük akışların hâlâ
çalıştığını görmek.

- [ ] **A.1** Eşit bölüşümle harcama ekle (3 kişi, 90 TL). → Kaydedilmeli, herkesin payı 30 TL.
- [ ] **A.2** Eşit bölüşümle tam bölünmeyen harcama ekle (3 kişi, 10 TL). → Kaydedilmeli; sunucu 1
      kuruşluk sapmayı toleranslı karşılıyor.
- [ ] **A.3** Manuel bölüşümde payları toplamı tutmayacak şekilde gir. → İstemci daha submit'e
      izin vermeden uyarmalı. Uyarmadan geçerse sunucudan hata dönmeli; hangisi olduğunu not et.
- [ ] **A.4** Çoklu ödeyenle harcama ekle (iki kişi, toplamı harcamaya eşit). → Kaydedilmeli.
- [ ] **A.5** Kendi oluşturduğun harcamayı düzenle, sadece başlığı değiştir. → Kaydedilmeli ve
      **ödeyen listesi aynı kalmalı**. (F.1'in yeni istemcideki karşılığı; burada bozulmaması lazım.)
- [ ] **A.6** Fiş fotoğrafı ekleyerek harcama kaydet (galeriden; simülatörde pencereye sürükle-bırak).
      → Kaydedilmeli. Sunucu artık fiş yolunun grup klasörüyle başlamasını şart koşuyor.
- [ ] **A.7** Ödeme kaydet (Önerilen Ödemeler → Öde). → Kaydedilmeli.
- [ ] **A.8** **Bilinen `[Low]` hata:** kişi başı bir kuruşun altına düşen eşit bölüşüm — 3 kişilik
      grupta 0,02 TL'lik harcama. → **Hata beklenir** (sıfır paylı satır sunucuda reddediliyor).
      Bu adımın amacı ROADMAP'teki maddeyi doğrulamak. Gördüğün hata mesajını not et.

---

## B. Sprint #4 — bakiye dökümü toplanıyor mu

Hepsi **YENİ**, grup → ödeşme ekranı.

- [ ] **B.1** "Bakiye Dökümünüz" bloğunu aç. Her harcama satırının işareti senin rolüne uymalı:
      ödediysen artı yönlü, sadece payın varsa eksi yönlü.
- [ ] **B.2** Blok altındaki üç satırı kontrol et: **Harcamalar**, **Ödemeler**, **Net bakiyeniz**.
      Net satır, ekranın en üstündeki bakiye başlığıyla **kuruş kuruşuna** aynı olmalı. Tutmuyorsa
      hangi satırın saptığını yaz — bütün sprint'in amacı buydu.
- [ ] **B.3** Bir ödeme kaydet, ekrana dön. → Ödeme "KAYITLI ÖDEMELER" alt başlığı altında görünmeli,
      doğru işaretle, ve **Net bakiyeniz** o kadar değişmeli.
- [ ] **B.4** Bakiyesi sıfırlanmış bir üye bul. → Hiçbir yerde `-0,00` yazmamalı, renk de nötr olmalı.
- [ ] **B.5** "Geçmiş Ödemeler" bölümüyle döküm içindeki ödemeler tutarlı mı, aynı kayıtlar mı.

---

## C. Sprint #4 — bayat öneri koruması (iki cihaz gerekli)

Bu bölüm sprint'in en kritik parçası: ekranda duran öneri eskimişse, Öde'ye basmak sessizce fazla
ödeme kaydetmemeli. Koruma onay anında veriyi yeniden çektiği için realtime'a bağlı değil.

- [ ] **C.1 — borç kapanmış** · YENİ'de ödeşme ekranını aç, bir öneriyi gözünle not et (kimden kime,
      ne kadar). Ekranı **yenilemeden** ESKİ'de tam o ödemeyi kaydet. YENİ'ye dön, aynı öneride
      **Öde**'ye bas. → **"Bu Borç Kapanmış"** uyarısı çıkmalı, ters yönde borç oluşacağını söylemeli.
      Butonlar: Vazgeç / Yine de kaydet.
- [ ] **C.2 — Vazgeç yolu** · C.1'deki uyarıda **Vazgeç**'e bas. → Hiçbir kayıt oluşmamalı, bakiye
      değişmemeli.
- [ ] **C.3 — tutar değişmiş** · Yeni bir öneri not et. Ekranı yenilemeden ESKİ'de o borcun
      **bir kısmını** öde (ör. yarısı). YENİ'de aynı öneride **Öde**'ye bas. → **"Tutar Değişmiş"**
      uyarısı, hem ekranda görünen hem güncel tutarı yazmalı. Üç buton olmalı: Vazgeç, güncel tutarı
      kaydet, eski tutarı yine de kaydet.
- [ ] **C.4** C.3'te **güncel tutarı kaydet**'i seç. → Kaydedilen tutar güncel olan olmalı; dökümde
      ve bakiyede öyle görünmeli.
- [ ] **C.5** Bir öneri hiç değişmemişken Öde'ye bas. → **Hiç uyarı çıkmamalı**, doğrudan kaydetmeli.
      (Koruma yanlış alarm vermiyor olmalı.)

---

## D. Sprint #4 — realtime

- [ ] **D.1** YENİ'yi ödeşme ekranında **açık bırak**, arka plana atma. ESKİ'de bir ödeme kaydet.
      → YENİ birkaç saniye içinde kendiliğinden güncellenmeli. Bu, `settlements` aboneliğinin testi;
      eskiden ancak uygulamayı arka plana atıp geri açınca geliyordu.
- [ ] **D.2** Aynısını harcama için yap (ESKİ'de harcama ekle). → YENİ güncellenmeli (regresyon
      kontrolü, bu zaten çalışıyordu).
- [ ] **D.3** ESKİ'de bir ödemeyi sil. → YENİ'de kaybolmalı.

---

## E. Sprint #4 — basma anı davranışı

Hepsi **YENİ**.

- [ ] **E.1** Öde butonuna hızlıca iki kez bas. → **Tek** dialog çıkmalı, iki tane değil.
- [ ] **E.2** Bir satır kaydedilirken spinner **yalnızca o satırda** dönmeli, diğer satırlar
      bozulmamalı.
- [ ] **E.3** Uyarı dialogunu dışarıya basarak kapat, sonra tekrar Öde'ye bas. → Buton hâlâ çalışmalı
      (dialog kilidi açık kalmamalı).

---

## F. Eski istemci sıkı sunucuya karşı — bilinen iki hatayı doğrula

Bu bölüm ROADMAP Sprint #5'in ilk iki maddesini gözle doğrulamak için. **Şu an production'da canlı**
olan davranış bu, yani burada "hata görmek" beklenen sonuç.

- [ ] **F.1 — `[High]` ödeyen kayması** · YENİ'de öyle bir harcama oluştur ki **oluşturan** ESKİ'deki
      hesap olsun ama **ödeyen** başka biri olsun. Sonra ESKİ'de o harcamayı aç ve **sadece başlığını**
      değiştirip kaydet. YENİ'de harcamaya bak. → **Ödeyen, ESKİ'deki hesaba kaymış olmalı** (hata bu).
      Ayrıca bakiyelerin nasıl değiştiğini not et; `paid_by` ile ödeyen listesi birbirine düşmüş olabilir.
- [ ] **F.2 — düzenleme yetkisi** · ESKİ'de, oluşturanı **başka biri** olan ve senin grup sahibi
      olmadığın bir harcamayı düzenlemeyi dene. → Sprint #3'ten sonra sunucu bunu **reddetmeli**.
      Kullanıcıya hangi hata mesajının göründüğünü not et; çirkinse Sprint #5'e UX maddesi olur.
- [ ] **F.3 — epsilon farkı** · ESKİ istemci 0,05 toleransla çalışıyor, sunucu 0,01 istiyor. Tam
      bölünmeyen bir eşit bölüşüm dene (ör. grubun üye sayısına göre 10,03 TL / 5 kişi gibi, kuruş
      artakalanı oluşturacak bir kombinasyon). → Hata alırsan bu, eski istemcilerin canlı sunucuda
      harcama ekleyemediği bir senaryo demek; **alırsan mutlaka not et**, Sprint #5'in aciliyetini
      değiştirir.
- [ ] **F.4** ESKİ'de ödeme kaydet, fiş yükle, grup oluştur. → Hepsi çalışmalı. Çalışmayan varsa
      eski istemci canlı sunucuda kırılmış demektir, en yüksek öncelik.

---

## G. Kapanış

- [ ] **G.1** Audit sorgularını çalıştır: `supabase/audit/expense_integrity_audit.sql`. → 1, 3 ve 4
      satır döndürmemeli; 2'de net toplam `0.00` olmalı. Testler veri bütünlüğünü bozduysa burada görünür.
- [ ] **G.2** Test sırasında eklediğin harcama ve ödemeleri sil. Ekran görüntüsü verisini komple
      sıfırlayacaksan `supabase/seed-local/screenshot-teardown.sql`.
- [ ] **G.3** F bölümünde gördüklerini ROADMAP Sprint #5'in ilgili maddelerinin altına yaz (özellikle
      F.3 sonucu).
- [ ] **G.4** Bu dosyayı sil.

---

## Sonuçlar

Buraya kısa not düş — hangi adım patladı, hangi mesaj çıktı:

```
A.
B.
C.
D.
E.
F.
G.
```
