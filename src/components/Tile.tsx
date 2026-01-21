import { Image } from "expo-image";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { COLORS, TILE_BORDER_RADIUS, TILE_GAP } from "../constants/gameConfig";
import { GridSize, ImageSource } from "../types";
import {
  calculateImageOffset,
  calculateTilePosition,
} from "../utils/puzzleLogic";

interface TileProps {
  index: number;
  value: number;
  gridSize: GridSize;
  tileSize: number;
  imageSource: ImageSource;
  isEmpty: boolean;
  isHinted?: boolean;
  onPress: (index: number) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Tile: React.FC<TileProps> = ({
  index,
  value,
  gridSize,
  tileSize,
  imageSource,
  isEmpty,
  isHinted,
  onPress,
}) => {
  const position = calculateTilePosition(index, gridSize, tileSize, TILE_GAP);
  const imageOffset = calculateImageOffset(value, gridSize, tileSize);
  const scale = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(position.x, { duration: 120 }) },
      { translateY: withTiming(position.y, { duration: 120 }) },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  if (isEmpty) return null;

  return (
    <AnimatedTouchable
      style={[
        styles.tileContainer,
        { width: tileSize, height: tileSize },
        animatedContainerStyle,
      ]}
      onPress={() => onPress(index)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <View
        style={[styles.imageContainer, { borderRadius: TILE_BORDER_RADIUS }]}
      >
        <Image
          source={imageSource}
          style={[
            styles.image,
            {
              width: gridSize.cols * tileSize + (gridSize.cols - 1) * TILE_GAP, // Approx full image width
              height: gridSize.rows * tileSize + (gridSize.rows - 1) * TILE_GAP,
              top: imageOffset.top,
              left: imageOffset.left,
            },
          ]}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
        />
      </View>
      <View
        style={[
          styles.borderOverlay,
          { borderRadius: TILE_BORDER_RADIUS },
          // Green border if tile is in correct position
          value === index && {
            borderColor: "#22c55e",
            borderWidth: 3,
          },
        ]}
      />
      {/* Show position indicator for hinted tiles in wrong position */}
      {isHinted && value !== index && (
        <View style={styles.positionOverlay}>
          <Text style={styles.positionText}>
            {Math.floor(value / gridSize.cols) + 1}-
            {(value % gridSize.cols) + 1}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  tileContainer: { position: "absolute" },
  imageContainer: { flex: 1, overflow: "hidden" },
  image: { position: "absolute" },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  positionOverlay: {
    position: "absolute",
    bottom: 2,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  positionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});

export default memo(Tile, (prev, next) => {
  return (
    prev.index === next.index &&
    prev.value === next.value &&
    prev.isEmpty === next.isEmpty &&
    prev.gridSize.cols === next.gridSize.cols &&
    prev.gridSize.rows === next.gridSize.rows &&
    prev.tileSize === next.tileSize &&
    prev.isHinted === next.isHinted
  );
});
