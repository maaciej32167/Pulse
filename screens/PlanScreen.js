import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { loadExercises, loadPlans, savePlans, generateUUID } from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS } from '../src/colors';

const C = {
  bg:     '#0A0A0C',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  txt:    '#f1f5f9',
  muted:  '#64748b',
  sub:    '#99aabb',
  accent: COLORS.plan,
  cyan:   '#00F5FF',
  coral:  '#FF4757',
  gold:   '#FFD700',
  green:  '#22c55e',
};

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function startOfDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getMondayTs(ts) {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7; // 0=Pn
  return startOfDay(ts - dow * 86400000);
}

function fmtDay(ts) {
  return new Date(ts).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtShort(ts) {
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export default function PlanScreen({ navigation }) {
  const [exercises, setExercises]   = useState([]);
  const [plans, setPlans]           = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(startOfDay(Date.now()));
  const [pending, setPending]       = useState([]); // [{exercise, note}]
  const [showExPicker, setShowExPicker] = useState(false);
  const [exQuery, setExQuery]       = useState('');
  const [noteVal, setNoteVal]       = useState('');
  const [selectedEx, setSelectedEx] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [ex, pl] = await Promise.all([loadExercises(), loadPlans()]);
        setExercises(ex.sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })));
        setPlans(pl);
        if (ex.length > 0) setSelectedEx(ex[0]);
      })();
    }, [])
  );

  // ── Kalendarz tygodniowy ───────────────────────────────────────────────
  const mondayTs = useMemo(() => getMondayTs(Date.now()) + weekOffset * 7 * 86400000, [weekOffset]);
  const todayTs  = useMemo(() => startOfDay(Date.now()), []);
  const plannedDays = useMemo(() => new Set(plans.map(p => p.dayTs)), [plans]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      ts:       mondayTs + i * 86400000,
      label:    DAYS[i],
      date:     new Date(mondayTs + i * 86400000).getDate(),
    })),
    [mondayTs]
  );

  const weekLabel = useMemo(() => {
    const s = new Date(mondayTs);
    const e = new Date(mondayTs + 6 * 86400000);
    return `${s.getDate()}.${s.getMonth()+1} – ${e.getDate()}.${e.getMonth()+1}`;
  }, [mondayTs]);

  // ── Dodaj ćwiczenie do pending ─────────────────────────────────────────
  function addPending() {
    if (!selectedEx) return;
    setPending(prev => [...prev, { exercise: selectedEx, note: noteVal.trim() }]);
    setNoteVal('');
  }

  function removePending(idx) {
    setPending(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Zapisz plan ───────────────────────────────────────────────────────
  async function savePlan() {
    if (!pending.length) {
      Alert.alert('Brak ćwiczeń', 'Dodaj przynajmniej jedno ćwiczenie do planu.');
      return;
    }
    const newPlan = {
      id:        generateUUID(),
      dayTs:     selectedDay,
      date:      fmtDay(selectedDay),
      exercises: pending.slice(),
      timestamp: Date.now(),
    };
    const updated = [...plans, newPlan];
    setPlans(updated);
    await savePlans(updated);
    setPending([]);
    Alert.alert('Zapisano', `Plan na ${fmtShort(selectedDay)} został zapisany.`);
  }

  // ── Usuń plan ─────────────────────────────────────────────────────────
  function deletePlan(id) {
    Alert.alert('Usuń plan', 'Usunąć ten plan treningowy?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń', style: 'destructive',
        onPress: async () => {
          const updated = plans.filter(p => p.id !== id);
          setPlans(updated);
          await savePlans(updated);
        },
      },
    ]);
  }

  // ── Usuń ćwiczenie z planu ────────────────────────────────────────────
  async function deletePlanEx(planId, exIdx) {
    const updated = plans.map(p => {
      if (p.id !== planId) return p;
      const newEx = p.exercises.filter((_, i) => i !== exIdx);
      return newEx.length ? { ...p, exercises: newEx } : null;
    }).filter(Boolean);
    setPlans(updated);
    await savePlans(updated);
  }

  const sortedPlans = useMemo(() =>
    [...plans].sort((a, b) => a.dayTs - b.dayTs),
    [plans]
  );

  const filteredEx = useMemo(() => {
    const q = exQuery.trim().toLowerCase();
    return q ? exercises.filter(e => e.toLowerCase().includes(q)) : exercises;
  }, [exercises, exQuery]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="calendar" label="PLAN" color={COLORS.plan} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Tygodniowy kalendarz ── */}
        <View style={styles.calCard}>
          <View style={styles.calNav}>
            <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} hitSlop={12}>
              <Feather name="chevron-left" size={22} color={C.txt} />
            </TouchableOpacity>
            <Text style={styles.calNavLabel}>{weekLabel}</Text>
            <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} hitSlop={12}>
              <Feather name="chevron-right" size={22} color={C.txt} />
            </TouchableOpacity>
          </View>

          <View style={styles.calRow}>
            {weekDays.map(({ ts, label, date }) => {
              const isToday    = ts === todayTs;
              const isSelected = ts === selectedDay;
              const hasPlan    = plannedDays.has(ts);
              return (
                <TouchableOpacity
                  key={ts}
                  style={[
                    styles.calCell,
                    isToday    && styles.calCellToday,
                    isSelected && styles.calCellSelected,
                  ]}
                  onPress={() => setSelectedDay(ts)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.calDayLabel, isSelected && { color: '#fff' }]}>{label}</Text>
                  <Text style={[styles.calDate, isToday && styles.calDateToday, isSelected && { color: '#fff', fontWeight: '900' }]}>
                    {date}
                  </Text>
                  {hasPlan && <View style={[styles.planDot, isSelected && { backgroundColor: '#fff' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Wybrany dzień ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDay === todayTs ? '📍 Dzisiaj' : fmtShort(selectedDay)}
          </Text>

          {/* Picker ćwiczenia */}
          <TouchableOpacity style={styles.exPicker} onPress={() => setShowExPicker(true)}>
            <Text style={styles.exPickerText} numberOfLines={1}>
              {selectedEx || 'Wybierz ćwiczenie'}
            </Text>
            <Feather name="chevron-down" size={16} color={C.muted} />
          </TouchableOpacity>

          {/* Notatka */}
          <TextInput
            style={styles.noteInput}
            value={noteVal}
            onChangeText={setNoteVal}
            placeholder="Notatka (opcjonalnie)"
            placeholderTextColor={C.muted}
          />

          <TouchableOpacity style={styles.addExBtn} onPress={addPending} activeOpacity={0.8}>
            <Feather name="plus" size={16} color={C.accent} />
            <Text style={styles.addExBtnText}>Dodaj ćwiczenie</Text>
          </TouchableOpacity>

          {/* Pending lista */}
          {pending.length > 0 && (
            <View style={styles.pendingWrap}>
              {pending.map((item, idx) => (
                <View key={idx} style={styles.pendingRow}>
                  <View style={styles.pendingLeft}>
                    <Text style={styles.pendingNum}>{idx + 1}</Text>
                    <View>
                      <Text style={styles.pendingName}>{item.exercise}</Text>
                      {!!item.note && <Text style={styles.pendingNote}>{item.note}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removePending(idx)} hitSlop={8}>
                    <Feather name="x" size={16} color={C.coral} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={savePlan} activeOpacity={0.8}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Zapisz plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Zapisane plany ── */}
        {sortedPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zaplanowane</Text>
            {sortedPlans.map(p => {
              const isPast  = p.dayTs < todayTs;
              const isToday = p.dayTs === todayTs;
              return (
                <View key={p.id} style={[styles.planCard, isPast && { opacity: 0.6 }]}>
                  <View style={styles.planCardHeader}>
                    <Text style={[styles.planCardDate, isToday && { color: C.green }]}>
                      {isToday ? '📍 Dzisiaj' : fmtShort(p.dayTs)} · {new Date(p.dayTs).toLocaleDateString('pl-PL', { weekday: 'short' })}
                    </Text>
                    <TouchableOpacity onPress={() => deletePlan(p.id)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={C.coral} />
                    </TouchableOpacity>
                  </View>
                  {p.exercises.map((ex, i) => (
                    <View key={i} style={[styles.planExRow, i > 0 && styles.planExRowBorder]}>
                      <Text style={styles.planExNum}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planExName}>{ex.exercise}</Text>
                        {!!ex.note && <Text style={styles.planExNote}>{ex.note}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => deletePlanEx(p.id, i)} hitSlop={8}>
                        <Feather name="x" size={13} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal picker ćwiczenia ── */}
      <Modal visible={showExPicker} transparent animationType="slide" onRequestClose={() => setShowExPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Wybierz ćwiczenie</Text>
              <TouchableOpacity onPress={() => setShowExPicker(false)} hitSlop={12}>
                <Feather name="x" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Feather name="search" size={14} color={C.muted} />
              <TextInput
                style={styles.pickerSearchInput}
                value={exQuery}
                onChangeText={setExQuery}
                placeholder="Szukaj…"
                placeholderTextColor={C.muted}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredEx}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item === selectedEx && styles.pickerItemActive]}
                  onPress={() => { setSelectedEx(item); setExQuery(''); setShowExPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, item === selectedEx && { color: C.accent }]}>
                    {item}
                  </Text>
                  {item === selectedEx && <Feather name="check" size={16} color={C.accent} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },

  // Kalendarz
  calCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 16, marginBottom: 16,
  },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavLabel: { color: C.txt, fontSize: 13, fontWeight: '700' },
  calRow:  { flexDirection: 'row', gap: 4 },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  calCellToday:    { borderColor: C.accent + '60' },
  calCellSelected: { backgroundColor: C.accent, borderColor: C.accent },
  calDayLabel: { color: C.muted, fontSize: 9, fontWeight: '700', marginBottom: 4 },
  calDate:     { color: C.txt, fontSize: 14, fontWeight: '700' },
  calDateToday:{ color: C.accent },
  planDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.accent, marginTop: 3 },

  // Sekcja
  section: { marginBottom: 16 },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },

  exPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  exPickerText: { color: C.txt, fontSize: 14, fontWeight: '600', flex: 1 },

  noteInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: C.txt, fontSize: 13, marginBottom: 8,
  },

  addExBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: C.accent + '50', borderRadius: 12,
    paddingVertical: 10, backgroundColor: C.accent + '12',
  },
  addExBtnText: { color: C.accent, fontSize: 13, fontWeight: '700' },

  // Pending
  pendingWrap: { marginTop: 12 },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pendingNum:  { color: C.muted, fontSize: 11, fontWeight: '800', width: 18 },
  pendingName: { color: C.txt, fontSize: 14, fontWeight: '600' },
  pendingNote: { color: C.muted, fontSize: 11, marginTop: 1 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13, marginTop: 14,
    shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  // Zapisane plany
  planCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  planCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.accent + '0A',
  },
  planCardDate: { color: C.accent, fontSize: 13, fontWeight: '800' },
  planExRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 10 },
  planExRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  planExNum:  { color: C.muted, fontSize: 10, fontWeight: '800', width: 16 },
  planExName: { color: C.txt, fontSize: 13, fontWeight: '600' },
  planExNote: { color: C.muted, fontSize: 11, marginTop: 1 },

  // Modal picker
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerSheet: {
    backgroundColor: '#111318', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pickerTitle: { color: C.txt, fontSize: 16, fontWeight: '700' },
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, height: 40,
  },
  pickerSearchInput: { flex: 1, color: C.txt, fontSize: 14 },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border + '80',
  },
  pickerItemActive: { backgroundColor: C.accent + '10' },
  pickerItemText: { color: C.txt, fontSize: 15 },
});
