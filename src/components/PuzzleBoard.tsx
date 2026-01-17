import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { BOARD_PADDING, COLORS, TILE_GAP } from "../constants/gameConfig";
import { useGameStore } from "../store/gameStore";
import { GridSize, ImageSource } from "../types";
import Tile from "./Tile";

interface PuzzleBoardProps {
  grid: number[];
  gridSize: GridSize;
  imageSource: ImageSource;
  onTilePress: (index: number) => void;
  boardSize?: number;
}

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  grid,
  gridSize,
  imageSource,
  onTilePress,
  boardSize: propBoardSize,
}) => {
  const boardWidth = propBoardSize ? propBoardSize - BOARD_PADDING * 2 : 340;
  // Calculate tile size based on width and columns
  const totalGapX = TILE_GAP * (gridSize.cols - 1);
  const tileSize = (boardWidth - totalGapX) / gridSize.cols;

  // Calculate height based on rows
  const totalGapY = TILE_GAP * (gridSize.rows - 1);
  const boardHeight = tileSize * gridSize.rows + totalGapY;

  const emptyTileValue = gridSize.cols * gridSize.rows - 1;
  const hintedTiles = useGameStore((state) => state.hintedTiles);

  const tiles = useMemo(() => {
    return grid.map((value, index) => (
      <Tile
        key={value}
        index={index}
        value={value}
        gridSize={gridSize}
        tileSize={tileSize} // Pass pre-calculated size
        imageSource={imageSource}
        isEmpty={value === emptyTileValue}
        isHinted={hintedTiles.includes(value)}
        onPress={onTilePress}
      />
    ));
  }, [
    grid,
    gridSize,
    tileSize,
    imageSource,
    emptyTileValue,
    onTilePress,
    hintedTiles,
  ]);

  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: boardWidth, height: boardHeight }]}>
        {tiles}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: BOARD_PADDING,
  },
  board: {
    backgroundColor: COLORS.surface,
    borderRadius: 6, // Reduced from 16 to match TILE_BORDER_RADIUS
    overflow: "hidden",
    position: "relative",
  },
});

export default PuzzleBoard;
