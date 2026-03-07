import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadExercises, loadRecords, saveRecords, loadBodyWeight, loadBWExercises } from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';
import { estimate1RM, round1, effectiveWeight, todayPL, generateId } from '../src/utils';

// ─── helpers kalendarza ────────────────────────────────────────────────────
const MS_DAY = 86400000;

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getMondayTs(ts) {
  const d = new Date(ts);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function calcCalendar(records) {
  const trainedDays = new Set(
    records.filter(r => r.timestamp > 0).map(r => startOfDay(r.timestamp))
  );
  const now = Date.now();
  const todayTs = startOfDay(now);
  const curMondayTs = getMondayTs(now);

  // Streak — tygodnie z rzędu z ≥3 treningami
  let streak = 0;
  let checkMon = curMondayTs;
  while (true) {
    let cnt = 0;
    for (let d = 0; d < 7; d++) {
      const dt = checkMon + d * MS_DAY;
      if (dt <= todayTs && trainedDays.has(dt)) cnt++;
    }
    if (cnt >= 3) { streak++; checkMon -= 7 * MS_DAY; }
    else break;
  }

  // Dni bieżącego tygodnia
  const days = [];
  for (let d = 0; d < 7; d++) {
    const dayTs = curMondayTs + d * MS_DAY;
    days.push({
      num: new Date(dayTs).getDate(),
      trained: trainedDays.has(dayTs),
      isToday: dayTs === todayTs,
      isFuture: dayTs > todayTs,
    });
  }

  // Licznik bieżącego tygodnia
  const curWeekCnt = days.filter(d => !d.isFuture && d.trained).length;

  return { days, streak, curWeekCnt };
}

// ─── komponent kalendarza ─────────────────────────────────────────────────
const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function WeekCalendar({ records }) {
  const { days, streak, curWeekCnt } = calcCalendar(records);
  const needed = Math.max(0, 3 - curWeekCnt);

  return (
    <View style={styles.card}>
      {/* Nagłówek */}
      <View style={styles.calHeader}>
        <Text style={styles.cardTitle}>Aktywność</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              🔥 {streak} {streak === 1 ? 'tydzień' : streak < 5 ? 'tygodnie' : 'tygodni'}
            </Text>
          </View>
        )}
      </View>

      {/* Nagłówki dni */}
      <View style={styles.calRow}>
        {DAY_LABELS.map(l => (
          <Text key={l} style={styles.calDayLabel}>{l}</Text>
        ))}
      </View>

      {/* Komórki */}
      <View style={styles.calRow}>
        {days.map((d, i) => (
          <View
            key={i}
            style={[
              styles.calCell,
              d.trained && styles.calCellTrained,
              d.isToday && !d.trained && styles.calCellToday,
              d.isToday && d.trained && styles.calCellTrainedToday,
              d.isFuture && styles.calCellFuture,
            ]}
          >
            <Text style={[
              styles.calCellNum,
              d.trained && styles.calCellNumTrained,
              d.isToday && !d.trained && styles.calCellNumToday,
            ]}>
              {d.num}
            </Text>
          </View>
        ))}
      </View>

      {/* Podpowiedź */}
      <Text style={[styles.calHint, needed === 0 && styles.calHintDone]}>
        {needed === 0
          ? '✓ Ten tydzień zaliczony do passy'
          : `Ten tydzień: ${curWeekCnt}/3 — jeszcze ${needed} do zaliczenia`}
      </Text>
    </View>
  );
}

