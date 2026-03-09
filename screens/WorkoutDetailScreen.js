import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { round1, estimate1RM } from '../src/utils';
import { COLORS } from '../src/colors';

const C = {
  bg: '#0A0A0C', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  txt: '#f1f5f9', muted: '#64748b', accent: '#FFD700', coral: '#FF4757', cyan: '#00F5FF',
};

function StatBox({ icon, value, label, color, last }) {
  return (
    <View style={[styles.statBox, !last && styles.statBoxBorder]}>
      <Text style={[styles.statValue, { color: color || C.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function fmtDuration(ms) {
  if (ms < 60000) return '< 1 min';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export default function WorkoutDetailScreen({ navigation, route }) {
  const { date, records, bodyWeight, bwExercises, allRecords = [] } = route.params;

  // Grupuj po ćwiczeniu (zachowaj kolejność pierwszego pojawienia)
  const groups = [];
  const map = new Map();
  for (const r of records) {
    if (!map.has(r.exercise)) {
      map.set(r.exercise, []);
      groups.push({ exercise: r.exercise, sets: map.get(r.exercise) });
    }
    map.get(r.exercise).push(r);
  }

  const totalVolume = records.reduce((s, r) => s + r.weight * r.reps, 0);
  const exercises   = groups.length;
  const totalSets   = records.length;

  const timestamps = records.map(r => r.timestamp || 0).filter(Boolean);
  const dayStart   = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const duration   = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : null;

  // 1RM i PR per ćwiczenie
  const prMap  = new Map(); // exercise → best 1RM string
  const prSet  = new Set(); // exercises które biją historyczny rekord
  for (const { exercise, sets } of groups) {
    const bestCur = Math.max(...sets.map(s => estimate1RM(Number(s.weight), Number(s.reps)) || 0));
    if (bestCur > 0) prMap.set(exercise, round1(bestCur));

    const prevRecs  = allRecords.filter(r => r.exercise === exercise && (r.timestamp || 0) < dayStart);
    if (prevRecs.length > 0) {
      const bestPrev = Math.max(...prevRecs.map(r => estimate1RM(Number(r.weight), Number(r.reps)) || 0));
      if (bestCur > bestPrev) prSet.add(exercise);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="activity" label={date} color={COLORS.historia} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Statystyki */}
        <View style={styles.statsGrid}>
          <StatBox value={duration != null ? fmtDuration(duration) : '—'} label="Czas"      color={C.cyan}  />
          <StatBox value={exercises}                                        label="Ćwiczenia" color={C.cyan}  />
          <StatBox value={totalSets}                                        label="Sets"      color={C.coral} />
          <StatBox value={`${Math.round(totalVolume)} kg`}                  label="Volume"   color={C.accent} last />
        </View>

        {/* Ćwiczenia */}
        {groups.map(({ exercise, sets }) => {
          const pr1RM = prMap.get(exercise);
          const isPR  = prSet.has(exercise);
          return (
            <View key={exercise} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.exName}>{exercise}</Text>
                <View style={styles.badgeRow}>
                  {isPR && (
                    <View style={styles.prBadge}>
                      <Feather name="award" size={11} color={C.accent} />
                      <Text style={styles.prBadgeText}>PR</Text>
                    </View>
                  )}
                  {pr1RM && (
                    <View style={styles.ormBadge}>
                      <Text style={styles.ormText}>1RM ≈ {pr1RM} kg</Text>
                    </View>
                  )}
                </View>
              </View>
              {sets.map((s, i) => {
                const isBW = bwExercises && bwExercises.includes(exercise);
                const weightStr = isBW
                  ? `${round1(s.bodyWeightKg || bodyWeight)} + ${round1(s.weight)} kg`
                  : `${round1(s.weight)} kg`;
                return (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setNum}>{i + 1}</Text>
                    <View style={styles.setWeightReps}>
                      <Text style={styles.setWeight}>{weightStr}</Text>
                      <Text style={styles.setX}>×</Text>
                      <Text style={styles.setReps}>{s.reps} powt.</Text>
                    </View>
                    <Text style={styles.setVol}>{Math.round(s.weight * s.reps)} kg</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },

  statsGrid: {
    flexDirection: 'row', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    marginBottom: 14,
  },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: C.border },
  statValue:     { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  statLabel:     { color: C.muted, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  exName:    { color: C.txt, fontSize: 13, fontWeight: '700', flex: 1 },
  badgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent + '20', borderWidth: 1, borderColor: C.accent + '66',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  prBadgeText: { color: C.accent, fontSize: 10, fontWeight: '800' },
  ormBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  ormText: { color: C.muted, fontSize: 10, fontWeight: '600' },

  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  setNum:        { color: C.muted, fontSize: 11, width: 16, textAlign: 'center' },
  setWeightReps: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flex: 1 },
  setWeight:     { color: C.coral, fontSize: 13, fontWeight: '700' },
  setX:          { color: C.muted, fontSize: 12 },
  setReps:       { color: C.txt, fontSize: 13 },
  setVol:        { color: C.muted, fontSize: 11 },
});
