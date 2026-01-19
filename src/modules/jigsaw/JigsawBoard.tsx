import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { GridSize, ImageSource } from "../../types";
import JigsawPiece from "./JigsawPiece";
import { JigsawPiece as JigsawPieceType, useJigsawStore } from "./jigsawStore";
import { useJigsawLogic } from "./useJigsawLogic";

interface JigsawBoardProps {
  gridSize: GridSize;
  imageSource: ImageSource;
  boardWidth: number;
  boardHeight: number;
}

const BOARD_PADDING = 32; // Increased padding
const MAX_BOARD_WIDTH = 1080;
const MAX_BOARD_HEIGHT = 1440;

const JigsawBoard: React.FC<JigsawBoardProps> = ({
  gridSize,
  imageSource,
  boardWidth,
  boardHeight,
}) => {
  const pieces = useJigsawStore((state) => state.pieces);
  const initializeLevel = useJigsawStore(
    (state) => state.actions.initializeLevel,
  );
  const isInitialized = useJigsawStore((state) => state.isInitialized);
  const bringGroupToFront = useJigsawStore((s) => s.actions.bringGroupToFront);

  // Calculate strict piece size with max constraints (1080x1440)
  const {
    pieceWidth,
    pieceHeight,
    totalGridHeight,
    topOffset,
    totalGridWidth,
    leftOffset,
  } = useMemo(() => {
    // Apply max constraints
    const constrainedWidth = Math.min(boardWidth, MAX_BOARD_WIDTH);
    const constrainedHeight = Math.min(boardHeight, MAX_BOARD_HEIGHT);

    const availableWidth = constrainedWidth - BOARD_PADDING * 2;
    const availableHeight = constrainedHeight - BOARD_PADDING * 2;

    // Desired Aspect Ratio: 3:4 (0.75) -> Width / Height = 0.75
    // pieceHeight = pieceWidth / 0.75 = pieceWidth * 1.333

    // 1. Calculate max possible width based on available width
    const maxPieceW = availableWidth / gridSize.cols;

    // 2. Calculate corresponding height for that width
    const suggestedPieceH = maxPieceW * (4 / 3);

    // 3. Check if this height fits in available height
    let pieceW, pieceH;

    if (suggestedPieceH * gridSize.rows <= availableHeight) {
      // Fits! Use these dims
      pieceW = Math.floor(maxPieceW);
      pieceH = Math.floor(suggestedPieceH);
    } else {
      // Too tall! Constrain by height instead
      const maxPieceH = availableHeight / gridSize.rows;
      pieceH = Math.floor(maxPieceH);
      pieceW = Math.floor(maxPieceH * (3 / 4));
    }

    const tGridHeight = pieceH * gridSize.rows;
    const tGridWidth = pieceW * gridSize.cols;

    // Center the grid within the board
    const tOffset = Math.floor(Math.max(0, (boardHeight - tGridHeight) / 2));
    const lOffset = Math.floor(Math.max(0, (boardWidth - tGridWidth) / 2));

    return {
      pieceWidth: pieceW,
      pieceHeight: pieceH,
      totalGridHeight: tGridHeight,
      totalGridWidth: tGridWidth,
      topOffset: tOffset,
      leftOffset: lOffset,
    };
  }, [boardWidth, boardHeight, gridSize]);

  useEffect(() => {
    initializeLevel(gridSize);
  }, [gridSize]);

  // Signal System for Group Dragging
  const draggedGroupId = useSharedValue<string | null>(null);
  const dragTranslation = useSharedValue({ x: 0, y: 0 });

  const { attemptDrop } = useJigsawLogic(pieceWidth, pieceHeight);

  // PERFORMANCE: Stable callbacks with useCallback
  const onDragStart = useCallback(
    (groupId: string) => {
      bringGroupToFront(groupId);
    },
    [bringGroupToFront],
  );

  const onDragEnd = useCallback(
    (pieceId: number, finalX: number, finalY: number) => {
      attemptDrop(pieceId, finalX, finalY);
    },
    [attemptDrop],
  );

  // Render Flat List of Pieces
  const pieceList = useMemo(() => Object.values(pieces), [pieces]);

  // PERFORMANCE: O(1) position lookup map instead of O(n) .some() calls
  const positionMap = useMemo(() => {
    const map = new Map<string, JigsawPieceType>();
    pieceList.forEach((p) => map.set(`${p.currentRow},${p.currentCol}`, p));
    return map;
  }, [pieceList]);

  // PERFORMANCE: Pre-calculate neighbor connections for all pieces
  const neighborConnections = useMemo(() => {
    const connections: Record<
      number,
      { top: boolean; bottom: boolean; left: boolean; right: boolean }
    > = {};
    pieceList.forEach((piece) => {
      const topNeighbor = positionMap.get(
        `${piece.currentRow - 1},${piece.currentCol}`,
      );
      const bottomNeighbor = positionMap.get(
        `${piece.currentRow + 1},${piece.currentCol}`,
      );
      const leftNeighbor = positionMap.get(
        `${piece.currentRow},${piece.currentCol - 1}`,
      );
      const rightNeighbor = positionMap.get(
        `${piece.currentRow},${piece.currentCol + 1}`,
      );
      connections[piece.id] = {
        top: topNeighbor?.groupId === piece.groupId,
        bottom: bottomNeighbor?.groupId === piece.groupId,
        left: leftNeighbor?.groupId === piece.groupId,
        right: rightNeighbor?.groupId === piece.groupId,
      };
    });
    return connections;
  }, [pieceList, positionMap]);

  // PERFORMANCE: Memoize grid line arrays
  const verticalLines = useMemo(
    () => Array.from({ length: gridSize.cols + 1 }, (_, i) => i),
    [gridSize.cols],
  );
  const horizontalLines = useMemo(
    () => Array.from({ length: gridSize.rows + 1 }, (_, i) => i),
    [gridSize.rows],
  );

  if (!isInitialized) {
    return <View style={styles.container} />;
  }

  return (
    <View
      style={[
        styles.container,
        { width: boardWidth, height: boardHeight + 200 },
      ]}
    >
      {/* Ghost Image on Board */}
      <View
        style={{
          position: "absolute",
          top: topOffset,
          left: leftOffset,
          width: totalGridWidth,
          height: totalGridHeight,
          opacity: 0.15,
        }}
      >
        <Image
          source={imageSource}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      <View
        style={{
          marginTop: topOffset,
          marginLeft: leftOffset,
          width: totalGridWidth,
          height: totalGridHeight,
          zIndex: 1,
        }}
      >
        {/* Background Grid Lines Removed as per user request */}

        {/* Render Flat Pieces - O(1) neighbor lookup */}
        {pieceList.map((piece) => {
          const conn = neighborConnections[piece.id];
          return (
            <JigsawPiece
              key={piece.id}
              piece={piece}
              pieceWidth={pieceWidth}
              pieceHeight={pieceHeight}
              imageSource={imageSource}
              gridSize={gridSize}
              draggedGroupId={draggedGroupId}
              dragTranslation={dragTranslation}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              hasNeighborTop={conn.top}
              hasNeighborBottom={conn.bottom}
              hasNeighborLeft={conn.left}
              hasNeighborRight={conn.right}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    overflow: "visible",
  },
  // Grid styles removed
});

export default JigsawBoard;
