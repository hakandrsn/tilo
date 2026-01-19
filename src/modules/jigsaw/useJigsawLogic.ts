import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useJigsawStore } from "./jigsawStore";

export type DropResult = {
  success: boolean;
  merged: boolean;
  swapped?: boolean;
};

/**
 * Hook to handle grid-based drops with haptic feedback
 */
export const useJigsawLogic = (pieceWidth: number, pieceHeight: number) => {
  const moveGroupToGrid = useJigsawStore(
    (state) => state.actions.moveGroupToGrid,
  );
  const gridSize = useJigsawStore((state) => state.gridSize);

  /**
   * Trigger haptic feedback based on scenario
   */
  const triggerHaptic = useCallback(
    (type: "merge" | "reject" | "move" | "drag") => {
      const isHapticEnabled = useJigsawStore.getState().isHapticEnabled;
      if (!isHapticEnabled) return;

      switch (type) {
        case "merge":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "reject":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "move":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "drag":
          Haptics.selectionAsync();
          break;
      }
    },
    [],
  );

  /**
   * Called when a piece is dropped.
   * Calculates which grid cell (row, col) the piece falls into.
   */
  const attemptDrop = useCallback(
    (
      draggedPieceId: number,
      relativeDropX: number,
      relativeDropY: number,
    ): DropResult => {
      // Calculate target grid coordinates
      const targetCol = Math.round(relativeDropX / pieceWidth);
      const targetRow = Math.round(relativeDropY / pieceHeight);

      // Check if drop is within the Grid Board
      if (
        targetRow >= 0 &&
        targetRow < gridSize.rows &&
        targetCol >= 0 &&
        targetCol < gridSize.cols
      ) {
        // Valid Grid Drop
        const result = moveGroupToGrid(draggedPieceId, targetRow, targetCol);

        if (result.merged) {
          triggerHaptic("merge");
          return { success: true, merged: true };
        } else if (result.merged === false) {
          // Move was accepted but no merge
          triggerHaptic("move");
          return { success: true, merged: false };
        }
      }

      // Move rejected (OOB or collision)
      triggerHaptic("reject");
      return { success: false, merged: false };
    },
    [pieceWidth, pieceHeight, gridSize, moveGroupToGrid, triggerHaptic],
  );

  /**
   * Called when drag starts - light haptic
   */
  const onDragStartHaptic = useCallback(() => {
    triggerHaptic("drag");
  }, [triggerHaptic]);

  return {
    attemptDrop,
    onDragStartHaptic,
    triggerHaptic,
  };
};
