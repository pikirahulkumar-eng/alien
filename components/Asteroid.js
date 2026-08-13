import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS, cancelAnimation } from 'react-native-reanimated';

const MONSTERS = ['👾', '👽', '👿', '👹', '👺', '👻'];

export default function Asteroid({ problem, onMiss, speed, isDestroyed, fallDistance }) {
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const [monster, setMonster] = useState('👾');

  useEffect(() => {
    // Pick a random monster on mount
    setMonster(MONSTERS[Math.floor(Math.random() * MONSTERS.length)]);
  }, [problem]);

  useEffect(() => {
    if (isDestroyed) {
      cancelAnimation(translateY);
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(2.5, { duration: 300 });
      return;
    }

    // Reset position and style
    translateY.value = -150;
    opacity.value = 1;
    scale.value = 1;

    // Start falling
    translateY.value = withTiming(fallDistance, {
      duration: speed,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(onMiss)();
      }
    });
  }, [problem, speed, isDestroyed, fallDistance]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.asteroid, animatedStyle]}>
      <Text style={styles.monsterEmoji}>{isDestroyed ? '💥' : monster}</Text>
      {!isDestroyed && (
        <View style={styles.problemBadge}>
          <Text style={styles.text}>{problem}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  asteroid: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  monsterEmoji: {
    fontSize: 70,
  },
  problemBadge: {
    position: 'absolute',
    bottom: -15,
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  }
});
