const chapters = [
  // --- BAŞLANGIÇ: Net Objeler & Canlı Renkler ---
  {
    id: 1,
    name: "Sevimli Dostlar", // Eski: Hayvanlar (Daha sıcak bir isim)
    description: "Kedi, köpek ve tüylü dostların en tatlı halleri",
    color: "#f472b6", // Pembe/Sıcak
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80",
    }, // Kedi
  },
  {
    id: 2,
    name: "Lezzet Durağı", // Yeni: Yemek/Tatlı (Renkler canlı, parça birleşimi kolay)
    description: "İştah kabartan tatlılar ve meyveler",
    color: "#fb923c", // Turuncu
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80",
    }, // Cake
  },
  {
    id: 3,
    name: "Retro Objeler", // Yeni: Vintage (Kamera, daktilo vb. net şekiller)
    description: "Nostaljik eşyalar ve antika detaylar",
    color: "#78716c", // Kahve/Gri
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1550259114-ad7188f0a967?w=400&q=80",
    }, // Retro Car/Camera
  },
  {
    id: 4,
    name: "Renkli Kanatlar", // Eski: Kuşlar (Daha spesifik)
    description: "Egzotik kuşların muhteşem tüyleri",
    color: "#0ea5e9", // Gökyüzü Mavisi
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1552728089-57bdde30ebd1?w=400&q=80",
    }, // Parrot
  },
  {
    id: 5,
    name: "Botanik Bahçe", // Eski: Çiçekler (Daha makro çekimler)
    description: "Doğanın en canlı renk paletleri",
    color: "#22c55e", // Yeşil
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1470506028280-a011fb34b6f7?w=400&q=80",
    }, // Flower field
  },

  // --- KEŞİF: Manzaralar & Mimari ---
  {
    id: 6,
    name: "Tropik Kaçış", // Eski: Yaz/Plaj
    description: "Turkuaz sular ve palmiye gölgeleri",
    color: "#06b6d4", // Cyan
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=400&q=80",
    }, // Maldives
  },
  {
    id: 7,
    name: "Antik Gizemler", // Eski: Antik/Tarihi
    description: "Unutulmuş tapınaklar ve harabeler",
    color: "#d97706", // Altın/Toprak
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80",
    }, // Taj Mahal/Pyramid
  },
  {
    id: 8,
    name: "Neon Sokaklar", // Yeni: Cyberpunk/Tokyo geceleri
    description: "Gece ışıkları ve şehir yansımaları",
    color: "#8b5cf6", // Mor
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80",
    }, // Neon City
  },
  {
    id: 9,
    name: "Sokak Sanatı", // Yeni: Graffiti (Karmaşık ama renkli)
    description: "Duvarlardaki renkli isyan",
    color: "#ec4899", // Hot Pink
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1517713982677-4b6633299833?w=400&q=80",
    }, // Graffiti
  },
  {
    id: 10,
    name: "Masal Köyleri", // Eski: Köyler
    description: "Tablo gibi görünen şirin kasabalar",
    color: "#84cc16", // Lime
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1518730518541-d0843268c287?w=400&q=80",
    }, // Hallstatt/Cinque Terre
  },

  // --- ATMOSFER: Doku & Zor Renkler ---
  {
    id: 11,
    name: "Derin Mavi", // Eski: Deniz/Okyanus (Sualtı ağırlıklı)
    description: "Okyanusun altındaki sessiz dünya",
    color: "#1e40af", // Koyu Mavi
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1582967788606-a171f1080ca8?w=400&q=80",
    }, // Jellyfish/Coral
  },
  {
    id: 12,
    name: "Sonbahar Yolu", // Eski: Sonbahar
    description: "Kızıl yapraklar ve orman patikaları",
    color: "#ea580c", // Yanık Turuncu
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1507783548227-544c3b8bc210?w=400&q=80",
    }, // Autumn Road
  },
  {
    id: 13,
    name: "Buz Krallığı", // Eski: Kış (Beyaz ağırlıklı olduğu için zordur)
    description: "Kar taneleri ve buzlu zirveler",
    color: "#cbd5e1", // Açık Gri/Buz
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1483664852095-d6cc6870705d?w=400&q=80",
    }, // Snow
  },
  {
    id: 14,
    name: "Altın Saatler", // Eski: Gün Batımı
    description: "Güneşin batarken bıraktığı silüetler",
    color: "#f59e0b", // Amber
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1472120435266-531128262475?w=400&q=80",
    }, // Sunset
  },
  {
    id: 15,
    name: "Makro Evren", // Yeni: Böcek/Göz/Doku detayları
    description: "Gözle görülmeyen detayların dünyası",
    color: "#10b981", // Emerald
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80",
    }, // Macro Eye/Insect
  },

  // --- SOYUT & FİNAL: En Zor ve En Etkileyici ---
  {
    id: 16,
    name: "Kristal Mağara", // Yeni: Taşlar/Mineraller (Kırık çizgiler zordur)
    description: "Değerli taşlar ve ışık kırılmaları",
    color: "#6366f1", // Indigo
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1515516089376-88db1e26e9c0?w=400&q=80",
    }, // Crystals
  },
  {
    id: 17,
    name: "Gotik Mimari", // Eski: Mimari (Ama daha karanlık ve detaylı)
    description: "Katedraller, vitraylar ve detaylar",
    color: "#111827", // Çok koyu gri
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1548625361-9877039f99e6?w=400&q=80",
    }, // Gothic
  },
  {
    id: 18,
    name: "Soyut Rüya", // Eski: Sanat (Yağlı boya / Abstract)
    description: "Renklerin ve şekillerin dansı",
    color: "#db2777", // Koyu Pembe
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80",
    }, // Abstract Paint
  },
  {
    id: 19,
    name: "Kuzey Işıkları", // Yeni: Aurora Borealis (Geçişli renkler çok zordur)
    description: "Gökyüzündeki büyülü ışık dansı",
    color: "#34d399", // Yeşil/Mavi karışımı
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=80",
    }, // Aurora
  },
  {
    id: 20,
    name: "Sonsuz Uzay", // Eski: Uzay (En zor, siyah boşluklar çok)
    description: "Galaksiler, nebulalar ve bilinmeyen",
    color: "#4c1d95", // Deep Purple
    thumbnail: {
      uri: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80",
    }, // Nebula
  },
];

export default chapters;