// ─── dzisiejszy trening ───────────────────────────────────────────────────
function TodaySection({ records, bwExercises, bodyWeight, onDelete, onEditSave }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  const todayStart = startOfDay(Date.now());
  const todayRecords = records.filter(r => startOfDay(r.timestamp) === todayStart);

  // Grupuj po ćwiczeniu (zachowaj kolejność pierwszego pojawienia)
  const groups = [];
  const map = new Map();
  for (const r of todayRecords) {
    if (!map.has(r.exercise)) {
      map.set(r.exercise, []);
      groups.push({ exercise: r.exercise, sets: map.get(r.exercise) });
    }
    map.get(r.exercise).push(r);
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditWeight(String(r.weight));
    setEditReps(String(r.reps));
  }

  async function saveEdit(id) {
    await onEditSave(id, editWeight, editReps);
    setEditingId(null);
  }

  const count = todayRecords.length;
  const plural = count === 1 ? 'seria' : count < 5 ? 'serie' : 'serii';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.cardTitle}>
          Dzisiejszy trening
          {count > 0 && (
            <Text style={styles.sectionCount}> · {count} {plural}</Text>
          )}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </TouchableOpacity>

      {open && (
        count === 0
          ? <Text style={styles.emptyText}>Brak serii dzisiaj</Text>
          : groups.map(({ exercise, sets }) => (
              <View key={exercise} style={styles.todayGroup}>
                <Text style={styles.todayExName}>{exercise}</Text>
                {sets.map(r => (
                  editingId === r.id ? (
                    <View key={r.id} style={styles.editRow}>
                      <TextInput
                        style={styles.editInput}
                        value={editWeight}
                        onChangeText={setEditWeight}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <Text style={styles.editSep}>kg ×</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editReps}
                        onChangeText={setEditReps}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                      <Text style={styles.editSep}>powt.</Text>
                      <TouchableOpacity onPress={() => saveEdit(r.id)} hitSlop={8} style={styles.actionBtn}>
                        <Feather name="check" size={16} color="#4ade80" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8} style={styles.actionBtn}>
                        <Feather name="x" size={16} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View key={r.id} style={styles.setRow}>
                      <Text style={styles.setWeight}>
                        {bwExercises.has(exercise)
                          ? `${round1(r.bodyWeightKg || bodyWeight)} + ${round1(r.weight)} kg`
                          : `${round1(r.weight)} kg`}
                      </Text>
                      <Text style={styles.setReps}>× {r.reps} powt.</Text>
                      <View style={styles.setActions}>
                        <TouchableOpacity onPress={() => startEdit(r)} hitSlop={8} style={styles.actionBtn}>
                          <Feather name="edit-2" size={14} color={C.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDelete(r.id)} hitSlop={8} style={styles.actionBtn}>
                          <Feather name="trash-2" size={14} color="#f87171" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                ))}
              </View>
            ))
      )}
    </View>
  );
}

// ─── custom keypad ────────────────────────────────────────────────────────
const KEYS = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['.','0','⌫'],
];

