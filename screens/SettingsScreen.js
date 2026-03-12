import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const C = {
  bg:     '#080a12',
  card:   '#0d0f1a',
  border: '#1a1c2a',
  txt:    '#ddeeff',
  sub:    '#99aabb',
  muted:  '#6b7f93',
};

const SETTINGS_ROWS = [
  {
    id: 'tiles',
    icon: 'grid',
    label: 'Kafelki ekranu głównego',
    description: 'Co i za jaki okres wyświetlają kafelki',
    screen: 'TileSettings',
  },
  // Tu będą kolejne opcje w przyszłości
];

export default function SettingsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>USTAWIENIA</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Rows */}
      <View style={styles.group}>
        {SETTINGS_ROWS.map((row, i) => (
          <TouchableOpacity
            key={row.id}
            style={[styles.row, i < SETTINGS_ROWS.length - 1 && styles.rowBorder]}
            onPress={() => navigation.navigate(row.screen)}
            activeOpacity={0.75}
          >
            <View style={styles.rowIcon}>
              <Feather name={row.icon} size={16} color={C.sub} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              {!!row.description && (
                <Text style={styles.rowDesc}>{row.description}</Text>
              )}
            </View>
            <Feather name="chevron-right" size={16} color={C.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: C.txt, fontSize: 13, fontWeight: '900', letterSpacing: 3,
  },

  group: {
    marginTop: 20, marginHorizontal: 16,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16, gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent:  { flex: 1 },
  rowLabel:    { color: C.txt, fontSize: 14, fontWeight: '600' },
  rowDesc:     { color: C.muted, fontSize: 11, marginTop: 2 },
});
