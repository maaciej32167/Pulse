import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadExercises, loadRecords, saveRecords, loadBodyWeight, loadBWExercises } from '../src/storage';
import { estimate1RM, round1, effectiveWeight } from '../src/utils';
import { generateUUID as generateId, isoDate, displayDate } from '../src/storage';
import { useWorkout } from '../src/WorkoutContext';

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#0A0A0C', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  txt: '#f1f5f9', muted: '#64748b', accent: '#FF4757',
};

// ─── timer ────────────────────────────────────────────────────────────────────

function useTimer(startTime, pausedAt) {
  const calc = () => Math.floor(((pausedAt || Date.now()) - startTime) / 1000);
  const [elapsed, setElapsed] = useState(calc);

  useEffect(() => {
    if (pausedAt) { setElapsed(calc()); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, pausedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const label = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return { elapsed, label };
}

const PR_ICON = {
  weight:        '⬆',  // max ciężar
  orm:           '🏆', // best 1RM
  setVolume:     '💪', // vol setu
  sessionVolume: '🔥', // vol sesji
};

const PR_LABEL = {
  weight:        'MAX CIĘŻAR',
  orm:           'BEST 1RM',
  setVolume:     'VOL SETU',
  sessionVolume: 'VOL SESJI',
};

// ─── custom keypad ────────────────────────────────────────────────────────────

const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['.','0','⌫']];

function CustomKeypad({ showDot, onKey }) {
  return (
    <View style={kbStyles.wrap}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={kbStyles.row}>
          {row.map(k => {
            if (k === '.' && !showDot) return <View key={k} style={kbStyles.keyEmpty} />;
            const isBack = k === '⌫';
            return (
              <TouchableOpacity
                key={k}
                style={[kbStyles.key, isBack && kbStyles.keyBack]}
                onPress={() => onKey(k)}
                activeOpacity={0.6}
              >
                <Text style={[kbStyles.keyTxt, isBack && kbStyles.keyBackTxt]}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── główny ekran ─────────────────────────────────────────────────────────────

export default function WorkoutScreen({ navigation, route }) {
  const { gym, checkInTime } = route.params;
  const workoutId = useRef(generateId()).current; // stable per session
  const pausedAtRef = useRef(null); // synchronous pause timestamp (avoids batching issues)
  const { activeWorkout, startWorkout, updateSets, pauseWorkout, resumeWorkout, setWorkoutScreenVisible } = useWorkout();
  const insets = useSafeAreaInsets();
  const { label: timerLabel } = useTimer(
    activeWorkout?.startTime ?? checkInTime,
    activeWorkout?.pausedAt ?? null,
  );

  const [exercises, setExercises] = useState([]);
  const [records,   setRecords]   = useState([]);
  const [sessionSets, setSessionSets] = useState([]); // serie z tego treningu
  const [selectedEx, setSelectedEx] = useState('');
  const [weight, setWeight] = useState('');
  const [reps,   setReps]   = useState('');
  const [bodyWeight, setBodyWeight] = useState(80);
  const [bwExercises, setBwExercises] = useState(new Set());
  const [live1RM, setLive1RM] = useState(null);
  const [toast, setToast] = useState('');
  const [prBanner, setPrBanner] = useState(null); // { exercise, orm }
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [editingSet, setEditingSet] = useState(null); // { set, editWeight, editReps, activeField }
  const [editActiveField, setEditActiveField] = useState(null);

  useFocusEffect(useCallback(() => {
    setWorkoutScreenVisible(true);
    if (pausedAtRef.current != null) {
      resumeWorkout(pausedAtRef.current);
      pausedAtRef.current = null;
    }
    return () => setWorkoutScreenVisible(false);
  }, []));

  useEffect(() => {
    startWorkout(gym, checkInTime);
    async function init() {
      const ex  = await loadExercises();
      const rec = await loadRecords();
      const bw  = await loadBodyWeight();
      const bwEx = await loadBWExercises();
      setExercises(ex);
      setRecords(rec);
      setBodyWeight(bw);
      setBwExercises(bwEx);
      // brak domyślnego wyboru — użytkownik sam wybiera ćwiczenie
    }
    init();
  }, []);

  useEffect(() => {
    updateSets(sessionSets, records);
  }, [sessionSets]);

  useEffect(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (w > 0 && r > 0) {
      const eff = bwExercises.has(selectedEx) ? bodyWeight + w : w;
      setLive1RM(estimate1RM(eff, r) ? round1(estimate1RM(eff, r)) : null);
    } else {
      setLive1RM(null);
    }
  }, [weight, reps, selectedEx]);

  function handleKey(k) {
    const current = activeField === 'weight' ? weight : reps;
    const setter  = activeField === 'weight' ? setWeight : setReps;
    if (k === '⌫') { setter(current.slice(0, -1)); return; }
    if (k === '.' && (current.includes('.') || activeField === 'reps')) return;
    if (k === '0' && current === '') return;
    if (current.length >= 6) return;
    setter(current + k);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  async function addSet() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!selectedEx || w <= 0 || r <= 0) {
      Alert.alert('Błąd', 'Wybierz ćwiczenie i podaj ciężar oraz powtórzenia.');
      return;
    }

    const eff    = bwExercises.has(selectedEx) ? bodyWeight + w : w;
    const newOrm = estimate1RM(eff, r) || 0;
    const setVolume = w * r;

    const exRecords = records.filter(rec => rec.exercise === selectedEx);

    // PR tylko od drugiej sesji — musi istnieć przynajmniej jedna seria z innego workoutId
    const hasPriorSession = exRecords.some(rec => rec.workoutId && rec.workoutId !== workoutId);

    const prTypes = [];
    if (hasPriorSession) {
      const pastRecords = exRecords.filter(rec => rec.workoutId !== workoutId);

      // 1. Największy ciężar
      const prevMaxWeight = pastRecords.reduce((m, rec) => Math.max(m, Number(rec.weight)), 0);
      if (w > prevMaxWeight) prTypes.push('weight');

      // 2. Best 1RM
      const prevBestOrm = pastRecords.reduce((best, rec) => {
        const effRec = bwExercises.has(rec.exercise) ? (rec.bodyWeightKg || bodyWeight) + Number(rec.weight) : Number(rec.weight);
        return Math.max(best, estimate1RM(effRec, Number(rec.reps)) || 0);
      }, 0);
      if (newOrm > 0 && newOrm > prevBestOrm) prTypes.push('orm');

      // 3. Najlepszy wolumen w secie
      const prevBestSetVol = pastRecords.reduce((m, rec) => Math.max(m, Number(rec.weight) * Number(rec.reps)), 0);
      if (setVolume > prevBestSetVol) prTypes.push('setVolume');

      // 4. Najlepszy wolumen ćwiczenia na trening
      const currentSessionVol = sessionSets
        .filter(s => s.exercise === selectedEx)
        .reduce((sum, s) => sum + s.weight * s.reps, 0) + setVolume;
      const sessionVolByWorkout = {};
      for (const rec of pastRecords) {
        if (!rec.workoutId) continue;
        sessionVolByWorkout[rec.workoutId] = (sessionVolByWorkout[rec.workoutId] || 0) + Number(rec.weight) * Number(rec.reps);
      }
      const prevBestSessionVol = Object.values(sessionVolByWorkout).reduce((m, v) => Math.max(m, v), 0);
      if (currentSessionVol > prevBestSessionVol) prTypes.push('sessionVolume');
    }
    const isPR = prTypes.length > 0;

    const now = Date.now();
    const iso  = isoDate(now);
    const newRecord = {
      id:           generateId(),
      workoutId,
      exercise:     selectedEx,
      weight:       w,
      reps:         r,
      isoDate:      iso,
      date:         displayDate(iso),
      timestamp:    now,
      bodyWeightKg: bodyWeight,
      gymId:        gym?.id   || null,
      gymName:      gym?.name || null,
      isPR,
      prTypes,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    setSessionSets(prev => [...prev, newRecord]);
    await saveRecords(updated);
    setWeight('');
    setReps('');
    setActiveField(null);
    if (isPR) {
      setPrBanner({ exercise: selectedEx, orm: round1(newOrm), prTypes });
      setTimeout(() => setPrBanner(null), 3500);
    } else {
      showToast('✅ Zapisano');
    }
  }

  function deleteSet(id) {
    Alert.alert('Usuń serię', 'Na pewno chcesz usunąć tę serię?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        const newSession = sessionSets.filter(s => s.id !== id);
        const newRecords = records.filter(r => r.id !== id);
        setSessionSets(newSession);
        setRecords(newRecords);
        await saveRecords(newRecords);
        showToast('🗑 Usunięto');
      }},
    ]);
  }

  function openEdit(set) {
    setEditingSet({ set, editWeight: String(set.weight), editReps: String(set.reps) });
    setEditActiveField(null);
  }

  function handleEditKey(k) {
    const isW = editActiveField === 'weight';
    const current = isW ? editingSet.editWeight : editingSet.editReps;
    let next;
    if (k === '⌫') next = current.slice(0, -1);
    else if (k === '.' && (current.includes('.') || !isW)) return;
    else if (k === '0' && current === '') return;
    else if (current.length >= 6) return;
    else next = current + k;
    setEditingSet(prev => isW ? { ...prev, editWeight: next } : { ...prev, editReps: next });
  }

  async function saveEdit() {
    const w = parseFloat(editingSet.editWeight);
    const r = parseInt(editingSet.editReps);
    if (!w || !r) return;
    const updated = { ...editingSet.set, weight: w, reps: r };
    const newSession = sessionSets.map(s => s.id === updated.id ? updated : s);
    const newRecords = records.map(r2 => r2.id === updated.id ? updated : r2);
    setSessionSets(newSession);
    setRecords(newRecords);
    await saveRecords(newRecords);
    setEditingSet(null);
    showToast('✅ Zaktualizowano');
  }

  function handleFinish() {
    const endTime = Date.now();
    pausedAtRef.current = endTime;
    pauseWorkout();
    navigation.navigate('Summary', {
      gym,
      startTime: checkInTime,
      endTime,
      sets: sessionSets,
      allRecords: records,
    });
  }

  const isBW = bwExercises.has(selectedEx);

  // Top 2 wyniki dla wybranego ćwiczenia
  const top2 = useMemo(() => {
    if (!selectedEx) return [];
    const exRecs = records.filter(r => r.exercise === selectedEx);
    const seen = new Map();
    for (const r of exRecs) {
      const eff = bwExercises.has(r.exercise) ? bodyWeight + Number(r.weight) : Number(r.weight);
      const orm = estimate1RM(eff, Number(r.reps)) || 0;
      const cur = seen.get(eff);
      if (!cur || orm > cur.orm) seen.set(eff, { eff, reps: Number(r.reps), orm, date: r.date });
    }
    return Array.from(seen.values()).sort((a, b) => b.orm - a.orm).slice(0, 2);
  }, [selectedEx, records, bodyWeight, bwExercises]);

  // Grupuj serie sesji po ćwiczeniu
  const groups = [];
  const map = new Map();
  for (const s of sessionSets) {
    if (!map.has(s.exercise)) { map.set(s.exercise, []); groups.push({ exercise: s.exercise, sets: map.get(s.exercise) }); }
    map.get(s.exercise).push(s);
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header z timerem */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.timerWrap}>
            <View style={styles.timerDot} />
            <Text style={styles.timerText}>{timerLabel}</Text>
          </View>
          {!!gym?.name && (
            <View style={styles.gymRow}>
              <Text style={styles.gymPin}>📍</Text>
              <Text style={styles.gymLabel} numberOfLines={1}>{gym.name}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.finishBtnText}>Zakończ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Dodaj ćwiczenie */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dodaj ćwiczenie</Text>

          <TouchableOpacity style={styles.picker} onPress={() => setPickerVisible(true)}>
            <Text style={styles.pickerText}>{selectedEx || 'Wybierz ćwiczenie'}</Text>
            <Text style={styles.pickerArrow}>▾</Text>
          </TouchableOpacity>

          {isBW && <Text style={styles.bwHint}>BW + dodatkowe · BW = {bodyWeight} kg</Text>}

          {/* Top 2 wyniki */}
          {top2.length > 0 && (
            <View style={styles.top2Card}>
              <Text style={styles.top2Title}>Twoje rekordy</Text>
              {top2.map((r, i) => (
                <View key={i} style={[styles.top2Row, i < top2.length - 1 && styles.top2RowBorder]}>
                  <View style={[styles.top2TrophyWrap, { backgroundColor: i === 0 ? '#FFD700' : '#A8A9AD' }]}>
                    <Text style={styles.top2TrophyIcon}>🏆</Text>
                  </View>
                  <Text style={[styles.top2Weight, { color: C.accent }]}>
                    {isBW ? `${round1(r.eff - bodyWeight)} kg` : `${round1(r.eff)} kg`}
                  </Text>
                  <Text style={styles.top2X}>×</Text>
                  <Text style={styles.top2Reps}>{r.reps} reps</Text>
                  <Text style={styles.top2Orm}>1RM ≈ {round1(r.orm)} kg</Text>
                  <Text style={styles.top2Date}>{r.date}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{isBW ? 'Dodatkowe (kg)' : 'Ciężar (kg)'}</Text>
              <TouchableOpacity
                style={[styles.input, activeField === 'weight' && styles.inputActive]}
                onPress={() => setActiveField('weight')}
                activeOpacity={0.8}
              >
                <Text style={[styles.inputVal, !weight && styles.inputPlaceholder]}>{weight || '0'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Powtórzenia</Text>
              <TouchableOpacity
                style={[styles.input, activeField === 'reps' && styles.inputActive]}
                onPress={() => setActiveField('reps')}
                activeOpacity={0.8}
              >
                <Text style={[styles.inputVal, !reps && styles.inputPlaceholder]}>{reps || '0'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {live1RM && <Text style={styles.live1rm}>🧮 1RM ≈ {live1RM} kg</Text>}

          {activeField && <CustomKeypad showDot={activeField === 'weight'} onKey={handleKey} />}

          <TouchableOpacity
            style={[styles.btn, !(selectedEx && parseFloat(weight) > 0 && parseInt(reps) > 0) && styles.btnDisabled]}
            onPress={() => { setActiveField(null); addSet(); }}
            disabled={!(selectedEx && parseFloat(weight) > 0 && parseInt(reps) > 0)}
          >
            <Text style={styles.btnText}>Zapisz serię</Text>
          </TouchableOpacity>
        </View>

        {/* Serie z tego treningu */}
        {groups.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ten trening · {sessionSets.length} {sessionSets.length === 1 ? 'seria' : sessionSets.length < 5 ? 'serie' : 'serii'}</Text>
            {groups.map(({ exercise, sets }) => (
              <View key={exercise} style={styles.group}>
                <Text style={styles.groupName}>{exercise}</Text>
                {sets.map((s, i) => (
                  <View key={s.id} style={[styles.setRow, s.isPR && styles.setRowPR]}>
                    <Text style={styles.setNum}>{i + 1}</Text>
                    <View style={styles.setWeightReps}>
                      <Text style={styles.setWeight}>
                        {bwExercises.has(exercise)
                          ? `${round1(s.bodyWeightKg || bodyWeight)} + ${round1(s.weight)} kg`
                          : `${round1(s.weight)} kg`}
                      </Text>
                      <Text style={styles.setX}>×</Text>
                      <Text style={styles.setReps}>{s.reps} reps</Text>
                    </View>
                    <View style={styles.setActions}>
                      {(s.prTypes || []).map(type => (
                        <View key={type} style={styles.prMedal}>
                          <Text style={styles.prMedalText}>{PR_ICON[type]}</Text>
                        </View>
                      ))}
                      <TouchableOpacity onPress={() => openEdit(s)} hitSlop={8} style={styles.setActionBtn}>
                        <Feather name="edit-2" size={13} color={C.muted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSet(s.id)} hitSlop={8} style={styles.setActionBtn}>
                        <Feather name="trash-2" size={13} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal — wybór ćwiczenia */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz ćwiczenie</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.modalClose}>Zamknij</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={exercises}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === selectedEx && styles.modalItemActive]}
                  onPress={() => { setSelectedEx(item); setPickerVisible(false); }}
                >
                  <Text style={[styles.modalItemText, item === selectedEx && styles.modalItemTextActive]}>{item}</Text>
                  {item === selectedEx && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal edycji serii */}
      <Modal visible={!!editingSet} animationType="slide" transparent onRequestClose={() => setEditingSet(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edytuj serię</Text>
              <TouchableOpacity onPress={() => setEditingSet(null)}>
                <Text style={styles.modalClose}>Anuluj</Text>
              </TouchableOpacity>
            </View>
            {editingSet && (
              <View style={{ padding: 16 }}>
                <Text style={styles.groupName}>{editingSet.set.exercise}</Text>
                <View style={styles.row}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Ciężar (kg)</Text>
                    <TouchableOpacity
                      style={[styles.input, editActiveField === 'weight' && styles.inputActive]}
                      onPress={() => setEditActiveField('weight')} activeOpacity={0.8}
                    >
                      <Text style={[styles.inputVal, !editingSet.editWeight && styles.inputPlaceholder]}>
                        {editingSet.editWeight || '0'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Powtórzenia</Text>
                    <TouchableOpacity
                      style={[styles.input, editActiveField === 'reps' && styles.inputActive]}
                      onPress={() => setEditActiveField('reps')} activeOpacity={0.8}
                    >
                      <Text style={[styles.inputVal, !editingSet.editReps && styles.inputPlaceholder]}>
                        {editingSet.editReps || '0'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {editActiveField && (
                  <CustomKeypad showDot={editActiveField === 'weight'} onKey={handleEditKey} />
                )}
                <TouchableOpacity
                  style={[styles.btn, { marginTop: 12 }]}
                  onPress={() => { setEditActiveField(null); saveEdit(); }}
                >
                  <Text style={styles.btnText}>Zapisz zmiany</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {!!prBanner && (
        <View style={[styles.prBannerWrap, { top: insets.top + 12 }]}>
          <View style={styles.prBannerInner}>
            <Text style={styles.prBannerTrophy}>🏆</Text>
            <View style={styles.prBannerText}>
              <Text style={styles.prBannerTitle}>NOWY REKORD!</Text>
              <Text style={styles.prBannerSub} numberOfLines={1}>{prBanner.exercise}</Text>
              <View style={styles.prBannerTags}>
                {prBanner.prTypes.map(t => (
                  <Text key={t} style={styles.prTag}>{PR_ICON[t]} {PR_LABEL[t]}</Text>
                ))}
              </View>
            </View>
            {prBanner.prTypes.includes('orm') && (
              <Text style={styles.prBannerOrm}>1RM ≈ {prBanner.orm} kg</Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  timerWrap:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerDot:     { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e' },
  timerText:    { color: C.txt, fontSize: 20, fontWeight: '800', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  gymRow:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  gymPin:       { fontSize: 10 },
  gymLabel:     { color: C.muted, fontSize: 11, letterSpacing: 1 },
  finishBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.4)',
    borderRadius: 20,
  },
  finishBtnText: { color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardTitle: { color: C.txt, fontSize: 15, fontWeight: '700', marginBottom: 12 },

  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  pickerText:  { color: C.txt, fontSize: 15, fontWeight: '600', flex: 1 },
  pickerArrow: { color: C.muted, fontSize: 18 },
  bwHint:      { color: C.muted, fontSize: 12, marginBottom: 10 },

  row:       { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputWrap: { flex: 1 },
  inputLabel: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
  inputActive:      { borderColor: C.accent, backgroundColor: 'rgba(255,71,87,0.08)' },
  inputVal:         { color: C.txt, fontSize: 22, fontWeight: '700' },
  inputPlaceholder: { color: C.muted },
  live1rm: { color: C.accent, fontSize: 14, marginBottom: 10 },
  btn: {
    backgroundColor: C.accent, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: 'rgba(129,140,248,0.25)' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  top2Card:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  top2Title:     { color: C.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  top2Row:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  top2RowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  top2TrophyWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  top2TrophyIcon: { fontSize: 13 },
  top2Weight:    { color: C.txt, fontSize: 14, fontWeight: '800' },
  top2X:         { color: C.muted, fontSize: 12 },
  top2Reps:      { color: C.txt, fontSize: 14, fontWeight: '600', marginRight: 4 },
  top2Orm:       { color: C.muted, fontSize: 10, flex: 1 },
  top2Date:      { color: C.muted, fontSize: 10 },

  group:     { marginTop: 12 },
  groupName: { color: C.txt, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  setRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  setRowPR:      { backgroundColor: 'rgba(255,215,0,0.06)' },
  prMedal: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
  },
  prMedalText: {
    fontSize: 13,
  },
  setNum:        { color: C.muted, fontSize: 12, width: 18, textAlign: 'center' },
  setWeightReps: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  setWeight:     { color: C.accent, fontSize: 14, fontWeight: '700' },
  setX:          { color: C.muted, fontSize: 12 },
  setReps:       { color: C.txt, fontSize: 14, fontWeight: '600' },
  setRepsLabel:  { color: C.muted, fontSize: 11, fontWeight: '400' },
  setActions:    { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  setActionBtn:  { padding: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet:   { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:   { color: C.txt, fontSize: 16, fontWeight: '700' },
  modalClose:   { color: C.accent, fontSize: 15 },
  modalItem:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  modalItemActive:     { backgroundColor: 'rgba(255,71,87,0.08)' },
  modalItemText:       { color: C.txt, fontSize: 15 },
  modalItemTextActive: { color: C.accent, fontWeight: '700' },
  modalCheck: { color: C.accent, fontSize: 16, fontWeight: '700' },

  toast: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: 'rgba(30,30,40,0.95)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  toastText: { color: C.txt, fontSize: 14 },

  prBannerWrap: {
    position: 'absolute', left: 16, right: 16,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  prBannerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1500',
    borderWidth: 1, borderColor: '#FFD70066',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
  },
  prBannerTrophy:  { fontSize: 32 },
  prBannerText:    { flex: 1 },
  prBannerTitle:   { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  prBannerSub:     { color: 'rgba(255,215,0,0.6)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  prBannerTags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  prTag:           { color: '#1a1500', backgroundColor: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  prBannerOrm:     { color: '#FFD700', fontSize: 15, fontWeight: '800' },
});

const kbStyles = StyleSheet.create({
  wrap: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 8, gap: 6,
  },
  row:      { flexDirection: 'row', gap: 6 },
  key:      { flex: 1, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 10, alignItems: 'center' },
  keyEmpty: { flex: 1 },
  keyBack:  { backgroundColor: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.2)' },
  keyTxt:     { color: '#f1f5f9', fontSize: 18, fontWeight: '600' },
  keyBackTxt: { color: '#FF4757', fontSize: 18 },
});
