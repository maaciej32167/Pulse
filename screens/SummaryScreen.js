import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { round1 } from '../src/utils';
import { loadAchievements, saveAchievements, loadBodyWeight, loadProfile } from '../src/storage';
import { computeAchievementsFromRecords } from '../src/achievements';
import { useWorkout } from '../src/WorkoutContext';

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
  const { clearWorkout } = useWorkout();
  const [isPublic,     setIsPublic]     = useState(true);
  const [title,        setTitle]        = useState('');
  const [photo,        setPhoto]        = useState(null);
  const [description,  setDescription]  = useState('');

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

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

  function handleSave() {
    clearWorkout();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  function handleDiscard() {
    Alert.alert(
      'Odrzuć trening?',
      'Trening nie zostanie zapisany w historii.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Odrzuć',
          style: 'destructive',
          onPress: () => {
            clearWorkout();
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Podsumowanie</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Zapisz</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Tytuł treningu */}
        <TextInput
          style={styles.titleInput}
          placeholder="Nazwa treningu (opcjonalnie)"
          placeholderTextColor={C.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="check-circle" size={20} color={C.green} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>TRENING UKOŃCZONY</Text>
            <View style={styles.heroMeta}>
              {!!gym?.name && <Text style={styles.heroPin}>📍</Text>}
              {!!gym?.name && <Text style={styles.heroGym}>{gym.name}</Text>}
              {!!gym?.name && <View style={styles.heroDot} />}
              <Text style={styles.heroTime}>{formatTime(startTime)} – {formatTime(endTime)}</Text>
            </View>
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

        {/* Zdjęcie + opis */}
        <View style={styles.postCard}>
          <TouchableOpacity style={styles.photoArea} onPress={pickPhoto} activeOpacity={0.8}>
            {photo
              ? <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              : <>
                  <Feather name="camera" size={22} color={C.muted} />
                  <Text style={styles.photoHint}>Dodaj zdjęcie</Text>
                </>
            }
            {photo && (
              <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
                <Feather name="x" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.descInput}
            placeholder="Jak poszło? Dodaj opis…"
            placeholderTextColor={C.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
          />
          {description.length > 0 && (
            <Text style={styles.descCount}>{description.length}/300</Text>
          )}
        </View>

        {/* Widoczność */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Feather name={isPublic ? 'globe' : 'lock'} size={14} color={isPublic ? C.cyan : C.muted} />
            <Text style={styles.privacyTitle}>WIDOCZNOŚĆ TRENINGU</Text>
          </View>
          <View style={styles.privacyToggle}>
            <TouchableOpacity
              style={[styles.privacyOption, isPublic && styles.privacyOptionActive]}
              onPress={() => setIsPublic(true)}
              activeOpacity={0.8}
            >
              <Feather name="globe" size={13} color={isPublic ? C.cyan : C.muted} />
              <Text style={[styles.privacyOptionText, isPublic && { color: C.cyan }]}>Publiczny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.privacyOption, !isPublic && styles.privacyOptionActivePriv]}
              onPress={() => setIsPublic(false)}
              activeOpacity={0.8}
            >
              <Feather name="lock" size={13} color={!isPublic ? C.muted : C.muted} />
              <Text style={[styles.privacyOptionText, !isPublic && { color: C.txt }]}>Prywatny</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.privacyHint}>
            {isPublic
              ? 'Trening pojawi się na wallu znajomych'
              : 'Tylko Ty widzisz ten trening'}
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>ZAPISZ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard} activeOpacity={0.7}>
          <Text style={styles.discardBtnText}>Odrzuć trening</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  headerTitle: { flex: 1, color: C.txt, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  saveBtn: {
    backgroundColor: C.coral, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4, marginBottom: 8,
  },
  heroIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.green + '18', borderWidth: 1, borderColor: C.green + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  heroText:  { flex: 1 },
  heroTitle: { color: C.txt, fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  heroMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  heroPin:   { fontSize: 10 },
  heroGym:   { color: C.muted, fontSize: 11, fontWeight: '700' },
  heroDot:   { width: 2, height: 2, borderRadius: 1, backgroundColor: '#6b7f93' },
  heroTime:  { color: C.muted, fontSize: 11 },

  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statBox: {
    flex: 1,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 9, gap: 3,
  },
  statRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 9, letterSpacing: 0.2 },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardTitle:  { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },

  prRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  prEx:   { color: C.txt, fontSize: 12 },
  prVal:  { color: C.gold, fontSize: 12, fontWeight: '700' },

  exGroup:   { marginTop: 7 },
  exHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  exName:    { color: C.txt, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFD70020', borderWidth: 1, borderColor: '#FFD70066',
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  prBadgeText: { color: '#FFD700', fontSize: 9, fontWeight: '800' },
  setRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  setNum:        { color: C.muted, fontSize: 11, width: 16, textAlign: 'center' },
  setWeightReps: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  setWeight:     { color: C.coral, fontSize: 12, fontWeight: '700' },
  setX:          { color: C.muted, fontSize: 11 },
  setReps:       { color: C.txt, fontSize: 12 },

  titleInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: C.txt, fontSize: 16, fontWeight: '800', marginBottom: 8,
  },

  postCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, overflow: 'hidden', marginBottom: 8,
  },
  photoArea: {
    height: 110, backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1, borderBottomColor: C.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoHint:   { color: C.muted, fontSize: 11, fontWeight: '600' },
  photoRemove: {
    position: 'absolute', top: 7, right: 7,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  descInput: {
    color: C.txt, fontSize: 13, padding: 12, minHeight: 55,
    textAlignVertical: 'top',
  },
  descCount: { color: C.muted, fontSize: 10, textAlign: 'right', paddingRight: 12, paddingBottom: 6 },

  privacyCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  privacyTitle:  { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' },
  privacyToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: 3, gap: 3, marginBottom: 10,
  },
  privacyOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 8,
  },
  privacyOptionActive: {
    backgroundColor: C.cyan + '18', borderWidth: 1, borderColor: C.cyan + '44',
  },
  privacyOptionActivePriv: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  privacyOptionText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  privacyHint: { color: C.muted, fontSize: 11, textAlign: 'center' },

  doneBtn: {
    backgroundColor: C.coral, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.coral, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 3 },
  discardBtn: { alignItems: 'center', paddingVertical: 14 },
  discardBtnText: { color: C.muted, fontSize: 13, fontWeight: '600' },
});
