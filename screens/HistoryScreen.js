import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { loadRecords, saveRecords, loadBodyWeight, loadBWExercises, loadExercises } from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';
import { effectiveWeight, estimate1RM, round1 } from '../src/utils';

const C = {
  bg: '#080808', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  txt: '#f1f5f9', muted: '#64748b', accent: '#FFD700', accent2: '#FFE566',
  danger: '#f87171',
};

// ─── helpers ──────────────────────────────────────────────────────────────

function startOfDay(ts) {
  if (!ts) return 0;
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function fmtWeight(record, bwExercises, bodyWeight) {
  if (bwExercises.has(record.exercise)) {
    const bw = record.bodyWeightKg || bodyWeight;
    return `${round1(bw)} + ${round1(record.weight)} kg`;
  }
  return `${round1(record.weight)} kg`;
}

function fmtRowWeight(row) {
  if (row.bw && row.bwAt != null) return `${round1(row.bwAt)} + ${round1(row.extra)} kg`;
  return row.eff > 0 ? `${round1(row.eff)} kg` : '—';
}

function getTopSeries(records, bwExercises, bodyWeight, filterEx, sortKey, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1;
  const sorter = (a, b) => {
    if (sortKey === 'reps') return dir * (a.reps - b.reps);
    if (sortKey === 'date') return dir * (a.ts - b.ts);
    if (sortKey === 'orm')  return dir * ((a.orm || 0) - (b.orm || 0));
    return dir * (a.eff - b.eff); // 'weight'
  };

  const toRow = r => {
    const eff = effectiveWeight(r, bwExercises, bodyWeight);
    const orm = estimate1RM(eff, Number(r.reps));
    const bwAt = typeof r.bodyWeightKg === 'number' ? r.bodyWeightKg : null;
    return {
      id: r.id,
      ex: r.exercise,
      eff,
      extra: Number(r.weight) || 0,
      bwAt,
      reps: Number(r.reps) || 0,
      date: r.date,
      ts: r.timestamp || 0,
      orm,
      bw: bwExercises.has(r.exercise),
    };
  };

  if (filterEx) {
    // filtr: grupuj wg eff, zostaw max reps per ciężar
    const byWeight = new Map();
    for (const r of records.filter(r => r.exercise === filterEx)) {
      const row = toRow(r);
      const cur = byWeight.get(row.eff);
      if (!cur || row.reps > cur.reps) byWeight.set(row.eff, row);
    }
    return Array.from(byWeight.values()).sort(sorter);
  }

  // wszystkie ćwiczenia: 1 najlepszy wpis per ćwiczenie
  const best = new Map();
  for (const r of records) {
    const row = toRow(r);
    const cur = best.get(r.exercise);
    if (!cur || row.eff > cur.eff || (row.eff === cur.eff && row.reps > cur.reps))
      best.set(r.exercise, row);
  }
  return Array.from(best.values()).sort(sorter);
}

// ─── ExercisePicker (modal) ───────────────────────────────────────────────

function ExercisePicker({ visible, exercises, value, onSelect, onClose, allLabel = 'Wszystkie ćwiczenia' }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtruj po ćwiczeniu</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>Zamknij</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={['', ...exercises]}
            keyExtractor={item => item || '__all__'}
            renderItem={({ item }) => {
              const label = item || allLabel;
              const active = value === item;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, active && styles.modalItemActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{label}</Text>
                  {active && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── SortButton ───────────────────────────────────────────────────────────

function SortButton({ label, active, dir, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.sortBtn, active && styles.sortBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>
        {label} {active ? (dir === 'desc' ? '↓' : '↑') : '↓'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ListaView ────────────────────────────────────────────────────────────

function ListaView({ records, exercises, bodyWeight, bwExercises, onDelete, onEditSave }) {
  const [filterEx, setFilterEx] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  const filtered = filterEx
    ? records.filter(r => r.exercise === filterEx)
    : records;

  function startEdit(item) {
    setEditingId(String(item.id));
    setEditWeight(String(item.weight));
    setEditReps(String(item.reps));
  }

  async function saveEdit(id) {
    await onEditSave(id, editWeight, editReps);
    setEditingId(null);
  }

  function confirmDelete(id) {
    Alert.alert('Usuń serię', 'Czy na pewno chcesz usunąć tę serię?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  }

  function renderItem({ item }) {
    const isEditing = editingId === String(item.id);
    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowEx} numberOfLines={1}>{item.exercise}</Text>
            <Text style={styles.rowDate}>{item.date || '—'}</Text>
          </View>
          {isEditing ? (
            <View style={styles.editRight}>
              <TextInput style={styles.editInput} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" selectTextOnFocus />
              <Text style={styles.editSep}>kg ×</Text>
              <TextInput style={styles.editInput} value={editReps} onChangeText={setEditReps} keyboardType="number-pad" selectTextOnFocus />
              <Text style={styles.editSep}>p.</Text>
              <TouchableOpacity onPress={() => saveEdit(item.id)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="check" size={16} color="#4ade80" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="x" size={16} color={C.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.rowRight}>
              <Text style={styles.rowWeight}>{fmtWeight(item, bwExercises, bodyWeight)}</Text>
              <Text style={styles.rowReps}>×{item.reps}</Text>
              <TouchableOpacity onPress={() => startEdit(item)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="edit-2" size={13} color={C.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="trash-2" size={13} color={C.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.toolRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.filterBtnText} numberOfLines={1}>
            {filterEx || 'Wszystkie ćwiczenia'}
          </Text>
          <Text style={styles.filterArrow}>▾</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.count}>
        {filtered.length} {filtered.length === 1 ? 'wpis' : filtered.length < 5 ? 'wpisy' : 'wpisów'}
      </Text>
      {filtered.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Brak wpisów</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
      <ExercisePicker
        visible={pickerVisible}
        exercises={exercises}
        value={filterEx}
        onSelect={setFilterEx}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}

// ─── TopSerieView ─────────────────────────────────────────────────────────

function TopSerieView({ records, exercises, bodyWeight, bwExercises, onDelete, onEditSave }) {
  const [filterEx, setFilterEx] = useState('');
  const [sortKey, setSortKey] = useState('weight');
  const [sortDir, setSortDir] = useState('desc');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const rows = getTopSeries(records, bwExercises, bodyWeight, filterEx, sortKey, sortDir);

  const SORT_BTNS = [
    { key: 'weight', label: 'Ciężar' },
    { key: 'reps',   label: 'Powt.' },
    { key: 'orm',    label: '1RM' },
    { key: 'date',   label: 'Data' },
  ];

  function startEdit(item) {
    // znajdź oryginalny rekord po id
    const orig = records.find(r => String(r.id) === String(item.id));
    if (!orig) return;
    setEditingId(String(item.id));
    setEditWeight(String(orig.weight));
    setEditReps(String(orig.reps));
  }

  async function saveEdit(id) {
    await onEditSave(id, editWeight, editReps);
    setEditingId(null);
  }

  function confirmDelete(id) {
    Alert.alert('Usuń serię', 'Czy na pewno chcesz usunąć tę serię?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  }

  function renderItem({ item }) {
    const isEditing = editingId === String(item.id);
    return (
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.topEx} numberOfLines={1}>
            {item.ex}
            {item.bw && <Text style={styles.topBwTag}> BW</Text>}
          </Text>
          <Text style={styles.topDate}>{item.date || '—'}</Text>
        </View>
        {isEditing ? (
          <View style={styles.editRight}>
            <TextInput style={styles.editInput} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" selectTextOnFocus />
            <Text style={styles.editSep}>kg ×</Text>
            <TextInput style={styles.editInput} value={editReps} onChangeText={setEditReps} keyboardType="number-pad" selectTextOnFocus />
            <Text style={styles.editSep}>p.</Text>
            <TouchableOpacity onPress={() => saveEdit(item.id)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="check" size={16} color="#4ade80" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="x" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topRight}>
            <View style={styles.topWeightRow}>
              <Text style={styles.topWeight}>{fmtRowWeight(item)}</Text>
              <Text style={styles.topReps}>×{item.reps > 0 ? item.reps : '—'}</Text>
            </View>
            <View style={styles.topOrmRow}>
              {item.orm != null && <Text style={styles.topOrm}>1RM ≈ {round1(item.orm)} kg</Text>}
              <TouchableOpacity onPress={() => startEdit(item)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="edit-2" size={13} color={C.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={8} style={styles.iconBtn}>
                <Feather name="trash-2" size={13} color={C.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={styles.toolRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.filterBtnText} numberOfLines={1}>
            {filterEx || 'Wszystkie ćwiczenia'}
          </Text>
          <Text style={styles.filterArrow}>▾</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sortRow}>
        {SORT_BTNS.map(b => (
          <SortButton
            key={b.key}
            label={b.label}
            active={sortKey === b.key}
            dir={sortDir}
            onPress={() => handleSort(b.key)}
          />
        ))}
      </View>
      <Text style={styles.count}>
        {rows.length} {rows.length === 1 ? 'wynik' : rows.length < 5 ? 'wyniki' : 'wyników'}
      </Text>
      {rows.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Brak danych</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => item.ex + i}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
      <ExercisePicker
        visible={pickerVisible}
        exercises={exercises}
        value={filterEx}
        onSelect={setFilterEx}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}

// ─── TreningiView ─────────────────────────────────────────────────────────

function fmtDuration(ms) {
  if (ms < 60000) return '< 1 min';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function getPRExercises(dayRecords, allRecords, dayStart) {
  const prs = new Set();
  const seen = new Set();
  for (const r of dayRecords) {
    if (seen.has(r.exercise)) continue;
    seen.add(r.exercise);
    const prev = allRecords.filter(p =>
      p.exercise === r.exercise && startOfDay(p.timestamp || 0) < dayStart
    );
    if (prev.length === 0) { prs.add(r.exercise); continue; }
    const bestPrev = Math.max(...prev.map(p => estimate1RM(Number(p.weight), Number(p.reps))));
    const bestCur = Math.max(...dayRecords
      .filter(d => d.exercise === r.exercise)
      .map(d => estimate1RM(Number(d.weight), Number(d.reps)))
    );
    if (bestCur > bestPrev) prs.add(r.exercise);
  }
  return [...prs];
}

function TreningiView({ records, bodyWeight, bwExercises, navigation }) {
  const days = [];
  const map = new Map();
  for (const r of records) {
    const day = startOfDay(r.timestamp || 0);
    if (!map.has(day)) { map.set(day, []); days.push(day); }
    map.get(day).push(r);
  }
  days.sort((a, b) => b - a);

  if (days.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyText}>Brak treningów</Text></View>;
  }

  return (
    <FlatList
      data={days}
      keyExtractor={day => String(day)}
      contentContainerStyle={styles.list}
      renderItem={({ item: day }) => {
        const dayRecords = map.get(day);
        const exercises = [...new Set(dayRecords.map(r => r.exercise))];
        const volume = dayRecords.reduce((s, r) => s + r.weight * r.reps, 0);
        const date = dayRecords[0]?.date || new Date(day).toLocaleDateString('pl-PL');
        const timestamps = dayRecords.map(r => r.timestamp || 0).filter(Boolean);
        const duration = timestamps.length > 1
          ? Math.max(...timestamps) - Math.min(...timestamps)
          : null;
        const prExercises = getPRExercises(dayRecords, records, day);

        return (
          <TouchableOpacity
            style={styles.workoutCard}
            onPress={() => navigation.navigate('WorkoutDetail', {
              date,
              records: dayRecords,
              bodyWeight,
              bwExercises: Array.from(bwExercises),
              allRecords: records,
            })}
            activeOpacity={0.75}
          >
            <View style={styles.workoutCardHeader}>
              <Text style={styles.workoutDate}>{date}</Text>
              <Feather name="chevron-right" size={16} color={C.muted} />
            </View>
            <View style={styles.workoutStats}>
              <View style={styles.workoutStat}>
                <Text style={styles.workoutStatVal}>{duration != null ? fmtDuration(duration) : '—'}</Text>
                <Text style={styles.workoutStatLabel}>czas</Text>
              </View>
              <View style={styles.workoutStatDiv} />
              <View style={styles.workoutStat}>
                <Text style={styles.workoutStatVal}>{exercises.length}</Text>
                <Text style={styles.workoutStatLabel}>ćwiczenia</Text>
              </View>
              <View style={styles.workoutStatDiv} />
              <View style={styles.workoutStat}>
                <Text style={styles.workoutStatVal}>{dayRecords.length}</Text>
                <Text style={styles.workoutStatLabel}>serie</Text>
              </View>
              <View style={styles.workoutStatDiv} />
              <View style={styles.workoutStat}>
                <Text style={[styles.workoutStatVal, { color: C.accent }]}>{Math.round(volume)} kg</Text>
                <Text style={styles.workoutStatLabel}>wolumen</Text>
              </View>
            </View>
            {prExercises.length > 0 && (
              <View style={styles.workoutPR}>
                <Feather name="award" size={11} color="#FFD700" />
                <Text style={styles.workoutPRText}>
                  PR: {prExercises.slice(0, 2).join(', ')}{prExercises.length > 2 ? ` +${prExercises.length - 2}` : ''}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── HistoryScreen ────────────────────────────────────────────────────────

export default function HistoryScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [bodyWeight, setBodyWeight] = useState(80);
  const [bwExercises, setBwExercises] = useState(new Set());
  const [subPage, setSubPage] = useState('treningi'); // 'treningi' | 'lista' | 'top'

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [rec, ex, bw, bwEx] = await Promise.all([
          loadRecords(), loadExercises(), loadBodyWeight(), loadBWExercises(),
        ]);
        rec.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRecords(rec);
        setExercises(ex);
        setBodyWeight(bw);
        setBwExercises(bwEx);
      }
      load();
    }, [])
  );

  async function handleDelete(id) {
    const updated = records.filter(r => String(r.id) !== String(id));
    updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setRecords(updated);
    await saveRecords(updated);
  }

  async function handleEditSave(id, weightStr, repsStr) {
    const w = parseFloat(weightStr);
    const r = parseInt(repsStr);
    if (!w || w <= 0 || !r || r <= 0) return;
    const updated = records.map(rec =>
      String(rec.id) === String(id) ? { ...rec, weight: w, reps: r } : rec
    );
    updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setRecords(updated);
    await saveRecords(updated);
  }

  const TABS = [
    { key: 'treningi', label: 'Treningi' },
    { key: 'lista',    label: 'Serie' },
    { key: 'top',      label: '🏆 Top' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="activity" label="HISTORIA" color="#FFD700" />

      {/* Sub-tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, subPage === t.key && styles.tabActive]}
            onPress={() => setSubPage(t.key)}
          >
            <Text style={[styles.tabText, subPage === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Treść */}
      {subPage === 'treningi' && (
        <TreningiView
          records={records}
          bodyWeight={bodyWeight}
          bwExercises={bwExercises}
          navigation={navigation}
        />
      )}
      {subPage === 'lista' && (
        <ListaView
          records={records}
          exercises={exercises}
          bodyWeight={bodyWeight}
          bwExercises={bwExercises}
          onDelete={handleDelete}
          onEditSave={handleEditSave}
        />
      )}
      {subPage === 'top' && (
        <TopSerieView
          records={records}
          exercises={exercises}
          bodyWeight={bodyWeight}
          bwExercises={bwExercises}
          onDelete={handleDelete}
          onEditSave={handleEditSave}
        />
      )}
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Sub-tabs
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9,
  },
  tabActive: { backgroundColor: C.accent },
  tabText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  // Toolbar
  toolRow: { paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  filterBtnText: { color: C.txt, fontSize: 14, fontWeight: '600', flex: 1 },
  filterArrow: { color: C.muted, fontSize: 16 },

  sortRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 16, marginBottom: 8,
  },
  sortBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.card,
  },
  sortBtnActive: { borderColor: C.accent },
  sortBtnText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  sortBtnTextActive: { color: C.accent },

  count: { color: C.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.muted, fontSize: 16 },

  // Lista — wiersze
  row: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, marginBottom: 4, overflow: 'hidden',
  },
  rowExpanded: { borderColor: C.accent },
  rowMain: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  rowLeft: { flex: 1, marginRight: 10 },
  rowEx: { color: C.txt, fontSize: 13, fontWeight: '600', marginBottom: 1 },
  rowDate: { color: C.muted, fontSize: 11 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowWeight: { color: C.accent, fontSize: 14, fontWeight: '700' },
  rowReps: { color: C.muted, fontSize: 14 },

  // Ikony akcji (edit/delete)
  rowIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  editRight: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    color: C.txt, fontSize: 13, fontWeight: '700',
    width: 50, textAlign: 'center',
  },
  editSep: { color: C.muted, fontSize: 12 },

  // Top Serie — wiersze
  topRow: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topLeft: { flex: 1, marginRight: 10 },
  topEx: { color: C.txt, fontSize: 13, fontWeight: '600', marginBottom: 1 },
  topBwTag: { color: C.muted, fontSize: 11 },
  topDate: { color: C.muted, fontSize: 11 },
  topRight: { alignItems: 'flex-end' },
  topWeightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  topOrmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  topWeight: { color: C.accent, fontSize: 14, fontWeight: '700' },
  topReps: { color: C.muted, fontSize: 14 },
  topOrm: { color: C.accent2, fontSize: 11 },

  // Treningi — karty
  workoutCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, marginBottom: 8, padding: 14,
  },
  workoutCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  workoutDate: { color: C.txt, fontSize: 13, fontWeight: '700' },
  workoutStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workoutStat: { flex: 1, alignItems: 'center' },
  workoutStatDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  workoutStatVal: { color: C.txt, fontSize: 15, fontWeight: '800' },
  workoutStatLabel: { color: C.muted, fontSize: 10, marginTop: 2 },
  workoutPR: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  workoutPRText: { color: '#FFD700', fontSize: 11, fontWeight: '700', flex: 1 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
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
});
