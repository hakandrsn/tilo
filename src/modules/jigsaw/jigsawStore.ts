import { create } from "zustand";
import { GridSize } from "../../types";

export type JigsawPiece = {
  id: number;
  currentCol: number;
  currentRow: number;
  correctRow: number;
  correctCol: number;
  groupId: string;
  zIndex: number;
  isLocked: boolean;
};

export type GameStatus = "playing" | "won";

interface JigsawState {
  pieces: Record<number, JigsawPiece>;
  gridSize: GridSize;
  isInitialized: boolean;
  maxZIndex: number;
  status: GameStatus;
  isHapticEnabled: boolean;
}

interface JigsawActions {
  initializeLevel: (gridSize: GridSize) => void;
  moveGroupToGrid: (
    anchorId: number,
    targetRow: number,
    targetCol: number,
  ) => { merged: boolean };
  bringGroupToFront: (groupId: string) => void;
  resetGame: () => void;
}

interface JigsawStore extends JigsawState {
  actions: JigsawActions;
}

const initialState: JigsawState = {
  pieces: {},
  gridSize: { cols: 3, rows: 4 },
  isInitialized: false,
  maxZIndex: 1,
  status: "playing",
  isHapticEnabled: true,
};

// Helper: Shuffle an array
const shuffle = <T>(array: T[]): T[] => {
  return array.sort(() => Math.random() - 0.5);
};

