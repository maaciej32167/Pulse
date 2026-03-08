import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadExercises, loadRecords, saveRecords, loadBodyWeight, loadBWExercises } from '../src/storage';
import { estimate1RM, round1, effectiveWeight, todayPL, generateId } from '../src/utils';

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#0A0A0C', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  txt: '#f1f5f9', muted: '#64748b', accent: '#FF4757',
};

// ─── timer ────────────────────────────────────────────────────────────────────

function useTimer(startTime) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const label = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return { elapsed, label };
}

// ─── custom keypad ────────────────────────────────────────────────────────────

const KEYS = [['7','8','9'],['4','5','6'],['1','2','3'],['.','0','⌫']];

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
  const { label: timerLabel } = useTimer(checkInTime);

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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    async function init() {
      const ex  = await loadExercises();
      const rec = await loadRecords();
      const bw  = await loadBodyWeight();
      const bwEx = await loadBWExercises();
      setExercises(ex);
      setRecords(rec);
      setBodyWeight(bw);
      setBwExercises(bwEx);
      setSelectedEx(ex[0] || '');
    }
    init();
  }, []);

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
    const newRecord = {
      id: generateId(),
      exercise: selectedEx,
      weight: w, reps: r,
      date: todayPL(),
      timestamp: Date.now(),
      bodyWeightKg: bodyWeight,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    setSessionSets(prev => [...prev, newRecord]);
    await saveRecords(updated);
    setWeight('');
    setReps('');
    setActiveField(null);
    showToast('✅ Zapisano');
  }

  function handleFinish() {
    Alert.alert(
      'Zakończyć trening?',
      `Zapisano ${sessionSets.length} serii.`,
      [
        { text: 'Kontynuuj', style: 'cancel' },
        {
          text: 'Zakończ',
          onPress: () => {
            navigation.navigate('Summary', {
              gym,
              startTime: checkInTime,
              endTime: Date.now(),
              sets: sessionSets,
              allRecords: records,
            });
          },
        },
      ]
    );
  }

  const isBW = bwExercises.has(selectedEx);

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
          <Text style={styles.gymLabel} numberOfLines={1}>{gym.name}</Text>
        </View>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.finishBtnText}>Zakończ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Dodaj serię */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dodaj serię</Text>

          <TouchableOpacity style={styles.picker} onPress={() => setPickerVisible(true)}>
            <Text style={styles.pickerText}>{selectedEx || 'Wybierz ćwiczenie'}</Text>
            <Text style={styles.pickerArrow}>▾</Text>
          </TouchableOpacity>

          {isBW && <Text style={styles.bwHint}>BW + dodatkowe · BW = {bodyWeight} kg</Text>}

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
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setNum}>{i + 1}</Text>
                    <View style={styles.setWeightReps}>
                      <Text style={styles.setWeight}>
                        {bwExercises.has(exercise)
                          ? `${round1(s.bodyWeightKg || bodyWeight)} + ${round1(s.weight)} kg`
                          : `${round1(s.weight)} kg`}
                      </Text>
                      <Text style={styles.setX}>×</Text>
                      <Text style={styles.setReps}>{s.reps} <Text style={styles.setRepsLabel}>sets</Text></Text>
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

      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
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
  gymLabel:     { color: C.muted, fontSize: 11, letterSpacing: 1, marginTop: 2 },
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

  group:     { marginTop: 12 },
  groupName: { color: C.txt, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  setRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  setNum:        { color: C.muted, fontSize: 12, width: 18, textAlign: 'center' },
  setWeightReps: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  setWeight:     { color: C.accent, fontSize: 14, fontWeight: '700' },
  setX:          { color: C.muted, fontSize: 12 },
  setReps:       { color: C.txt, fontSize: 14, fontWeight: '600' },
  setRepsLabel:  { color: C.muted, fontSize: 11, fontWeight: '400' },

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
