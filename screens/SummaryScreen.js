import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { round1 } from '../src/utils';
import { loadAchievements, saveAchievements, loadBodyWeight, loadProfile } from '../src/storage';
import { computeAchievementsFromRecords } from '../src/achievements';

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:     '#0A0A0C',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  txt:    '#f1f5f9',
  muted:  '#64748b',
  coral:  '#FF4757',
  cyan:   '#00F5FF',
  gold:   '#FFD700',
  green:  '#22c55e',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${sec}s`;
  return `${sec}s`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function StatBox({ icon, value, label, color }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statRow}>
        <Feather name={icon} size={14} color={color || C.coral} />
        <Text style={[styles.statValue, { color: color || C.coral }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function SummaryScreen({ navigation, route }) {
  const { gym, startTime, endTime, sets, allRecords } = route.params;

  useEffect(() => {
    async function checkAndSaveAchievements() {
      try {
        const [stored, bodyWeight, profile] = await Promise.all([
          loadAchievements(), loadBodyWeight(), loadProfile(),
        ]);
        const { newlyUnlocked, progress } = computeAchievementsFromRecords(
          allRecords, profile, bodyWeight, stored.unlockedIds
        );
        if (newlyUnlocked.length > 0) {
          const updatedIds = [...stored.unlockedIds, ...newlyUnlocked.map(a => a.id)];
          const updatedDates = { ...stored.unlockedDates };
          newlyUnlocked.forEach(a => { if (a.date) updatedDates[a.id] = a.date; });
          await saveAchievements({ unlockedIds: updatedIds, unlockedDates: updatedDates, progress });
        } else {
          await saveAchievements({ ...stored, progress });
        }
      } catch (e) {
        console.warn('[Achievements] check error:', e);
      }
    }
    checkAndSaveAchievements();
  }, []);

  const duration = endTime - startTime;
  const exercises = [...new Set(sets.map(s => s.exercise))];
  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  // Sprawdź PR-y w tej sesji
  const prs = sets.filter(s => {
    const prev = allRecords.filter(r => r.exercise === s.exercise && r.id !== s.id);
    if (prev.length === 0) return true;
    const best = Math.max(...prev.map(r => r.weight * (36 / (37 - Math.min(r.reps, 36)))));
    const current = s.weight * (36 / (37 - Math.min(s.reps, 36)));
    return current > best;
  });

  // Grupuj serie po ćwiczeniu
  const groups = [];
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.exercise)) { map.set(s.exercise, []); groups.push({ exercise: s.exercise, sets: map.get(s.exercise) }); }
    map.get(s.exercise).push(s);
  }

  function handleDone() {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="check-circle" size={40} color={C.green} />
          </View>
          <Text style={styles.heroTitle}>TRENING UKOŃCZONY</Text>
          <View style={styles.heroMeta}>
            {!!gym?.name && <Text style={styles.heroPin}>📍</Text>}
            {!!gym?.name && <Text style={styles.heroGym}>{gym.name}</Text>}
            {!!gym?.name && <View style={styles.heroDot} />}
            <Text style={styles.heroTime}>{formatTime(startTime)} – {formatTime(endTime)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatBox icon="clock"      value={formatDuration(duration)} label="Czas"        color={C.cyan}  />
          <StatBox icon="layers"     value={sets.length}              label="Serie"        color={C.coral} />
          <StatBox icon="bar-chart-2" value={exercises.length}        label="Ćwiczenia"   color={C.cyan}  />
          <StatBox icon="trending-up" value={`${Math.round(totalVolume)} kg`} label="Wolumen" color={C.gold} />
        </View>

        {/* PR-y */}
        {prs.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="award" size={14} color={C.gold} />
              <Text style={[styles.cardTitle, { color: C.gold }]}>NOWE REKORDY · {prs.length}</Text>
            </View>
            {prs.map(pr => (
              <View key={pr.id} style={styles.prRow}>
                <Text style={styles.prEx}>{pr.exercise}</Text>
                <Text style={styles.prVal}>{round1(pr.weight)} kg × {pr.reps}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Lista ćwiczeń */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ĆWICZENIA</Text>
          {groups.map(({ exercise, sets: exSets }) => {
            const hasPR = prs.some(p => p.exercise === exercise);
            return (
            <View key={exercise} style={styles.exGroup}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{exercise}</Text>
                {hasPR && (
                  <View style={styles.prBadge}>
                    <Feather name="award" size={11} color={C.gold} />
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                )}
              </View>
              {exSets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNum}>{i + 1}</Text>
                  <View style={styles.setWeightReps}>
                    <Text style={styles.setWeight}>{round1(s.weight)} kg</Text>
                    <Text style={styles.setX}>×</Text>
                    <Text style={styles.setReps}>{s.reps} powt.</Text>
                  </View>
                </View>
              ))}
            </View>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>WRÓĆ DO MENU</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },

  hero: { alignItems: 'center', paddingVertical: 32 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.green + '18', borderWidth: 1.5, borderColor: C.green + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { color: C.txt, fontSize: 22, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  heroMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroPin:   { fontSize: 12 },
  heroGym:   { color: C.txt, fontSize: 14, fontWeight: '700' },
  heroDot:   { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#6b7f93', opacity: 0.8 },
  heroTime:  { color: '#99aabb', fontSize: 13 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1, minWidth: '45%',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, gap: 4,
  },
  statRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 10, letterSpacing: 0.3 },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle:  { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },

  prRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  prEx:   { color: C.txt, fontSize: 13 },
  prVal:  { color: C.gold, fontSize: 13, fontWeight: '700' },

  exGroup:   { marginTop: 10 },
  exHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  exName:    { color: C.txt, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFD70020', borderWidth: 1, borderColor: '#FFD70066',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  prBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800' },
  setRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  setNum:        { color: C.muted, fontSize: 12, width: 18, textAlign: 'center' },
  setWeightReps: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  setWeight:     { color: C.coral, fontSize: 13, fontWeight: '700' },
  setX:          { color: C.muted, fontSize: 12 },
  setReps:       { color: C.txt, fontSize: 13 },

  doneBtn: {
    backgroundColor: C.coral, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.coral, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 3 },
});