function CustomKeypad({ showDot, onKey }) {
  return (
    <View style={kbStyles.wrap}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={kbStyles.row}>
          {row.map(k => {
            if (k === '.' && !showDot) {
              return <View key={k} style={kbStyles.keyEmpty} />;
            }
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

// ─── główny ekran ─────────────────────────────────────────────────────────
export default function StartScreen({ navigation }) {
  const [exercises, setExercises] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedEx, setSelectedEx] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [bodyWeight, setBodyWeight] = useState(80);
  const [bwExercises, setBwExercises] = useState(new Set());
  const [live1RM, setLive1RM] = useState(null);
  const [toast, setToast] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'weight' | 'reps' | null

  function handleKey(k) {
    const current = activeField === 'weight' ? weight : reps;
    const setter  = activeField === 'weight' ? setWeight : setReps;
    if (k === '⌫') { setter(current.slice(0, -1)); return; }
    if (k === '.' && (current.includes('.') || activeField === 'reps')) return;
    if (current.length >= 6) return;
    setter(current + k);
  }

  useEffect(() => {
    async function init() {
      const ex = await loadExercises();
      const rec = await loadRecords();
      const bw = await loadBodyWeight();
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
      const orm = estimate1RM(eff, r);
      setLive1RM(orm ? round1(orm) : null);
    } else {
      setLive1RM(null);
    }
  }, [weight, reps, selectedEx]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function addRecord() {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!selectedEx || w <= 0 || r <= 0) {
      Alert.alert('Błąd', 'Wybierz ćwiczenie i podaj ciężar oraz powtórzenia.');
      return;
    }
    const newRecord = {
      id: generateId(),
      exercise: selectedEx,
      weight: w,
      reps: r,
      date: todayPL(),
      timestamp: Date.now(),
      bodyWeightKg: bodyWeight,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    await saveRecords(updated);
    setWeight('');
    setReps('');
    showToast('✅ Zapisano');
  }

  async function handleDelete(id) {
    Alert.alert(
      'Usuń serię',
      'Czy na pewno chcesz usunąć tę serię?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            const updated = records.filter(r => r.id !== id);
            setRecords(updated);
            await saveRecords(updated);
          },
        },
      ]
    );
  }

  async function handleEditSave(id, weightStr, repsStr) {
    const w = parseFloat(weightStr);
    const r = parseInt(repsStr);
    if (!w || w <= 0 || !r || r <= 0) return;
    const updated = records.map(rec =>
      rec.id === id ? { ...rec, weight: w, reps: r } : rec
    );
    setRecords(updated);
    await saveRecords(updated);
  }

  const exRecords = records.filter(r => r.exercise === selectedEx);
  const topPR = exRecords.reduce((best, r) => {
    const eff = effectiveWeight(r, bwExercises, bodyWeight);
    const bestEff = best ? effectiveWeight(best, bwExercises, bodyWeight) : 0;
    return eff > bestEff ? r : best;
  }, null);

  const isBW = bwExercises.has(selectedEx);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="zap" label="TRENING" color="#FF4757" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Kalendarz aktywności */}
        <WeekCalendar records={records} />

        {/* Dodaj serię */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dodaj serię</Text>

          <TouchableOpacity style={styles.picker} onPress={() => setPickerVisible(true)}>
            <Text style={styles.pickerText}>{selectedEx || 'Wybierz ćwiczenie'}</Text>
            <Text style={styles.pickerArrow}>▾</Text>
          </TouchableOpacity>

          {isBW && (
            <Text style={styles.bwHint}>BW + dodatkowe • BW = {bodyWeight} kg</Text>
          )}

          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{isBW ? 'Dodatkowe (kg)' : 'Ciężar (kg)'}</Text>
              <TouchableOpacity
                style={[styles.input, activeField === 'weight' && styles.inputActive]}
                onPress={() => setActiveField('weight')}
                activeOpacity={0.8}
              >
                <Text style={[styles.inputVal, !weight && styles.inputPlaceholder]}>
                  {weight || '0'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Powtórzenia</Text>
              <TouchableOpacity
                style={[styles.input, activeField === 'reps' && styles.inputActive]}
                onPress={() => setActiveField('reps')}
                activeOpacity={0.8}
              >
                <Text style={[styles.inputVal, !reps && styles.inputPlaceholder]}>
                  {reps || '0'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {live1RM && (
            <Text style={styles.live1rm}>🧮 1RM ≈ {live1RM} kg</Text>
          )}

          {activeField && (
            <CustomKeypad
              showDot={activeField === 'weight'}
              onKey={handleKey}
            />
          )}

          <TouchableOpacity style={styles.btn} onPress={() => { setActiveField(null); addRecord(); }}>
            <Text style={styles.btnText}>Zapisz serię</Text>
          </TouchableOpacity>
        </View>

        {/* Rekord */}
        {topPR && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Rekord — {selectedEx}</Text>
            <Text style={styles.prNum}>
              {isBW
                ? `${round1(topPR.bodyWeightKg || bodyWeight)} + ${round1(topPR.weight)} kg`
                : `${round1(effectiveWeight(topPR, bwExercises, bodyWeight))} kg`
              } × {topPR.reps} powt.
            </Text>
            <Text style={styles.prDate}>{topPR.date}</Text>
          </View>
        )}

        {/* Dzisiejszy trening */}
        <TodaySection
          records={records}
          bwExercises={bwExercises}
          bodyWeight={bodyWeight}
          onDelete={handleDelete}
          onEditSave={handleEditSave}
        />

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
                  <Text style={[styles.modalItemText, item === selectedEx && styles.modalItemTextActive]}>
                    {item}
                  </Text>
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

const C = {
  bg: '#080808', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  txt: '#f1f5f9', muted: '#64748b', accent: '#FF4757', accent2: '#FF7080',
  trained: '#16a34a',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardTitle: { color: C.txt, fontSize: 15, fontWeight: '700', marginBottom: 12 },

  // Kalendarz
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.muted, textTransform: 'uppercase' },
  calCell: {
    flex: 1, aspectRatio: 1, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  calCellTrained: { backgroundColor: C.trained },
  calCellToday: { borderWidth: 2, borderColor: C.accent },
  calCellTrainedToday: { backgroundColor: C.trained, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  calCellFuture: { opacity: 0.2 },
  calCellNum: { fontSize: 11, fontWeight: '700', color: C.muted },
  calCellNumTrained: { color: '#fff' },
  calCellNumToday: { color: C.accent },
  calHint: { marginTop: 8, fontSize: 12, color: C.muted },
  calHintDone: { color: '#4ade80', fontWeight: '700' },
  streakBadge: {
    backgroundColor: 'rgba(255,71,87,0.15)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.35)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  streakText: { fontSize: 13, fontWeight: '900', color: C.txt },

  // Formularz
  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  pickerText: { color: C.txt, fontSize: 15, fontWeight: '600', flex: 1 },
  pickerArrow: { color: C.muted, fontSize: 18 },
  bwHint: { color: C.muted, fontSize: 12, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputWrap: { flex: 1 },
  inputLabel: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
  inputActive: {
    borderColor: C.accent, backgroundColor: 'rgba(255,71,87,0.08)',
  },
  inputVal: { color: C.txt, fontSize: 22, fontWeight: '700' },
  inputPlaceholder: { color: C.muted },
  live1rm: { color: C.accent, fontSize: 14, marginBottom: 10 },
  btn: {
    backgroundColor: C.accent, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  prNum: { color: C.accent, fontSize: 24, fontWeight: '900', marginBottom: 4 },
  prDate: { color: C.muted, fontSize: 13 },

  // Dzisiejszy trening
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionCount: { color: C.muted, fontWeight: '400', fontSize: 13 },
  emptyText: { color: C.muted, fontSize: 13, marginTop: 10 },
  todayGroup: { marginTop: 12 },
  todayExName: {
    color: C.txt, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  setRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  setWeight: { color: C.accent, fontSize: 14, fontWeight: '700', flex: 1 },
  setReps: { color: C.txt, fontSize: 13, marginRight: 10 },
  setActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 4 },
  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    color: C.txt, fontSize: 14, fontWeight: '700',
    width: 54, textAlign: 'center',
  },
  editSep: { color: C.muted, fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { color: C.txt, fontSize: 16, fontWeight: '700' },
  modalClose: { color: C.accent, fontSize: 15 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  modalItemActive: { backgroundColor: 'rgba(129,140,248,0.1)' },
  modalItemText: { color: C.txt, fontSize: 15 },
  modalItemTextActive: { color: C.accent, fontWeight: '700' },
  modalCheck: { color: C.accent, fontSize: 16, fontWeight: '700' },

  // Toast
  toast: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: 'rgba(30,30,40,0.95)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  toastText: { color: C.txt, fontSize: 14 },
});

const kbStyles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 8, gap: 6,
  },
  row: { flexDirection: 'row', gap: 6 },
  key: {
    flex: 1, paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { flex: 1 },
  keyBack: { backgroundColor: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.2)' },
  keyTxt: { color: '#f1f5f9', fontSize: 18, fontWeight: '600' },
  keyBackTxt: { color: '#FF4757', fontSize: 18 },
});
