import { Image } from "expo-image";
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { GridSize, ImageSource } from "../../types";
import { JigsawPiece as JigsawPieceType, useJigsawStore } from "./jigsawStore";

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
  hasNeighborTop?: boolean;
  hasNeighborBottom?: boolean;
  hasNeighborLeft?: boolean;
  hasNeighborRight?: boolean;
}

const BORDER_WIDTH = 2;
const BORDER_COLOR = "#fafafa";
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
}) => {
  const status = useJigsawStore((state) => state.status);
  const gameOver = status === "won";

  const targetX = piece.currentCol * pieceWidth;
  const targetY = piece.currentRow * pieceHeight;

  const visualOffsetX = useSharedValue(0);
  const visualOffsetY = useSharedValue(0);
  const prevTarget = useRef({ x: targetX, y: targetY });

  // Flip Animation - starts face down (180), flips to face up (0)
  const flipRotation = useSharedValue(180);

  useEffect(() => {
    // Staggered flip animation
    const INITIAL_DELAY = 500;
    const delay = INITIAL_DELAY + piece.id * 40;
    flipRotation.value = withDelay(delay, withTiming(0, { duration: 600 }));
  }, [piece.id]);

  useLayoutEffect(() => {
    const diffX = targetX - prevTarget.current.x;
    const diffY = targetY - prevTarget.current.y;

    if (Math.abs(diffX) > 0.1 || Math.abs(diffY) > 0.1) {
      visualOffsetX.value = visualOffsetX.value - diffX;
      visualOffsetY.value = visualOffsetY.value - diffY;
      visualOffsetX.value = withTiming(0, { duration: 300 });
      visualOffsetY.value = withTiming(0, { duration: 300 });
    }

    prevTarget.current = { x: targetX, y: targetY };
  }, [targetX, targetY]);

  const prevGroupId = useRef(piece.groupId);
  useEffect(() => {
    if (piece.groupId !== prevGroupId.current) {
      if (draggedGroupId.value === piece.groupId) {
        visualOffsetX.value -= dragTranslation.value.x;
        visualOffsetY.value -= dragTranslation.value.y;
        visualOffsetX.value = withTiming(0, { duration: 300 });
        visualOffsetY.value = withTiming(0, { duration: 300 });
      }
    }
    prevGroupId.current = piece.groupId;
  }, [piece.groupId]);

  // Image offset within the clipped piece
  const { top, left } = useMemo(
    () => ({
      top: -Math.floor(piece.id / gridSize.cols) * pieceHeight,
      left: -(piece.id % gridSize.cols) * pieceWidth,
    }),
    [piece.id, gridSize, pieceWidth, pieceHeight],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!gameOver)
        .onStart(() => {
          runOnJS(onDragStart)(piece.groupId);
          draggedGroupId.value = piece.groupId;
          dragTranslation.value = { x: 0, y: 0 };
        })
        .onUpdate((e) => {
          dragTranslation.value = {
            x: e.translationX * DAMPING_FACTOR,
            y: e.translationY * DAMPING_FACTOR,
          };
        })
        .onEnd((e) => {
          const finalX = targetX + e.translationX * DAMPING_FACTOR;
          const finalY = targetY + e.translationY * DAMPING_FACTOR;
          runOnJS(onDragEnd)(piece.id, finalX, finalY);
          draggedGroupId.value = null;
          dragTranslation.value = { x: 0, y: 0 };
        }),
    [
      piece.id,
      piece.groupId,
      targetX,
      targetY,
      gameOver,
      onDragStart,
      onDragEnd,
    ],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const isBeingDragged = draggedGroupId.value === piece.groupId;
    const groupDragX = isBeingDragged ? dragTranslation.value.x : 0;
    const groupDragY = isBeingDragged ? dragTranslation.value.y : 0;

    return {
      transform: [
        { translateX: targetX + visualOffsetX.value + groupDragX },
        { translateY: targetY + visualOffsetY.value + groupDragY },
        { perspective: 1000 },
        { rotateY: `${flipRotation.value}deg` },
      ],
      zIndex: isBeingDragged ? 9999 : piece.zIndex,
    };
  });

  // Use full piece dimensions (GAP=0 means no size reduction needed)
  // We add a small overlap (bleed) to prevent sub-pixel gaps between pieces
  const displayWidth = pieceWidth + 1;
  const displayHeight = pieceHeight + 1;

  // Animated opacity based on flip rotation (works on Android, unlike backfaceVisibility)
  const backStyle = useAnimatedStyle(() => ({
    opacity: flipRotation.value >= 90 ? 1 : 0,
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flipRotation.value < 90 ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: displayWidth,
            height: displayHeight,
            overflow: "hidden",
            // Borders moved to BorderOverlay
          },
          animatedStyle,
        ]}
      >
        {/* Piece Back - Card back image */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
            },
            backStyle,
          ]}
        >
          <Image
            source={require("../../assets/images/card-bg.jpeg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* Piece Front (Image) */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
            },
            frontStyle,
          ]}
        >
          <Image
            source={imageSource}
            style={{
              width: gridSize.cols * pieceWidth,
              height: gridSize.rows * pieceHeight,
              transform: [{ translateX: left }, { translateY: top }],
            }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* Border Overlay - Draws borders ON TOP of image without affecting layout */}
        <React.Fragment>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                ...StyleSheet.absoluteFillObject,
                zIndex: 10,
                borderTopWidth: hasNeighborTop ? 0 : BORDER_WIDTH,
                borderBottomWidth: hasNeighborBottom ? 0 : BORDER_WIDTH,
                borderLeftWidth: hasNeighborLeft ? 0 : BORDER_WIDTH,
                borderRightWidth: hasNeighborRight ? 0 : BORDER_WIDTH,
                borderColor: BORDER_COLOR,
              },
              // We reuse backStyle/frontStyle logic if we want borders to fade only when
              // a specific side is showing?
              // Actually original code had borders on the container so they were always visible
              // (flipped with the container).
              // So no extra opacity animation needed here, it inherits container's transform.
            ]}
          />
        </React.Fragment>
      </Animated.View>
    </GestureDetector>
  );
};

export default React.memo(JigsawPiece);
