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

  // Visual Position Override (Restored for smoothness)
  // We use this to "offset" the piece when the grid position changes,
  // so it doesn't jump, then handle the slide.
  const visualOffsetX = useSharedValue(0);
  const visualOffsetY = useSharedValue(0);

  // Track previous target to detect jumps
  const prevTarget = useRef({ x: targetX, y: targetY });

  useEffect(() => {
    // Detect Grid Jump
    const diffX = targetX - prevTarget.current.x;
    const diffY = targetY - prevTarget.current.y;

    if (Math.abs(diffX) > 0.1 || Math.abs(diffY) > 0.1) {
      // The grid position moved.
      // We visually stay where we were by subtracting the diff
      visualOffsetX.value = visualOffsetX.value - diffX;
      visualOffsetY.value = visualOffsetY.value - diffY;

      // Then slide smoothly to 0
      visualOffsetX.value = withTiming(0, { duration: 300 });
      visualOffsetY.value = withTiming(0, { duration: 300 });
    }

    prevTarget.current = { x: targetX, y: targetY };
  }, [targetX, targetY]);

  // Merge Jump Compensation
  // When merged into a dragging group, prevent visual teleport
  const prevGroupId = useRef(piece.groupId);
  useEffect(() => {
    if (piece.groupId !== prevGroupId.current) {
      if (draggedGroupId.value === piece.groupId) {
        // We joined the drag group. Compensate for the dragTranslation inheritance.
        visualOffsetX.value -= dragTranslation.value.x;
        visualOffsetY.value -= dragTranslation.value.y;

        // Slide into place
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
      pieceWidth,
      pieceHeight,
    ],
  );

  const PIECE_GAP = isGameOver ? 0 : 0.3; // Remove gap when won
  const DRAG_SCALE = 1.05;

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
        { scale }, // Only scale when dragging, not on merge
      ],
      zIndex: isDraggingMe ? 9999 : piece.zIndex,
    };
  });

  // Animated expansion values
  const expandTop = useSharedValue(hasNeighborTop ? PIECE_GAP : 0);
  const expandBottom = useSharedValue(hasNeighborBottom ? PIECE_GAP : 0);
  const expandLeft = useSharedValue(hasNeighborLeft ? PIECE_GAP : 0);
  const expandRight = useSharedValue(hasNeighborRight ? PIECE_GAP : 0);

  const mergeScale = useSharedValue(1); // Standard scale, no bounce

  // Single Effect for Expansion Animations
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

    // NO mergeScale bounce animation here.
  }, [
    hasNeighborTop,
    hasNeighborBottom,
    hasNeighborLeft,
    hasNeighborRight,
    PIECE_GAP,
  ]);

  // SINGLE CONTAINER
  const pieceStyle = useAnimatedStyle(() => {
    // Use derived value or just re-calc since isGameOver triggers re-render
    const borderW = isGameOver ? 0 : 2;

    return {
      position: "absolute" as const,
      top: PIECE_GAP - expandTop.value,
      left: PIECE_GAP - expandLeft.value,
      width: pieceWidth - PIECE_GAP * 2 + expandLeft.value + expandRight.value,
      height:
        pieceHeight - PIECE_GAP * 2 + expandTop.value + expandBottom.value,

      borderTopWidth: expandTop.value > 0 ? 0 : borderW,
      borderBottomWidth: expandBottom.value > 0 ? 0 : borderW,
      borderLeftWidth: expandLeft.value > 0 ? 0 : borderW,
      borderRightWidth: expandRight.value > 0 ? 0 : borderW,
      borderColor: "#ffffff",

      borderTopLeftRadius:
        hasNeighborTop || hasNeighborLeft || isGameOver ? 0 : 4,
      borderTopRightRadius:
        hasNeighborTop || hasNeighborRight || isGameOver ? 0 : 4,
      borderBottomLeftRadius:
        hasNeighborBottom || hasNeighborLeft || isGameOver ? 0 : 4,
      borderBottomRightRadius:
        hasNeighborBottom || hasNeighborRight || isGameOver ? 0 : 4,

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
