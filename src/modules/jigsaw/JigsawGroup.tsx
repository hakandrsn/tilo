import { Image } from "expo-image";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GridSize, ImageSource } from "../../types";
import { calculateImageOffset } from "../../utils/puzzleLogic";
import { JigsawPiece as JigsawPieceType, useJigsawStore } from "./jigsawStore";
import { useJigsawLogic } from "./useJigsawLogic";

interface JigsawGroupProps {
  groupId: string;
  pieces: JigsawPieceType[];
  pieceSize: number;
  imageSource: ImageSource;
  gridSize: GridSize;
  boardWidth: number;
}

const JigsawGroup: React.FC<JigsawGroupProps> = ({
  groupId,
  pieces,
  pieceSize,
  imageSource,
  gridSize,
  boardWidth,
}) => {
  const bringGroupToFront = useJigsawStore(
    (state) => state.actions.bringGroupToFront,
  );
  const status = useJigsawStore((state) => state.status);
  const { attemptDrop } = useJigsawLogic(pieceSize, pieceSize);

  // Group State
  const isLocked = pieces[0]?.isLocked ?? false;
  const isWon = status === "won";

  // Calculate Group Bounding Box
  const minCol = pieces.length
    ? Math.min(...pieces.map((p) => p.currentCol))
    : 0;
  const minRow = pieces.length
    ? Math.min(...pieces.map((p) => p.currentRow))
    : 0;

  // Initial Position Logic (Always on Grid now)
  const initialX = minCol * pieceSize;
  const initialY = minRow * pieceSize;

  const width = pieces.length
    ? (Math.max(...pieces.map((p) => p.currentCol)) - minCol + 1) * pieceSize
    : pieceSize;
  const height = pieces.length
    ? (Math.max(...pieces.map((p) => p.currentRow)) - minRow + 1) * pieceSize
    : pieceSize;

  // Shared Values
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);
  const zIndexLocal = useSharedValue(pieces[0]?.zIndex ?? 1);
  const glowOpacity = useSharedValue(0);

  // Coordinate Compensation State
  const prevInitialPos = React.useRef({ x: initialX, y: initialY });

  // Sync with Store Updates (and compensate for jumps)
  useEffect(() => {
    if (!isDragging.value) {
      // Check for Coordinate Jump (e.g. Merge occurred, bounding box changed)
      const diffX = initialX - prevInitialPos.current.x;
      const diffY = initialY - prevInitialPos.current.y;

      // If there is a significant jump (due to bbox change from merge or push)
      // We compensate so the piece stays visually in place, then slides to new target.
      if (Math.abs(diffX) > 0.1 || Math.abs(diffY) > 0.1) {
        // Keep current visual position by reversing the data jump
        translateX.value = translateX.value + diffX;
        translateY.value = translateY.value + diffY;
      }

      // Animate to target (new data position) smoothly and quickly
      translateX.value = withTiming(initialX, { duration: 150 });
      translateY.value = withTiming(initialY, { duration: 150 });

      prevInitialPos.current = { x: initialX, y: initialY };

      if (!isLocked) {
        zIndexLocal.value = pieces[0]?.zIndex ?? 1;
      }
    }
  }, [initialX, initialY, pieces[0]?.zIndex, isLocked]);

  // Win Animation
  useEffect(() => {
    if (isWon) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 }),
        ),
        -1,
        true,
      );
    }
  }, [isWon]);

  // Robust Gesture with SharedValues
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isLocked && !isWon)
        .onStart(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;

          isDragging.value = true;
          scale.value = withSpring(1.05);
          zIndexLocal.value = 9999;

          // runOnJS fix
          runOnJS(bringGroupToFront)(groupId);
        })
        .onUpdate((event) => {
          translateX.value = startX.value + event.translationX;
          translateY.value = startY.value + event.translationY;
        })
        .onEnd((event) => {
          const finalX = startX.value + event.translationX;
          const finalY = startY.value + event.translationY;

          const anchor = pieces[0];
          const anchorRelX = (anchor.currentCol - minCol) * pieceSize;
          const anchorRelY = (anchor.currentRow - minRow) * pieceSize;

          runOnJS(attemptDrop)(
            anchor.id,
            finalX + anchorRelX,
            finalY + anchorRelY,
          );

          isDragging.value = false;
          scale.value = withSpring(1);
        }),
    [
      groupId,
      isLocked,
      isWon,
      minCol,
      minRow,
      pieces, // Added dependency
      pieceSize,
      attemptDrop,
      bringGroupToFront,
    ],
  );

  const groupStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: width,
    height: height,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndexLocal.value,
    elevation: zIndexLocal.value > 100 ? 50 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDragging.value ? 0.3 : 0,
    shadowRadius: 4,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 4,
    borderColor: "#fbbf24", // Golden glow
    borderRadius: 8,
    opacity: glowOpacity.value,
  }));

  // Border Rendering Logic
  // Only show internal borders if NOT merged? No, showing borders helps see individual pieces.
  // But merged groups should look unified.
  // Let's keep the previous logic: render individual pieces, check neighbors for borders.
  const isMerged = pieces.length > 1;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={groupStyle} pointerEvents="box-none">
        {/* Win Glow Overlay */}
        {isWon && <Animated.View style={glowStyle} />}

        {pieces.map((piece) => {
          const relLeft = (piece.currentCol - minCol) * pieceSize;
          const relTop = (piece.currentRow - minRow) * pieceSize;

          const { top, left } = calculateImageOffset(
            piece.id,
            gridSize,
            pieceSize,
          );

          // Neighbor Logic for Borders
          const hasTop = pieces.some(
            (p) =>
              p.currentRow === piece.currentRow - 1 &&
              p.currentCol === piece.currentCol,
          );
          const hasBottom = pieces.some(
            (p) =>
              p.currentRow === piece.currentRow + 1 &&
              p.currentCol === piece.currentCol,
          );
          const hasLeft = pieces.some(
            (p) =>
              p.currentRow === piece.currentRow &&
              p.currentCol === piece.currentCol - 1,
          );
          const hasRight = pieces.some(
            (p) =>
              p.currentRow === piece.currentRow &&
              p.currentCol === piece.currentCol + 1,
          );

          return (
            <View
              key={piece.id}
              style={{
                position: "absolute",
                left: relLeft,
                top: relTop,
                width: pieceSize,
                height: pieceSize,
                overflow: "hidden", // Clip image
              }}
            >
              <Image
                source={imageSource}
                style={{
                  width: gridSize.cols * pieceSize,
                  height: gridSize.rows * pieceSize,
                  transform: [{ translateX: left }, { translateY: top }],
                }}
              />

              {/* Highlight Locked Pieces (Magnet) */}
              {isLocked && !isWon && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(251, 191, 36, 0.2)",
                  }}
                />
              )}

              {/* Borders */}
              {!isWon && (
                <>
                  {!hasTop && (
                    <View
                      style={[
                        styles.borderTop,
                        isMerged && styles.borderMerged,
                      ]}
                    />
                  )}
                  {!hasBottom && (
                    <View
                      style={[
                        styles.borderBottom,
                        isMerged && styles.borderMerged,
                      ]}
                    />
                  )}
                  {!hasLeft && (
                    <View
                      style={[
                        styles.borderLeft,
                        isMerged && styles.borderMerged,
                      ]}
                    />
                  )}
                  {!hasRight && (
                    <View
                      style={[
                        styles.borderRight,
                        isMerged && styles.borderMerged,
                      ]}
                    />
                  )}
                </>
              )}
            </View>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  borderTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  borderBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  borderLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  borderRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  borderMerged: {
    backgroundColor: "#fbbf24",
    height: 2, // Thicker for external
    width: 2,
  },
});

export default JigsawGroup;
