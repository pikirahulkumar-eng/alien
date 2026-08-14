import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Alert, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import Asteroid from './components/Asteroid';
import OptionsPad from './components/OptionsPad';
import Spaceship from './components/Spaceship';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#b33939', paddingTop: 60, paddingHorizontal: 20 }}>
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>🛑 JS CRASH CAUGHT!</Text>
          <ScrollView style={{ marginTop: 20 }}>
            <Text style={{ color: '#f1c40f', fontSize: 16, fontWeight: 'bold' }}>Error:</Text>
            <Text style={{ color: 'white', fontSize: 14 }}>{this.state.error && this.state.error.toString()}</Text>
            <Text style={{ color: '#f1c40f', fontSize: 16, fontWeight: 'bold', marginTop: 20 }}>Stack Trace:</Text>
            <Text style={{ color: '#d1d8e0', fontSize: 12 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// Global Native/JS unhandled error catcher
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    Alert.alert(
      'Fatal Error Catcher',
      `Error: ${error.message}\n\nPlease take a screenshot and share it!`,
      [{ text: 'OK' }]
    );
    if (originalHandler) originalHandler(error, isFatal);
  });
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}

function GameApp() {
  const [problem, setProblem] = useState(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  
  const [isShooting, setIsShooting] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [asteroidDestroyed, setAsteroidDestroyed] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  // Starting speed 10s, decreases as level goes up
  const getSpeedForLevel = (lvl) => Math.max(2500, 10000 - (lvl - 1) * 1200);
  const [speed, setSpeed] = useState(getSpeedForLevel(1)); 
  const [gameAreaHeight, setGameAreaHeight] = useState(0);

  const shakeTranslateX = useSharedValue(0);

  const triggerShake = () => {
    shakeTranslateX.value = withSequence(
      withTiming(-15, { duration: 50 }),
      withTiming(15, { duration: 50 }),
      withTiming(-15, { duration: 50 }),
      withTiming(15, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }]
  }));

  const generateProblem = (currentLevel = level) => {
    let maxNum = 10;
    let allowMult = false;
    
    if (currentLevel === 2) maxNum = 20;
    if (currentLevel === 3) maxNum = 35;
    if (currentLevel >= 4) {
      maxNum = 15 + currentLevel * 5;
      allowMult = true; // start multiplication
    }

    const typeRoll = Math.random();
    let isMult = false;
    let isAddition = true;
    
    if (allowMult && typeRoll > 0.6) {
      isMult = true;
    } else if (typeRoll > 0.4) {
      isAddition = false;
    }
    
    let a, b, answer, text;
    
    if (isMult) {
      a = Math.floor(Math.random() * (currentLevel + 2)) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      answer = a * b;
      text = `${a} × ${b}`;
    } else if (isAddition) {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      text = `${a} + ${b}`;
    } else {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      const max = Math.max(a, b);
      const min = Math.min(a, b);
      answer = max - min;
      text = `${max} - ${min}`;
    }
    
    // Generate 2 wrong options that are close
    const variance = isMult ? Math.max(3, currentLevel) : 3;
    let wrong1 = answer + Math.floor(Math.random() * variance) + 1;
    let wrong2 = answer - Math.floor(Math.random() * variance) - 1;
    
    if (wrong2 < 0 && !isMult && isAddition) wrong2 = answer + variance + 1; 
    if (wrong2 === wrong1) wrong2 += 1; // ensure unique
    
    // Shuffle
    const options = [answer, wrong1, wrong2].sort(() => Math.random() - 0.5);

    setProblem({ text, answer, options });
    setAsteroidDestroyed(false);
    
    const spokenText = text.replace('+', 'plus').replace('-', 'minus').replace('×', 'into');
    try {
      Speech.speak(spokenText, { language: 'en-IN', rate: 0.9, pitch: 1.2 });
    } catch (e) {
      console.log("TTS Error:", e);
    }
  };

  useEffect(() => {
    // Delay first problem to allow Android TTS engine to bind without crashing
    const timer = setTimeout(() => {
      generateProblem();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectOption = (selected) => {
    if (selected === problem.answer) {
      // Correct!
      Speech.stop();
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Calculate points
      const basePoints = 10;
      const comboBonus = Math.floor(newStreak / 3) * 5; // Extra 5 pts every 3 streaks
      const newScore = score + basePoints + comboBonus;
      setScore(newScore);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsShooting(true);
      setAsteroidDestroyed(true);
      
      // Level Up Logic
      const nextLevelThreshold = level * 50;
      const isLevelUp = newScore >= nextLevelThreshold;
      const isCombo = newStreak > 0 && newStreak % 3 === 0;

      if (isLevelUp) {
        const newLevel = level + 1;
        setLevel(newLevel);
        setSpeed(getSpeedForLevel(newLevel));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowLevelUp(true);
        try {
          Speech.speak("Level Up!", { language: 'en-IN', rate: 1.0, pitch: 1.5 });
        } catch(e) {}
        
        setTimeout(() => {
          setIsShooting(false);
          setShowLevelUp(false);
          generateProblem(newLevel);
        }, 1500);
      } else if (isCombo) {
        const praises = ["Awesome!", "Superb!", "Brilliant!"];
        try {
          Speech.speak(praises[Math.floor(Math.random() * praises.length)], { language: 'en-IN', rate: 1.1, pitch: 1.3 });
        } catch(e) {}
        
        setTimeout(() => {
          setIsShooting(false);
          generateProblem(level);
        }, 1200);
      } else {
        setTimeout(() => {
          setIsShooting(false);
          generateProblem(level);
        }, 300);
      }
      
    } else {
      // Wrong!
      triggerShake();
      try {
        Speech.stop();
        Speech.speak("Oops!", { language: 'en-IN', rate: 1.0, pitch: 0.8 });
      } catch(e) {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0); // Break streak
    }
  };

  const handleMiss = () => {
    if (!asteroidDestroyed) {
      triggerShake();
      try {
        Speech.stop();
        Speech.speak("Too slow!", { language: 'en-IN', rate: 1.1, pitch: 0.9 });
      } catch(e) {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setIsHit(true);
      setStreak(0); // Break streak
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          Alert.alert("Game Over!", `You reached Level: ${level}\nTotal Score: ${score}`, [
            { text: "Play Again", onPress: resetGame }
          ]);
          return 0;
        }
        return newLives;
      });
      setTimeout(() => {
        setIsHit(false);
        generateProblem(level);
      }, 500);
    }
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setStreak(0);
    setSpeed(getSpeedForLevel(1));
    generateProblem(1);
  };

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={styles.livesText}>{'❤️'.repeat(lives)}</Text>
          {streak >= 3 && (
            <Text style={styles.comboText}>🔥 {streak} Combo!</Text>
          )}
        </View>
      </View>

      <View style={styles.gameArea} onLayout={(e) => setGameAreaHeight(e.nativeEvent.layout.height)}>
        {problem && lives > 0 && gameAreaHeight > 0 && (
          <Asteroid 
            problem={problem.text} 
            onMiss={handleMiss} 
            speed={speed} 
            isDestroyed={asteroidDestroyed}
            fallDistance={gameAreaHeight}
          />
        )}
        {showLevelUp && (
          <View style={styles.levelUpOverlay}>
            <Text style={styles.levelUpText}>🎉 LEVEL UP! 🎉</Text>
            <Text style={styles.levelUpSubText}>Speed Increased!</Text>
          </View>
        )}
      </View>

      <Spaceship isShooting={isShooting} isHit={isHit} score={score} />
      
      {problem && lives > 0 && (
        <OptionsPad options={problem.options} onSelect={handleSelectOption} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2a', // Space dark blue
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 60,
  },
  levelText: {
    color: '#0be881',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 5,
  },
  scoreText: {
    color: '#feca57',
    fontSize: 20,
    fontWeight: 'bold',
  },
  livesText: {
    fontSize: 24,
    marginBottom: 5,
  },
  comboText: {
    color: '#ff3f34',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 42, 0.7)',
    zIndex: 20,
  },
  levelUpText: {
    color: '#0be881',
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  levelUpSubText: {
    color: '#fff',
    fontSize: 20,
    marginTop: 10,
  }
});
