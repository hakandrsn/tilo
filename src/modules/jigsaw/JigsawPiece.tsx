import React, { useEffect, useMemo, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GridSize, ImageSource } from "../../types";
import { JigsawPiece as JigsawPieceType } from "./jigsawStore";

interface JigsawPieceProps {
  piece: JigsawPieceType;
  pieceWidth: number;
  pieceHeight: number;
  imageSource: ImageSource;
  gridSize: GridSize;
  draggedGroupId: SharedValue<string | null>;
  dragTranslation: SharedValue<{ x: number; y: number }>;
  onDragStart: (groupId: string) => void;
  onDragEnd: (pieceId: number, finalX: number, finalY: number) => void;
  // Neighbor connections (for seamless merged piece rendering)
  hasNeighborTop?: boolean;
  hasNeighborBottom?: boolean;
  hasNeighborLeft?: boolean;
  hasNeighborRight?: boolean;
  // Disable gestures when game is won
  isGameOver?: boolean;
}

const DRAG_SENSITIVITY = 1.0;
// User reported "yarı yarıya geride kalıyor" (lagging behind).
// Reverting to 1.0 for direct 1:1 tracking.
const DAMPING_FACTOR = 1.0;

const JigsawPiece: React.FC<JigsawPieceProps> = ({
  piece,
  pieceWidth,
  pieceHeight,
  imageSource,
  gridSize,
  draggedGroupId,
  dragTranslation,
  onDragStart,
  onDragEnd,
  hasNeighborTop = false,
  hasNeighborBottom = false,
  hasNeighborLeft = false,
  hasNeighborRight = false,
  isGameOver = false,
}) => {
  // Target Position (Grid)
  const targetX = piece.currentCol * pieceWidth;
  const targetY = piece.currentRow * pieceHeight;

  // Visual Position Override (for animation compensation)
  // We use this to "offset" the piece when the grid position changes,
  // so it doesn't jump, then handle the slide.
  const visualOffsetX = useSharedValue(0);
  const visualOffsetY = useSharedValue(0);

  // Track previous target to detect jumps
  const prevTarget = useRef({ x: targetX, y: targetY });

  useEffect(() => {
    // Detect Jump
    const diffX = targetX - prevTarget.current.x;
    const diffY = targetY - prevTarget.current.y;

    if (Math.abs(diffX) > 0.1 || Math.abs(diffY) > 0.1) {
      // The grid position moved.
      // We want to visually stay where we were (prevTarget).
      // current visual = (targetX) + visualOffset + (dragTranslation if dragging).
      // We want: (targetX + newOffset) == (prevTarget + oldOffset).
      // newOffset = prevTarget - targetX + oldOffset.
      // simpler: newOffset = -diffX + oldOffset.

      visualOffsetX.value = visualOffsetX.value - diffX;
      visualOffsetY.value = visualOffsetY.value - diffY;

      // Now animate the offset back to 0 (sliding the piece to the new target)
      // "asla render olmamalı" -> smooth transitions
      visualOffsetX.value = withTiming(0, { duration: 300 });
      visualOffsetY.value = withTiming(0, { duration: 300 });
    }

    prevTarget.current = { x: targetX, y: targetY };
  }, [targetX, targetY]);

  // Fix: Detect Merge Jump
  // When a stationary piece gets merged into the dragged group, it suddenly inherits 'dragTranslation'.
  // We must compensate for this jump so it feels like it "picked up" smoothly rather than teleporting.
  const prevGroupId = useRef(piece.groupId);
  useEffect(() => {
    // If our groupId changed...
    if (piece.groupId !== prevGroupId.current) {
      // ...and we are now part of the dragged group
      if (draggedGroupId.value === piece.groupId) {
        // We just got merged INTO the active drag!
        // Our visual position is about to jump by `dragTranslation`.
        // We counteract this by subtracting `dragTranslation` from our visual offset.
        visualOffsetX.value -= dragTranslation.value.x;
        visualOffsetY.value -= dragTranslation.value.y;

        // Then slide to the correct relative position (snap)
        visualOffsetX.value = withTiming(0, { duration: 300 });
        visualOffsetY.value = withTiming(0, { duration: 300 });
      }
    }
    prevGroupId.current = piece.groupId;
  }, [piece.groupId]);

  // Image Slice Calculation
  const { top, left } = useMemo(
    () => ({
      top: -Math.floor(piece.id / gridSize.cols) * pieceHeight,
      left: -(piece.id % gridSize.cols) * pieceWidth,
    }),
    [piece.id, gridSize, pieceWidth, pieceHeight],
  );

  // Gesture
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isGameOver) // Disable when puzzle complete
        .onStart(() => {
          runOnJS(onDragStart)(piece.groupId);
          draggedGroupId.value = piece.groupId;
          dragTranslation.value = { x: 0, y: 0 };
        })
        .onUpdate((e) => {
          // Applying damping factor to make it "slower"
          dragTranslation.value = {
            x: e.translationX * DAMPING_FACTOR,
            y: e.translationY * DAMPING_FACTOR,
          };
        })
        .onEnd((e) => {
          // Must incorporate damping in the final position calculation
          const finalX = targetX + e.translationX * DAMPING_FACTOR;
          const finalY = targetY + e.translationY * DAMPING_FACTOR;

          runOnJS(onDragEnd)(piece.id, finalX, finalY);

          // Smoothly animate dragTranslation to 0 (snap back/hand off)
          dragTranslation.value = withTiming(
            { x: 0, y: 0 },
            { duration: 250 }, // Smoother animation
            (finished) => {
              if (finished) {
                draggedGroupId.value = null;
              }
            },
          );
        }),
    [
      piece.id,
      piece.groupId,
      targetX,
      targetY,
      onDragStart,
      onDragEnd,
      isGameOver,
      pieceWidth, // Added dependency
      pieceHeight, // Added dependency
    ],
  );

  const PIECE_GAP = 0.3; // Reduced gap per user request
  const DRAG_SCALE = 1.05; // Scale up when dragging

  const style = useAnimatedStyle(() => {
    const isDraggingMe = draggedGroupId.value === piece.groupId;
    const tx = isDraggingMe ? dragTranslation.value.x : 0;
    const ty = isDraggingMe ? dragTranslation.value.y : 0;
    const scale = isDraggingMe ? DRAG_SCALE : 1;

    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: pieceWidth,
      height: pieceHeight,
      transform: [
        { translateX: targetX + visualOffsetX.value + tx },
        { translateY: targetY + visualOffsetY.value + ty },
        { scale },
      ],
      zIndex: isDraggingMe ? 9999 : piece.zIndex,
    };
  });

  // Animated expansion values for smooth merge transition
  const expandTop = useSharedValue(hasNeighborTop ? PIECE_GAP : 0);
  const expandBottom = useSharedValue(hasNeighborBottom ? PIECE_GAP : 0);
  const expandLeft = useSharedValue(hasNeighborLeft ? PIECE_GAP : 0);
  const expandRight = useSharedValue(hasNeighborRight ? PIECE_GAP : 0);

  // ... (useEffect for expand values remains same, skipped in replacement context if possible or need to include)
  // Wait, I need to match the target content exactly. The block includes definitions up to `expandRight`.
  // I will just replace the `style` definition and `PIECE_GAP` definition block.
  // BUT I also need to update `innerStyle` which is further down passed the `useEffect`.
  // I should use `multi_replace` or two calls. Let's use `multi_replace` for JigsawPiece as well.

  // Actually, I can replace the whole `PIECE_GAP` ... `expandRight` block first.

  // And then replace `innerStyle` block.

  // Merge scale animation (pop effect)
  const mergeScale = useSharedValue(1);
  const prevNeighborCount = useRef(
    (hasNeighborTop ? 1 : 0) +
      (hasNeighborBottom ? 1 : 0) +
      (hasNeighborLeft ? 1 : 0) +
      (hasNeighborRight ? 1 : 0),
  );

  // PERFORMANCE: Consolidated single useEffect for all expansion animations
  useEffect(() => {
    const MERGE_DURATION = 200;
    expandTop.value = withTiming(hasNeighborTop ? PIECE_GAP : 0, {
      duration: MERGE_DURATION,
    });
    expandBottom.value = withTiming(hasNeighborBottom ? PIECE_GAP : 0, {
      duration: MERGE_DURATION,
    });
    expandLeft.value = withTiming(hasNeighborLeft ? PIECE_GAP : 0, {
      duration: MERGE_DURATION,
    });
    expandRight.value = withTiming(hasNeighborRight ? PIECE_GAP : 0, {
      duration: MERGE_DURATION,
    });

    // Check if we GAINED neighbors (merge happened)
    const currentCount =
      (hasNeighborTop ? 1 : 0) +
      (hasNeighborBottom ? 1 : 0) +
      (hasNeighborLeft ? 1 : 0) +
      (hasNeighborRight ? 1 : 0);
    if (currentCount > prevNeighborCount.current) {
      // Pop animation: scale up then back to normal
      mergeScale.value = withTiming(1.08, { duration: 100 }, () => {
        mergeScale.value = withTiming(1, { duration: 150 });
      });
    }
    prevNeighborCount.current = currentCount;
  }, [hasNeighborTop, hasNeighborBottom, hasNeighborLeft, hasNeighborRight]);

  // SINGLE CONTAINER (White Border 2, Radius 4)
  const pieceStyle = useAnimatedStyle(() => {
    return {
      position: "absolute" as const,
      top: PIECE_GAP - expandTop.value,
      left: PIECE_GAP - expandLeft.value,
      width: pieceWidth - PIECE_GAP * 2 + expandLeft.value + expandRight.value,
      height:
        pieceHeight - PIECE_GAP * 2 + expandTop.value + expandBottom.value,

      borderTopWidth: expandTop.value > 0 ? 0 : 2,
      borderBottomWidth: expandBottom.value > 0 ? 0 : 2,
      borderLeftWidth: expandLeft.value > 0 ? 0 : 2,
      borderRightWidth: expandRight.value > 0 ? 0 : 2,
      borderColor: "#ffffff",

      // Smart Corner Radius: Only round corners that are NOT connected
      borderTopLeftRadius: hasNeighborTop || hasNeighborLeft ? 0 : 4,
      borderTopRightRadius: hasNeighborTop || hasNeighborRight ? 0 : 4,
      borderBottomLeftRadius: hasNeighborBottom || hasNeighborLeft ? 0 : 4,
      borderBottomRightRadius: hasNeighborBottom || hasNeighborRight ? 0 : 4,

      overflow: "hidden" as const,
      transform: [{ scale: mergeScale.value }],
    };
  });

  // Animated style for image offset
  const imageStyle = useAnimatedStyle(() => {
    return {
      width: gridSize.cols * pieceWidth,
      height: gridSize.rows * pieceHeight,
      transform: [
        // Subtract PIECE_GAP to compensate for the container's inset padding
        { translateX: left - PIECE_GAP - expandLeft.value },
        { translateY: top - PIECE_GAP - expandTop.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>
        <Animated.View style={pieceStyle}>
          <Animated.Image source={imageSource} style={imageStyle} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

export default React.memo(JigsawPiece);
