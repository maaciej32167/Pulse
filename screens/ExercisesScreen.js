import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';

export default function ExercisesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="bar-chart-2" label="ĆWICZ." color="#00F5FF" />
      <View style={styles.center}>
        <Text style={styles.sub}>Wkrótce</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0A0A0C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sub:    { color: '#00F5FF', fontSize: 16, opacity: 0.5 },
});
