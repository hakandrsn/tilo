# Version 1.0.0

# Tilo - Modern Jigsaw Puzzle Oyunu

Tilo, görsel odaklı, akıcı ve kullanıcı dostu bir Jigsaw (Yapboz) oyunudur. Uygulama, bölümler (Chapters) ve seviyeler (Levels) üzerine kurulu bir ilerleme sistemine sahiptir.

## 🎮 Oyun Hakkında

Oyun, kullanıcıların farklı kategorilerdeki muhteşem görselleri parçalara ayırıp tekrar birleştirmesini hedefler. Temiz bir arayüz, canlı renkler ve akıcı animasyonlarla premium bir deneyim sunar.

### Oyun Kuralları

1.  **Parça Birleştirme:** Parçaları tablonun üzerinde sürükleyerek doğru yerlerine yerleştirin.
2.  **Gruplama:** Birbiriyle komşu olan doğru parçalar yan yana geldiğinde otomatik olarak birleşir ve grup halinde hareket ettirilebilir.
3.  **İlerleme:** Her bölümde 24 seviye bulunur. Bir seviyeyi tamamlamadan sonrakine geçemezsiniz.
4.  **Zorluk Seviyesi:** Seviye ilerledikçe tablo boyutu (Grid Size) artar:
    - **Seviye 1-8:** 3x4 (12 Parça)
    - **Seviye 9-16:** 4x5 (20 Parça)
    - **Seviye 17+:** 5x6 (30 Parça)

### Yıldız Sistemi

Başarınız hamle sayınıza göre değerlendirilir:

- ⭐ ⭐ ⭐ (3 Yıldız): Parça sayısı kadar veya daha az hamleyle tamamlandığında.
- ⭐ ⭐ (2 Yıldız): Parça sayısı + tablonun küçük kenarı kadarlık bir toleransla tamamlandığında.
- ⭐ (1 Yıldız): Daha fazla hamle yapıldığında.

---

## 🛠️ Teknik Yapı ve Sabitler

Oyunun temel yapı taşları `src/constants` altındaki dosyalarda tanımlanmıştır.

### 🎨 Renk Paleti (`colors.ts`)

Oyunun imzası olan canlı renkler merkezi bir paletten yönetilir:

- **Background (Turkuaz):** `#4bc9c3` - Ana arka plan.
- **Primary (Sunflower):** `#f9cd46` - Ana butonlar ve vurgular.
- **Secondary (Coral):** `#fc7e68` - Geçişler, kenarlıklar ve özel metinler.
- **Functional:** Başarı için Emerald (`#10b981`), hatalar için Red (`#ef4444`).

### ⚙️ Oyun Yapılandırması (`gameConfig.ts`)

- **Bölüm Sayısı:** 20 ana bölüm.
- **Seviye Sayısı:** Bölüm başına 24 seviye.
- **İpucu Sistemi:** Başlangıçta 10 ipucu, bölüm tamamlandığında +5 bonus.
- **Storage:** Kullanıcı ilerlemesi ve cihaz bilgileri `@puzzle_game_` prefix'li anahtarlar ile kalıcı olarak saklanır.

### 📐 Layout ve Tasarım (`layout.ts`)

Tüm arayüz ölçüleri responsive bir yapı sunmak adına sabitleştirilmiştir:

- **Board Padding:** 16px
- **Border Radius:** Modallar için 24px, butonlar için 35px.
- **Ölçüler:** Yıldız boyutları, buton boyutları ve badge ölçüleri bu dosyadan yönetilir.

### 📂 Veri Yapısı (`data.ts`)

Oyunun sahip olduğu bölümlerin (Sevimli Dostlar, Lezzet Durağı, Neon Sokaklar vb.) isimleri, açıklamaları ve kapak fotoğrafları burada tanımlanır.

---

## ⚙️ Nasıl Çalışır?

- **Zustand Store:** Oyunun tüm anlık durumu (parça pozisyonları, hamle sayısı, grup bilgileri) merkezi bir store üzerinden yönetilir.
- **Responsive Tasarım:** Uygulama Telefon, Tablet ve Desktop (Web) için ayrı breakpoint'lere sahiptir. Ekran genişliğine göre tablo boyutu otomatik ayarlanır.
- **Haptic Feedback:** Parçalar birleştiğinde veya hareket ettiğinde kullanıcıya fiziksel geri bildirim verilir.
- **Firebase & Auth:** Kullanıcıların ilerlemesi cihaz ID'si üzerinden anonim olarak Firebase'e kaydedilir, böylece uygulama silinse bile (SecureStore desteğiyle) ilerleme korunur.
