import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';

export default function Spaceship({ isShooting, isHit, score = 0 }) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isShooting) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1)
      );
    }
  }, [isShooting]);

  useEffect(() => {
    if (isHit) {
      rotation.value = withSequence(
        withTiming(-15, { duration: 50 }),
        withTiming(15, { duration: 50 }),
        withTiming(-15, { duration: 50 }),
        withTiming(15, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isHit]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  let shipEmoji = '🚀';
  if (score >= 500) shipEmoji = '🛸';
  else if (score >= 200) shipEmoji = '✈️';

  return (
    <Animated.View style={[styles.spaceship, animatedStyle]}>
      <Text style={styles.emoji}>{shipEmoji}</Text>
      {isShooting && <View style={styles.laser} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spaceship: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  emoji: {
    fontSize: 60,
  },
  laser: {
    position: 'absolute',
    top: -1000,
    width: 8,
    height: 1000,
    backgroundColor: '#0be881',
    shadowColor: '#05c46b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  }
});
