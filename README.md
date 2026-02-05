# Tilo: Jigsaw Puzzle
## Tilo, klasik yapboz deneyimini mobil cihazlara taşıyan; sürükle-bırak, parça gruplama ve otomatik manyetik birleşme (snapping) gibi gelişmiş mekaniklere sahip bir React Native oyunudur.

Bu projeyi geliştirirken en büyük motivasyonum, mobildeki "dokunma hissini" (haptic feedback) ve parça yönetimindeki karmaşık state mantığını (Zustand ile) en akıcı şekilde çözmekti.

### Öne Çıkan Özellikler
Sıradan bir puzzle oyunundan teknik olarak ayrıştığı noktalar:

Akıllı Gruplama (Smart Grouping): Yan yana gelen doğru parçalar sadece görsel olarak değil, mantıksal olarak da birleşir. Artık tek bir parça gibi sürüklenebilirler.

Dinamik Grid Sistemi: 3x4'ten 5x6'ya kadar değişen zorluk seviyeleri ve buna göre yeniden hesaplanan parça boyutları.

Performans Odaklı: Yüzlerce parça ekranda olsa bile kasmadan sürükleme (Drag & Drop) yapabilmek için optimize edilmiş render mantığı.

Bulut Entegrasyonu: Firebase ile anonim kullanıcı girişi ve ilerleme kaydı (böylece oyun silinse bile level'lar kaybolmaz).

### Teknik Derinlik (Tech Stack)
Bir Full-Stack geliştirici yaklaşımıyla projeyi şu temeller üzerine kurdum:

Core: React Native (Expo) & TypeScript

State Management: Zustand (Redux'a göre daha hafif ve hook tabanlı olduğu için tercih ettim, özellikle parça koordinatlarını anlık takip etmek için ideal).

Backend & Auth: Firebase (Anonymous Auth & Firestore).

UX/UI: Haptic Feedback entegrasyonu ve responsive tasarım (Tablet/Telefon uyumlu).

### Geliştirme Sürecinden Notlar
Projeyi geliştirirken karşılaştığım en tatlı zorluk "Parça Çarpışma Mantığı" idi. Kullanıcı bir parçayı sürükleyip bıraktığında:

Doğru yerde mi?

Yanında başka bir doğru parça var mı?

Eğer varsa, bunları yeni bir "Grup" objesi olarak mı birleştirmeliyim yoksa mevcut gruba mı eklemeliyim? Sorularını milisaniyeler içinde cevaplayan bir algoritma kurmak, projenin en öğretici kısmıydı.

### Kurulum
Projeyi incelemek veya geliştirmek isterseniz:
```
# Repoyu klonlayın
git clone https://github.com/hakandrsn/tilo.git

# Klasöre girin
cd tilo

# Bağımlılıkları yükleyin
npm install

# Firebase ayarları için
# (Kendi firebaseConfig.js dosyanızı oluşturmanız gerekebilir)

# Başlatın
npx expo start
```