// Helper: Find nearest valid shift for a group to avoid collision
const findNearestEmptySlotForGroup = (
  group: JigsawPiece[],
  pieces: Record<number, JigsawPiece>,
  gridSize: GridSize,
  occupiedSlots: Set<string>,
  preferSourceRow?: number, // İtme yönünü belirlemek için
  preferSourceCol?: number,
): { dr: number; dc: number } | null => {
  const queue: { dr: number; dc: number }[] = [{ dr: 0, dc: 0 }];
  const visited = new Set<string>(["0,0"]);

  // Arama yönlerini "kaynak boşluğa" göre önceliklendirebiliriz
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 1 },
  ];

  // Eğer bir tercih varsa (itme yönü), yönleri ona göre sırala
  if (preferSourceRow !== undefined) {
    directions.sort((a, b) => {
      // Basit bir mesafe/yön önceliği mantığı
      return 0; // Şimdilik standart BFS
    });
  }

  while (queue.length > 0) {
    const { dr, dc } = queue.shift()!;

    if (dr !== 0 || dc !== 0) {
      let isValid = true;
      for (const p of group) {
        const nr = p.currentRow + dr;
        const nc = p.currentCol + dc;

        // Check bounds and occupancy (occupiedSlots contains all simulated positions)
        if (
          nr < 0 ||
          nr >= gridSize.rows ||
          nc < 0 ||
          nc >= gridSize.cols ||
          occupiedSlots.has(`${nr},${nc}`)
        ) {
          isValid = false;
          break;
        }
      }
      if (isValid) return { dr, dc };
    }

    for (const d of directions) {
      const next = { dr: dr + d.dr, dc: dc + d.dc };
      const key = `${next.dr},${next.dc}`;
      if (
        !visited.has(key) &&
        Math.abs(next.dr) < gridSize.rows &&
        Math.abs(next.dc) < gridSize.cols
      ) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
  return null;
};
export const useJigsawStore = create<JigsawStore>((set, get) => ({
  ...initialState,

  actions: {
    initializeLevel: (gridSize) => {
      const totalPieces = gridSize.cols * gridSize.rows;
      const pieces: Record<number, JigsawPiece> = {};

      // 1. Generate all possible grid slots
      const allSlots: { row: number; col: number }[] = [];
      for (let r = 0; r < gridSize.rows; r++) {
        for (let c = 0; c < gridSize.cols; c++) {
          allSlots.push({ row: r, col: c });
        }
      }

      // 2. Shuffle slots to assign random initial positions
      const shuffledSlots = shuffle([...allSlots]);

      // 3. Create Pieces
      for (let i = 0; i < totalPieces; i++) {
        const correctRow = Math.floor(i / gridSize.cols);
        const correctCol = i % gridSize.cols;
        const initialPos = shuffledSlots[i];

        pieces[i] = {
          id: i,
          currentCol: initialPos.col,
          currentRow: initialPos.row,
          correctRow,
          correctCol,
          zIndex: 1,
          isLocked: false,
          groupId: `group-${i}`,
        };
      }

      // 4. Initial Auto-Merge (Recursive)
      // If pieces spawn next to their correct neighbors, merge them immediately.
      let mergedSomething = true;
      while (mergedSomething) {
        mergedSomething = false;
        const allPieces = Object.values(pieces);

        for (const p of allPieces) {
          const neighbors = [
            { r: p.currentRow - 1, c: p.currentCol },
            { r: p.currentRow + 1, c: p.currentCol },
            { r: p.currentRow, c: p.currentCol - 1 },
            { r: p.currentRow, c: p.currentCol + 1 },
          ];

          for (const n of neighbors) {
            const neighbor = allPieces.find(
              (np) =>
                np.currentRow === n.r &&
                np.currentCol === n.c &&
                np.groupId !== p.groupId,
            );

            if (neighbor) {
              const correctRowDiff = neighbor.correctRow - p.correctRow;
              const correctColDiff = neighbor.correctCol - p.correctCol;
              const actualRowDiff = neighbor.currentRow - p.currentRow;
              const actualColDiff = neighbor.currentCol - p.currentCol;

              if (
                correctRowDiff === actualRowDiff &&
                correctColDiff === actualColDiff
              ) {
                // Merge!
                const targetGroupId = neighbor.groupId;
                const sourceGroupId = p.groupId;
                // Merge source group INTO target group
                const sourceMembers = allPieces.filter(
                  (m) => m.groupId === sourceGroupId,
                );
                sourceMembers.forEach((m) => {
                  pieces[m.id].groupId = targetGroupId;
                });
                mergedSomething = true;
              }
            }
          }
        }
      }

      set({
        ...initialState,
        pieces,
        gridSize,
        isInitialized: true,
        maxZIndex: 1,
        status: "playing",
      });
    },

    moveGroupToGrid: (anchorId, targetRow, targetCol) => {
      const state = get();
      if (state.status === "won") return { merged: false };

      const pieces = { ...state.pieces };
      const anchorPiece = pieces[anchorId];
      if (!anchorPiece) return { merged: false };

      const draggedGroupId = anchorPiece.groupId;
      const groupPieces = Object.values(pieces).filter(
        (p) => p.groupId === draggedGroupId,
      );

      // 1. Calculate Target Footprint (without modifying state yet)
      const targetFootprint = groupPieces.map((p) => ({
        id: p.id,
        row: targetRow + (p.currentRow - anchorPiece.currentRow),
        col: targetCol + (p.currentCol - anchorPiece.currentCol),
      }));

      // 2. Bounds Check
      if (
        targetFootprint.some(
          (m) =>
            m.row < 0 ||
            m.row >= state.gridSize.rows ||
            m.col < 0 ||
            m.col >= state.gridSize.cols,
        )
      ) {
        return { merged: false };
      }

      // 3. Build the FULL occupied slots map (all pieces except dragged group)
      const occupiedSlots = new Set<string>();
      Object.values(pieces).forEach((p) => {
        if (p.groupId !== draggedGroupId) {
          occupiedSlots.add(`${p.currentRow},${p.currentCol}`);
        }
      });

      // 4. Add the TARGET footprint to occupied (where dragged group WILL be)
      const incomingSlots = new Set<string>();
      targetFootprint.forEach((f) => {
        incomingSlots.add(`${f.row},${f.col}`);
      });

      // 5. Find Victim Pieces (individual pieces that overlap with incoming footprint)
      // We no longer look for "Victim Groups" as a whole, but specific pieces.
      const victimPieces: JigsawPiece[] = [];
      Object.values(pieces).forEach((p) => {
        if (
          p.groupId !== draggedGroupId &&
          incomingSlots.has(`${p.currentRow},${p.currentCol}`)
        ) {
          victimPieces.push(p);
        }
      });

      // 6. SPLIT & SCATTER LOGIC (Refined)
      // Only the specific overlapping pieces are detached and moved.
      // The rest of their original groups remain touched.

      const victimMoves: Map<number, { row: number; col: number }> = new Map();

      // Build simulation occupancy: start with dragged group's NEW position
      const simulatedOccupied = new Set(incomingSlots);

      // Add all pieces that are NOT victims (including the rest of the victim's old group)
      // and NOT the dragged group (which is already in incomingSlots)
      const victimPieceIds = new Set(victimPieces.map((p) => p.id));
      Object.values(pieces).forEach((p) => {
        if (p.groupId !== draggedGroupId && !victimPieceIds.has(p.id)) {
          simulatedOccupied.add(`${p.currentRow},${p.currentCol}`);
        }
      });

      // Process each individual victim piece
      for (const p of victimPieces) {
        // Find nearest empty slot for THIS piece alone
        // using [p] as the "group" to search
        const shift = findNearestEmptySlotForGroup(
          [p],
          pieces,
          state.gridSize,
          simulatedOccupied,
          p.currentRow, // Prefer pushing away logic?
          p.currentCol,
        );

        if (shift) {
          const newRow = p.currentRow + shift.dr;
          const newCol = p.currentCol + shift.dc;
          victimMoves.set(p.id, { row: newRow, col: newCol });
          simulatedOccupied.add(`${newRow},${newCol}`);
        } else {
          // No slot found. Abort move to prevent overlapping without resolution.
          return { merged: false };
        }
      }

      // 7. ALL VALIDATIONS PASSED - Apply changes atomically
      const newMaxZIndex = state.maxZIndex + 10;

      // Move dragged group
      targetFootprint.forEach((m) => {
        pieces[m.id] = {
          ...pieces[m.id],
          currentRow: m.row,
          currentCol: m.col,
          zIndex: newMaxZIndex,
        };
      });

      // Move and SPLIT victims
      victimMoves.forEach((pos, pId) => {
        pieces[pId] = {
          ...pieces[pId],
          currentRow: pos.row,
          currentCol: pos.col,
          // Split: Assign new unique groupId (use random or logic, here simplified to 'split-TIMESTAMP-ID')
          groupId: `group-split-${Date.now()}-${pId}`,
          zIndex: state.maxZIndex + 1,
        };
      });

      // 7b. FRACTURE CHECK (User Request: "H şeklinde... orta bağlantısı koptuğundan sağ ve sol... ayrılsın")
      // Check if the survivors of affected groups are still connected.
      // If not, split them into separate groups.

      // We only care about groups that HAD victims involved.
      // We need to check the *original* groupIds of the victim pieces.
      const affectedGroupIds = new Set<string>();
      victimPieces.forEach((vp) => affectedGroupIds.add(vp.groupId));

      affectedGroupIds.forEach((groupId) => {
        // Get remaining pieces of this group (those that were NOT moved/split)
        const survivors = Object.values(pieces).filter(
          (p) => p.groupId === groupId,
        );

        if (survivors.length <= 1) return; // 0 or 1 piece is always connected

        // Find connected components using BFS
        const visited = new Set<number>();
        const components: JigsawPiece[][] = [];

        for (const startPiece of survivors) {
          if (visited.has(startPiece.id)) continue;

          const component: JigsawPiece[] = [];
          const queue = [startPiece];
          visited.add(startPiece.id);

          while (queue.length > 0) {
            const curr = queue.shift()!;
            component.push(curr);

            // Find neighbors in the SAME group
            const neighbors = survivors.filter((n) => {
              if (visited.has(n.id)) return false;
              const dRow = Math.abs(n.currentRow - curr.currentRow);
              const dCol = Math.abs(n.currentCol - curr.currentCol);
              // Neighbors checks: strict adjacency (up/down/left/right)
              return dRow + dCol === 1;
            });

            for (const n of neighbors) {
              visited.add(n.id);
              queue.push(n);
            }
          }
          components.push(component);
        }

        // If we found more than 1 component, the group effectively fractured.
        // We leave the first component with the original ID, and assign new IDs to the rest.
        if (components.length > 1) {
          for (let i = 1; i < components.length; i++) {
            const newGroupId = `fracture-${Date.now()}-${groupId}-${i}`;
            components[i].forEach((p) => {
              pieces[p.id] = {
                ...pieces[p.id],
                groupId: newGroupId,
              };
            });
          }
        }
      });

      // 8. Recursive Merge Logic
      let didMerge = false;
      let mergePass = true;

      while (mergePass) {
        mergePass = false;
        const currentGroupMembers = Object.values(pieces).filter(
          (p) => p.groupId === draggedGroupId,
        );

        for (const p of currentGroupMembers) {
          const neighbors = [
            { r: p.currentRow - 1, c: p.currentCol },
            { r: p.currentRow + 1, c: p.currentCol },
            { r: p.currentRow, c: p.currentCol - 1 },
            { r: p.currentRow, c: p.currentCol + 1 },
          ];

          for (const n of neighbors) {
            const neighborPiece = Object.values(pieces).find(
              (np) =>
                np.currentRow === n.r &&
                np.currentCol === n.c &&
                np.groupId !== draggedGroupId,
            );

            if (neighborPiece) {
              const correctRowDiff = neighborPiece.correctRow - p.correctRow;
              const correctColDiff = neighborPiece.correctCol - p.correctCol;
              const actualRowDiff = neighborPiece.currentRow - p.currentRow;
              const actualColDiff = neighborPiece.currentCol - p.currentCol;

              if (
                correctRowDiff === actualRowDiff &&
                correctColDiff === actualColDiff
              ) {
                // MERGE: Absorb neighbor's group into dragged group
                const targetToEatGroupId = neighborPiece.groupId;
                Object.values(pieces).forEach((v) => {
                  if (v.groupId === targetToEatGroupId) {
                    pieces[v.id] = {
                      ...pieces[v.id],
                      groupId: draggedGroupId,
                      zIndex: newMaxZIndex,
                    };
                  }
                });
                didMerge = true;
                mergePass = true; // Continue checking for more merges
              }
            }
          }
        }
      }

      // 9. Win Condition Check
      const uniqueGroups = new Set(Object.values(pieces).map((p) => p.groupId));
      const status = uniqueGroups.size === 1 ? "won" : "playing";

      set({
        pieces,
        maxZIndex: newMaxZIndex,
        status,
      });

      return { merged: didMerge };
    },

    bringGroupToFront: (groupId) => {
      set((state) => {
        if (state.status === "won") return {};
        const newPieces = { ...state.pieces };
        Object.values(newPieces).forEach((p) => {
          if (p.groupId === groupId) {
            newPieces[p.id].zIndex = state.maxZIndex + 1;
          }
        });
        return { pieces: newPieces, maxZIndex: state.maxZIndex + 1 };
      });
    },

    resetGame: () => {
      set(initialState);
    },
  },
}));
