# Jigsaw Puzzle Oyunu - Sorun Analizi ve Çözüm Planı

## 🎯 Oyunun Amacı

- `A x B` boyutundaki bir board'da resim parçaları var.
- Parçalar tutulup sürüklenerek yer değiştiriliyor.
- Yan yana gelen parçaların **doğru komşu** olup olmadığı kontrol ediliyor.
- Doğruysa **birleşiyorlar** ve tek grup olarak hareket ediyorlar.
- Tüm parçalar birleşince **oyun kazanılıyor**.

---

## 🚨 Tespit Edilen Sorunlar

### 1. **Üst Üste Binme (Overlap) Sorunu** ⚠️ KRİTİK

**Senaryo**: 3x2 grubu, 2x2 grubun üzerine taşınıyor. 2x2 grubu itilmesi gerekirken, üst üste kalıyor.

**Kök Neden** (`jigsawStore.ts` satır 297-318):

```typescript
// HATA: Önce aktif grubu taşıyoruz (satır 283-290)
// Sonra victim grupları eski koordinatlarıyla arıyoruz (satır 298)
const vGroup = Object.values(pieces).filter((p) => p.groupId === vId);
```

- `pieces` objesi **zaten güncellendi** (aktif grup yeni yerine taşındı).
- Ama `vGroup` içindeki parçaların `currentRow/Col` değerleri **hala eski**.
- `findNearestEmptySlotForGroup` fonksiyonu `pieces` objesini kontrol ederken, **aktif grubun eski yeri** hala "dolu" görünüyor.

**Sonuç**: BFS yanlış sonuç veriyor veya hiç sonuç bulamıyor.

---

### 2. **Transactional Olmayan Taşıma** ⚠️ KRİTİK

**Problem**: Eğer victim grup itilecek yer bulamazsa (`shift === null`), aktif grup **zaten taşınmış oluyor**.

**Olması Gereken**:

- Önce TÜM victim grupların itilip itilemeyeceği kontrol edilmeli.
- Eğer herhangi biri itilemiyorsa, **tüm işlem iptal edilmeli** (Snap Back).

---

### 3. **Birleşme Sonrası İtme Kontrolü Yok**

**Problem**: İki grup birleştiğinde, yeni büyük grubun footprint'i başka gruplarla çakışıyor olabilir.
**Sonuç**: Birleşme sonrası üst üste binme oluşabiliyor.

---

### 4. **OccupiedSlots Hesaplama Hatası**

**Problem** (`jigsawStore.ts` satır 293-294):

```typescript
const currentOccupied = new Set(
  targetFootprint.map((f) => `${f.row},${f.col}`),
);
```

Bu set sadece **aktif grubun yeni yerini** içeriyor.

- Diğer (victim olmayan) grupların yerleri **dahil edilmemiş**.
- BFS, başka grupların üzerine de itme önerebilir.

---

### 5. **Sürükleme Sırasında Sınır Kontrolü (Clamping) Yok**

**Problem**: Kullanıcı bir grubu ekran dışına sürükleyebiliyor.

- `moveGroupToGrid` reddetse bile, kullanıcı deneyimi kötü (ani geri sekme).

**Olması Gereken**: Sürükleme sırasında grup, board sınırları içinde **clamp** edilmeli.

---

### 6. **Merge Sonrası Recursive Merge Kontrolü Yok**

**Problem**: A grubu B ile birleşti. Yeni AB grubu artık C grubunun yanında. Ama AC birleşmesi denemiyor.
**Sonuç**: Kullanıcı tekrar dokunmak zorunda kalıyor.

---

### 7. **Performance: Tüm Parçalar Her Harekette Render Oluyor**

**Problem**: `pieces` objesi her harekette tamamen yeni obje oluyor.

- `useMemo(() => Object.values(pieces), [pieces])` → Her seferinde yeni array.
- `React.memo` bile yardım etmiyor çünkü referanslar değişiyor.

---

## ✅ Çözüm Planı

### A. Transactional Move Logic (Öncelik: KRİTİK)

1. **Önce simülasyon yap, sonra uygula**:

   ```typescript
   // 1. Aktif grubun yeni footprint'ini hesapla (henüz taşıma)
   // 2. Victim grupları bul
   // 3. Her victim için BFS ile shift hesapla
   // 4. Eğer herhangi bir victim itilemezse → return { merged: false }
   // 5. Tüm shiftler geçerliyse → state'i güncelle
   ```

2. **OccupiedSlots Doğru Hesapla**:
   - Tüm parçaların mevcut yerlerini al.
   - Aktif grubun **eski yerini** çıkar.
   - Aktif grubun **yeni yerini** ekle.
   - Her victim itildikçe, eski yerini çıkar, yeni yerini ekle.

### B. Clamping During Drag

- `JigsawPiece.tsx` içinde `onUpdate` callback'inde:
  ```typescript
  const clampedX = Math.max(0, Math.min(translationX, maxX));
  const clampedY = Math.max(0, Math.min(translationY, maxY));
  ```

### C. Recursive Merge

- Merge sonrası, yeni grubun tüm komşularını tekrar kontrol et.
- `while (didMerge)` loop'u ekle.

### D. Performance Optimization

- Parça objeleri sadece değişenler için yeni referans alsın.
- `immer` veya manuel shallow copy kullan.

---

## 📋 Uygulama Sırası

1. [x] **Transactional Move Logic** refaktörü (`jigsawStore.ts`)
2. [x] **OccupiedSlots** hesaplamasını düzelt
3. [ ] **Clamping** ekle (`JigsawPiece.tsx`)
4. [x] **Recursive Merge** ekle
5. [ ] **Test**: 2x2 → 3x2 senaryosunu doğrula
