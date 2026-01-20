import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Chapter, Level } from "../types";

export const fetchChapters = async (): Promise<Chapter[]> => {
  try {
    const chaptersCol = collection(db, "chapters");
    const q = query(chaptersCol, orderBy("id", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
        }) as Chapter,
    );
  } catch (error) {
    console.error("Bölümler çekilirken hata oluştu:", error);
    return [];
  }
};

export const fetchLevels = async (chapterId: number): Promise<Level[]> => {
  try {
    const levelsCol = collection(
      db,
      "chapters",
      chapterId.toString(),
      "levels",
    );
    const q = query(levelsCol, orderBy("id", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          ...doc.data(),
        }) as Level,
    );
  } catch (error) {
    console.error("Seviyeler çekilirken hata oluştu:", error);
    return [];
  }
};

export const fetchLevelDetails = async (
  chapterId: number,
  levelId: number,
): Promise<Level | null> => {
  try {
    const levelDoc = await getDoc(
      doc(db, "chapters", chapterId.toString(), "levels", levelId.toString()),
    );
    if (levelDoc.exists()) {
      return levelDoc.data() as Level;
    }
    return null;
  } catch (error) {
    console.error("Seviye detayı çekilirken hata oluştu:", error);
    return null;
  }
};

import { writeBatch } from "firebase/firestore";

export const updateChapterLevelsGridSize = async (
  chapterId: number,
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    for (let i = 1; i <= 24; i++) {
      let gridSize = { rows: 4, cols: 3 }; // Default 3x4 (width x height implicitly or explicit?) -> User said: "3x4" usually means width x height or cols x rows.
      // User said: "3x4 olarak sonraki 10 level 4x5 olacak son 4 level 5x6"
      // In `types/index.ts`: GridSize = { cols: number; rows: number };
      // Usually "3x4" means 3 cols, 4 rows (vertical rectangle). Or 3 rows, 4 cols?
      // Context: It's a mobile game, likely portrait. 3 cols x 4 rows fits better.
      // Let's assume Cols x Rows based on typical matrix notation, but check previous levels if possible.
      // Wait, user said "gridSize değerlerini update edeceğiz".
      // Let's use:
      // 1-10: 3x4 (3 cols, 4 rows)
      // 11-20: 4x5 (4 cols, 5 rows)
      // 21-24: 5x6 (5 cols, 6 rows)

      if (i <= 10) {
        gridSize = { cols: 3, rows: 4 };
      } else if (i <= 20) {
        gridSize = { cols: 4, rows: 5 };
      } else {
        gridSize = { cols: 5, rows: 6 };
      }

      const levelRef = doc(
        db,
        "chapters",
        chapterId.toString(),
        "levels",
        i.toString(),
      );
      batch.update(levelRef, { gridSize });
    }

    await batch.commit();
    console.log(`Chapter ${chapterId} levels updated.`);
  } catch (error) {
    console.error(`Chapter ${chapterId} update error:`, error);
    throw error;
  }
};

export const updateAllChaptersGridSize = async (): Promise<void> => {
  try {
    const chapters = await fetchChapters();
    for (const chapter of chapters) {
      await updateChapterLevelsGridSize(chapter.id);
      console.log(`Updated Chapter ${chapter.id}`); // Sequential to avoid overwhelming batched writes if parallel
    }
    console.log("All chapters updated.");
  } catch (error) {
    console.error("Bulk update error:", error);
    throw error;
  }
};
