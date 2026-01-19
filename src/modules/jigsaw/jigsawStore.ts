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

export interface JigsawState {
  pieces: Record<number, JigsawPiece>;
  gridSize: GridSize;
  isInitialized: boolean;
  maxZIndex: number;
  status: GameStatus;
  isHapticEnabled: boolean;
  moves: number;
  levelKey: number; // Increments on each new level to trigger flip animation
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
  moves: 0,
  levelKey: 0,
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
// Helper: Build a spatial map for O(1) lookups
const buildPositionMap = (pieces: Record<number, JigsawPiece>) => {
  const map = new Map<string, JigsawPiece>();
  for (const p of Object.values(pieces)) {
    map.set(`${p.currentRow},${p.currentCol}`, p);
  }
  return map;
};

// Helper: Check for adjacency and return mergeable neighbor
const getMergeableNeighbor = (
  p: JigsawPiece,
  posMap: Map<string, JigsawPiece>,
  currentGroupId: string,
) => {
  const neighbors = [
    { r: p.currentRow - 1, c: p.currentCol, dr: -1, dc: 0 },
    { r: p.currentRow + 1, c: p.currentCol, dr: 1, dc: 0 },
    { r: p.currentRow, c: p.currentCol - 1, dr: 0, dc: -1 },
    { r: p.currentRow, c: p.currentCol + 1, dr: 0, dc: 1 },
  ];

  for (const n of neighbors) {
    const neighborPiece = posMap.get(`${n.r},${n.c}`);

    if (neighborPiece && neighborPiece.groupId !== currentGroupId) {
      if (
        neighborPiece.correctRow === p.correctRow + n.dr &&
        neighborPiece.correctCol === p.correctCol + n.dc
      ) {
        return neighborPiece;
      }
    }
  }
  return null;
};

export const useJigsawStore = create<JigsawStore>((set, get) => ({
  ...initialState,

  actions: {
    initializeLevel: (rawGridSize) => {
      console.log("Store: initializeLevel called with:", rawGridSize);

      // Handle both object and legacy number format
      let gridSize = rawGridSize;
      if (typeof rawGridSize === "number") {
        gridSize = { cols: rawGridSize, rows: rawGridSize };
      }

      const totalPieces = gridSize.cols * gridSize.rows;
      console.log("Store: totalPieces to create:", totalPieces);
      const pieces: Record<number, JigsawPiece> = {};

      const allSlots: { row: number; col: number }[] = [];
      for (let r = 0; r < gridSize.rows; r++) {
        for (let c = 0; c < gridSize.cols; c++) {
          allSlots.push({ row: r, col: c });
        }
      }

      const shuffledSlots = shuffle([...allSlots]);

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

      // 4. Initial Auto-Merge (Recursive) with Optimization
      let mergedSomething = true;
      let iteration = 0;
      const MAX_ITERATIONS = 10;

      while (mergedSomething && iteration < MAX_ITERATIONS) {
        mergedSomething = false;
        iteration++;
        const posMap = buildPositionMap(pieces);
        const allPieces = Object.values(pieces);

        for (const p of allPieces) {
          const neighbor = getMergeableNeighbor(p, posMap, p.groupId);

          if (neighbor) {
            const g1 = p.groupId;
            const g2 = neighbor.groupId;

            if (g1 !== g2) {
              // Deterministic Merge: Merge LARGER -> SMALLER ID
              let targetGroupId, sourceGroupId;
              if (g1 < g2) {
                targetGroupId = g1;
                sourceGroupId = g2;
              } else {
                targetGroupId = g2;
                sourceGroupId = g1;
              }

              const sourceMembers = allPieces.filter(
                (m) => m.groupId === sourceGroupId,
              );
              if (sourceMembers.length > 0) {
                sourceMembers.forEach((m) => {
                  pieces[m.id] = { ...pieces[m.id], groupId: targetGroupId };
                });
                mergedSomething = true;
              }
            }
          }
        }
      }
      if (iteration >= MAX_ITERATIONS)
        console.warn("Initialize loop maxed out");

      set({
        ...initialState,
        pieces,
        gridSize,
        isInitialized: true,
        maxZIndex: 1,
        status: "playing",
        levelKey: get().levelKey + 1, // Increment to trigger flip animation
      });
    },

    moveGroupToGrid: (anchorId, targetRow, targetCol) => {
      const state = get();
      if (state.status === "won") return { merged: false };

      const pieces = { ...state.pieces };
      const anchorPiece = pieces[anchorId];
      if (!anchorPiece) return { merged: false };

      let draggedGroupId = anchorPiece.groupId;
      const allPiecesArr = Object.values(pieces);
      const groupPieces = allPiecesArr.filter(
        (p) => p.groupId === draggedGroupId,
      );

      // 1. Calculate Target Footprint
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

      // 3. Optimized Spatial Checks
      // Build quick lookup for ALL pieces
      // We need to check collisions against "everything else"
      const occupiedSlots = new Set<string>();
      allPiecesArr.forEach((p) => {
        if (p.groupId !== draggedGroupId) {
          occupiedSlots.add(`${p.currentRow},${p.currentCol}`);
        }
      });

      const incomingSlots = new Set<string>();
      targetFootprint.forEach((f) => {
        incomingSlots.add(`${f.row},${f.col}`);
      });

      // 5. Find Victim Pieces (Efficiently)
      const victimPieces: JigsawPiece[] = [];
      allPiecesArr.forEach((p) => {
        if (
          p.groupId !== draggedGroupId &&
          incomingSlots.has(`${p.currentRow},${p.currentCol}`)
        ) {
          victimPieces.push(p);
        }
      });

      // 6. SPLIT & SCATTER LOGIC
      const victimMoves: Map<number, { row: number; col: number }> = new Map();
      const simulatedOccupied = new Set(incomingSlots);

      // Add non-involved pieces to simulated occupied
      allPiecesArr.forEach((p) => {
        if (
          p.groupId !== draggedGroupId &&
          !incomingSlots.has(`${p.currentRow},${p.currentCol}`)
        ) {
          // Not in target zone (already handled by incoming) and not victim (will move)
          // Wait, victim pieces ARE currently at `p.currentRow`.
          // If p is NOT victim and NOT dragged group...
          const isVictim = victimPieces.some((v) => v.id === p.id);
          if (!isVictim) {
            simulatedOccupied.add(`${p.currentRow},${p.currentCol}`);
          }
        }
      });
      // Correct logic: simulatedOccupied should contain:
      // 1. Where dragged pieces WILL be (incomingSlots)
      // 2. Where other pieces ARE (that aren't moving)

      const groupsToCheck = new Set<string>();
      groupsToCheck.add(draggedGroupId);

      // Process victims
      for (const p of victimPieces) {
        const shift = findNearestEmptySlotForGroup(
          [p],
          pieces,
          state.gridSize,
          simulatedOccupied,
          p.currentRow,
          p.currentCol,
        );

        if (shift) {
          const newRow = p.currentRow + shift.dr;
          const newCol = p.currentCol + shift.dc;
          victimMoves.set(p.id, { row: newRow, col: newCol });
          simulatedOccupied.add(`${newRow},${newCol}`);
        } else {
          return { merged: false }; // No space for victim
        }
      }

      // 7. Apply Changes (Atomic)
      const newMaxZIndex = state.maxZIndex + 10;

      // Update Dragged Group
      targetFootprint.forEach((m) => {
        pieces[m.id] = {
          ...pieces[m.id],
          currentRow: m.row,
          currentCol: m.col,
          zIndex: newMaxZIndex,
        };
      });

      // Update Victims
      victimMoves.forEach((pos, pId) => {
        const newGroupId = `group-split-${Date.now()}-${pId}`;
        pieces[pId] = {
          ...pieces[pId],
          currentRow: pos.row,
          currentCol: pos.col,
          groupId: newGroupId,
          zIndex: state.maxZIndex + 1,
        };
        groupsToCheck.add(newGroupId);
      });

      // 7b. FRACTURE CHECK (Optimized)
      const affectedGroupIds = new Set<string>();
      victimPieces.forEach((vp) => affectedGroupIds.add(vp.groupId));

      affectedGroupIds.forEach((groupId) => {
        const survivors = Object.values(pieces).filter(
          (p) => p.groupId === groupId,
        );
        if (survivors.length <= 1) return;

        // BFS for connectivity
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

            // Check potential neighbors within survivors
            const neighbors = survivors.filter((n) => {
              if (visited.has(n.id)) return false;
              return (
                Math.abs(n.currentRow - curr.currentRow) +
                  Math.abs(n.currentCol - curr.currentCol) ===
                1
              );
            });

            for (const n of neighbors) {
              visited.add(n.id);
              queue.push(n);
            }
          }
          components.push(component);
        }

        if (components.length > 1) {
          for (let i = 1; i < components.length; i++) {
            const newGroupId = `fracture-${Date.now()}-${groupId}-${i}`;
            components[i].forEach((p) => {
              pieces[p.id] = { ...pieces[p.id], groupId: newGroupId };
            });
          }
        }
      });

      // 8. OPTIMIZED MERGE LOGIC (O(N) Lookups)
      let didMerge = false;
      const processedGroups = new Set<string>();
      const queue = Array.from(groupsToCheck);

      // Re-build "allPiecesArr" and "posMap" because pieces have moved/fractured
      let currentAllPieces = Object.values(pieces);

      // OPTIMIZATION: Incremental posMap updates or rebuild only when dirty?
      // Since map build is fast for <100 pieces, rebuilding is safer for correctness.
      let posMap = buildPositionMap(pieces);

      while (queue.length > 0) {
        const currentGroupId = queue.shift()!;
        if (processedGroups.has(currentGroupId)) continue;

        // Get fresh members from current pieces state
        const members = currentAllPieces.filter(
          (p) => p.groupId === currentGroupId,
        );
        if (members.length === 0) continue;

        let mergedThisRound = false;

        for (const p of members) {
          const neighborPiece = getMergeableNeighbor(p, posMap, currentGroupId);

          if (neighborPiece) {
            const targetGroupId = neighborPiece.groupId;

            // MERGE
            members.forEach((m) => {
              pieces[m.id] = { ...pieces[m.id], groupId: targetGroupId };
            });

            didMerge = true;
            mergedThisRound = true;

            // Refresh data for next iterations
            // Since we modified pieces, we must rebuild list and map to see new groupIds
            currentAllPieces = Object.values(pieces);
            posMap = buildPositionMap(pieces);

            queue.push(targetGroupId);
            break; // Break member loop
          }
        }

        if (!mergedThisRound) {
          processedGroups.add(currentGroupId);
        }
      }

      // 9. Win Condition Check
      const uniqueGroups = new Set(Object.values(pieces).map((p) => p.groupId));
      const status = uniqueGroups.size === 1 ? "won" : "playing";

      // Increment move count
      const newMoves = get().moves + 1;

      set({
        pieces,
        maxZIndex: newMaxZIndex,
        status,
        moves: newMoves,
      });

      return { merged: didMerge };
    },

    bringGroupToFront: (groupId) => {
      set((state) => {
        if (state.status === "won") return {};
        const newPieces = { ...state.pieces };
        let changed = false;

        Object.values(newPieces).forEach((p) => {
          if (p.groupId === groupId) {
            // IMMUTABLE UPDATE
            newPieces[p.id] = { ...p, zIndex: state.maxZIndex + 1 };
            changed = true;
          }
        });

        if (!changed) return {};

        return { pieces: newPieces, maxZIndex: state.maxZIndex + 1 };
      });
    },

    resetGame: () => {
      set(initialState);
    },
  },
}));
