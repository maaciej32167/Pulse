import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { WorkoutProvider, useWorkout } from './src/WorkoutContext';
import { Audio } from 'expo-av';

// Jednorazowa konfiguracja sesji audio
Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });

import HomeScreen      from './screens/HomeScreen';
import StartScreen     from './screens/StartScreen';
import PlanScreen      from './screens/PlanScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ProfileScreen   from './screens/ProfileScreen';
import DiscoverScreen  from './screens/DiscoverScreen';
import GymScreen       from './screens/GymScreen';
import LogScreen       from './screens/LogScreen';
import WorkoutScreen   from './screens/WorkoutScreen';
import SummaryScreen         from './screens/SummaryScreen';
import WorkoutDetailScreen   from './screens/WorkoutDetailScreen';
import AchievementsScreen    from './screens/AchievementsScreen';
import SettingsScreen        from './screens/SettingsScreen';
import TileSettingsScreen    from './screens/TileSettingsScreen';
import FeedScreen            from './screens/FeedScreen';
import PublicProfileScreen   from './screens/PublicProfileScreen';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

// ─── Active workout banner ────────────────────────────────────────────────────

function useElapsed(startTime, pausedAt) {
  const calc = () => startTime ? Math.floor(((pausedAt || Date.now()) - startTime) / 1000) : 0;
  const [elapsed, setElapsed] = useState(calc);
  useEffect(() => {
    if (!startTime || pausedAt) { setElapsed(calc()); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, pausedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ActiveWorkoutBanner() {
  const { activeWorkout, workoutScreenVisible, clearWorkout } = useWorkout();
  const insets = useSafeAreaInsets();

  const timerLabel = useElapsed(activeWorkout?.startTime, activeWorkout?.pausedAt);

  if (!activeWorkout) return null;
  if (activeWorkout.pausedAt) return null;
  if (workoutScreenVisible) return null;

  function handleResume() {
    navigationRef.current?.navigate('Workout', {
      gym: activeWorkout.gym,
      checkInTime: activeWorkout.startTime,
    });
  }

  function handleFinish() {
    clearWorkout();
    navigationRef.current?.navigate('Summary', {
      gym: activeWorkout.gym,
      startTime: activeWorkout.startTime,
      endTime: Date.now(),
      sets: activeWorkout.sets,
      allRecords: activeWorkout.records,
    });
  }

  return (
    <TouchableOpacity
      style={[styles.banner, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}
      onPress={handleResume}
      activeOpacity={0.9}
    >
      <View style={styles.bannerDot} />
      <Text style={styles.bannerTimer}>{timerLabel}</Text>
      {!!activeWorkout.gym?.name && (
        <>
          <View style={styles.bannerSep} />
          <Text style={styles.bannerGym} numberOfLines={1}>{activeWorkout.gym.name}</Text>
        </>
      )}
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.bannerBtn} onPress={handleFinish} activeOpacity={0.8}>
        <Text style={styles.bannerBtnText}>Zakończ</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#141418',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 10, paddingHorizontal: 16, gap: 8,
    zIndex: 999,
  },
  bannerDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  bannerTimer: { color: '#f1f5f9', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bannerSep:   { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  bannerGym:   { color: '#64748b', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  bannerBtn: {
    backgroundColor: '#FF4757', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  bannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Feather.font,
    ...MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#818cf8" />
      </View>
    );
  }

  return (
    <WorkoutProvider>
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#080808' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Home"      component={HomeScreen}      />
          <Stack.Screen name="Start"     component={StartScreen}     />
          <Stack.Screen name="Plan"      component={PlanScreen}      />
          <Stack.Screen name="Cwiczenia" component={ExercisesScreen} />
          <Stack.Screen name="Profil"    component={ProfileScreen}   />
          <Stack.Screen name="Discover"  component={DiscoverScreen}  />
          <Stack.Screen name="Gym"       component={GymScreen}       />
          <Stack.Screen name="Log"       component={LogScreen}       />
          <Stack.Screen name="Workout"   component={WorkoutScreen}   />
          <Stack.Screen name="Summary"        component={SummaryScreen}       />
          <Stack.Screen name="WorkoutDetail"  component={WorkoutDetailScreen}  />
          <Stack.Screen name="Achievements"   component={AchievementsScreen}   />
          <Stack.Screen name="Settings"       component={SettingsScreen}        />
          <Stack.Screen name="TileSettings"   component={TileSettingsScreen}    />
          <Stack.Screen name="Feed"           component={FeedScreen}            />
          <Stack.Screen name="PublicProfile"  component={PublicProfileScreen}   />
        </Stack.Navigator>
        <ActiveWorkoutBanner />
      </NavigationContainer>
    </SafeAreaProvider>
    </WorkoutProvider>
  );
}
