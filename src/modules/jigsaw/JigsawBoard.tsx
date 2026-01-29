import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
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

const BOARD_PADDING = 32;
const MAX_BOARD_WIDTH = 1080;
const MAX_BOARD_HEIGHT = 1440;

const JigsawBoard: React.FC<JigsawBoardProps> = ({
  gridSize,
  imageSource,
  boardWidth,
  boardHeight,
}) => {
  const pieces = useJigsawStore((state) => state.pieces);
  const isInitialized = useJigsawStore((state) => state.isInitialized);

  // Calculate piece dimensions
  const {
    pieceWidth,
    pieceHeight,
    totalGridHeight,
    topOffset,
    totalGridWidth,
    leftOffset,
  } = useMemo(() => {
    const constrainedWidth = Math.min(boardWidth, MAX_BOARD_WIDTH);
    const constrainedHeight = Math.min(boardHeight, MAX_BOARD_HEIGHT);
    const availableWidth = constrainedWidth - BOARD_PADDING * 2;
    const availableHeight = constrainedHeight - BOARD_PADDING * 2;
    const maxPieceW = availableWidth / gridSize.cols;
    const suggestedPieceH = maxPieceW * (4 / 3);

    let pieceW, pieceH;
    if (suggestedPieceH * gridSize.rows <= availableHeight) {
      pieceW = maxPieceW;
      pieceH = suggestedPieceH;
    } else {
      const maxPieceH = availableHeight / gridSize.rows;
      pieceH = maxPieceH;
      pieceW = maxPieceH * (3 / 4);
    }

    const tGridHeight = pieceH * gridSize.rows;
    const tGridWidth = pieceW * gridSize.cols;
    const tOffset = Math.max(0, (boardHeight - tGridHeight) / 2);
    const lOffset = Math.max(0, (boardWidth - tGridWidth) / 2);

    return {
      pieceWidth: pieceW,
      pieceHeight: pieceH,
      totalGridHeight: tGridHeight,
      totalGridWidth: tGridWidth,
      topOffset: tOffset,
      leftOffset: lOffset,
    };
  }, [boardWidth, boardHeight, gridSize]);

  // Memoize piece list
  const pieceList = useMemo(() => Object.values(pieces), [pieces]);

  // O(1) position lookup for neighbor calculation
  const positionMap = useMemo(() => {
    const map = new Map<string, JigsawPieceType>();
    pieceList.forEach((p) => map.set(`${p.currentRow},${p.currentCol}`, p));
    return map;
  }, [pieceList]);

  // Pre-calculate neighbor connections
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

  // Signal System for Group Dragging
  const draggedGroupId = useSharedValue<string | null>(null);
  const dragTranslation = useSharedValue({ x: 0, y: 0 });

  const { attemptDrop } = useJigsawLogic(pieceWidth, pieceHeight);

  const onDragStart = useCallback((groupId: string) => {}, []);

  const onDragEnd = useCallback(
    (pieceId: number, finalX: number, finalY: number) => {
      attemptDrop(pieceId, finalX, finalY);
    },
    [attemptDrop],
  );

  if (!isInitialized) {
    return <View style={styles.container} />;
  }

  return (
    <View
      style={[styles.container, { width: boardWidth, height: boardHeight }]}
    >
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
          cachePolicy="memory-disk"
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
});

export default JigsawBoard;
