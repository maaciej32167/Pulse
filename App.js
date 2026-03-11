import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

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

const Stack = createNativeStackNavigator();

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
    <SafeAreaProvider>
      <NavigationContainer>
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
