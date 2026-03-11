import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  loadExercises, saveExercises,
  loadBWExercises, saveBWExercises,
  loadRecords, saveRecords,
} from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';

const C = {
  bg:     '#0A0A0C',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  txt:    '#f1f5f9',
  muted:  '#64748b',
  sub:    '#99aabb',
  cyan:   '#00F5FF',
  coral:  '#FF4757',
  gold:   '#FFD700',
};

export default function ExercisesScreen({ navigation }) {
  const [exercises, setExercises] = useState([]);
  const [bwExercises, setBwExercises] = useState(new Set());
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // null | { type: 'add' } | { type: 'edit', name: string }
  const [inputVal, setInputVal] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [ex, bw] = await Promise.all([loadExercises(), loadBWExercises()]);
        setExercises([...ex].sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })));
        setBwExercises(bw);
      })();
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? exercises.filter(e => e.toLowerCase().includes(q)) : exercises;
  }, [exercises, query]);

  // ── Dodaj ─────────────────────────────────────────────────────────────
  async function handleAdd() {
    const name = inputVal.trim();
    if (!name) return;
    if (exercises.includes(name)) {
      Alert.alert('Już istnieje', `Ćwiczenie "${name}" jest już na liście.`);
      return;
    }
    const updated = [...exercises, name].sort((a, b) =>
      a.localeCompare(b, 'pl', { sensitivity: 'base' })
    );
    setExercises(updated);
    await saveExercises(updated);
    setModal(null);
    setInputVal('');
  }

  // ── Zmień nazwę (aktualizuje też rekordy) ─────────────────────────────
  async function handleRename() {
    const oldName = modal?.name;
    const newName = inputVal.trim();
    if (!newName || newName === oldName) { setModal(null); return; }
    if (exercises.includes(newName)) {
      Alert.alert('Już istnieje', `Ćwiczenie "${newName}" jest już na liście.`);
      return;
    }
    // Zaktualizuj listę
    const updatedEx = exercises
      .map(e => (e === oldName ? newName : e))
      .sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }));
    setExercises(updatedEx);
    await saveExercises(updatedEx);

    // Zaktualizuj rekordy
    const records = await loadRecords();
    const updatedRec = records.map(r =>
      r.exercise === oldName ? { ...r, exercise: newName } : r
    );
    await saveRecords(updatedRec);

    // Zaktualizuj BW jeśli potrzeba
    if (bwExercises.has(oldName)) {
      const newBW = new Set(bwExercises);
      newBW.delete(oldName);
      newBW.add(newName);
      setBwExercises(newBW);
      await saveBWExercises(newBW);
    }
    setModal(null);
    setInputVal('');
  }

  // ── Usuń ──────────────────────────────────────────────────────────────
  function handleDelete(name) {
    Alert.alert(
      'Usuń ćwiczenie',
      `Usunąć "${name}" z listy?\n\nRekordy w historii zostają.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            const updated = exercises.filter(e => e !== name);
            setExercises(updated);
            await saveExercises(updated);
            if (bwExercises.has(name)) {
              const newBW = new Set(bwExercises);
              newBW.delete(name);
              setBwExercises(newBW);
              await saveBWExercises(newBW);
            }
          },
        },
      ]
    );
  }

  // ── Toggle BW ─────────────────────────────────────────────────────────
  async function handleToggleBW(name) {
    const newBW = new Set(bwExercises);
    if (newBW.has(name)) newBW.delete(name);
    else newBW.add(name);
    setBwExercises(newBW);
    await saveBWExercises(newBW);
  }

  // ── Render wiersza ────────────────────────────────────────────────────
  function renderItem({ item }) {
    const isBW = bwExercises.has(item);
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowLeft}
          onPress={() => {
            setInputVal(item);
            setModal({ type: 'edit', name: item });
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.rowName} numberOfLines={1}>{item}</Text>
          {isBW && (
            <View style={styles.bwBadge}>
              <Text style={styles.bwBadgeText}>BW</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setInputVal(item);
              setModal({ type: 'edit', name: item });
            }}
            hitSlop={8}
          >
            <Feather name="edit-2" size={14} color={C.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            hitSlop={8}
          >
            <Feather name="trash-2" size={14} color={C.coral} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAdding = modal?.type === 'add';
  const isEditing = modal?.type === 'edit';

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="bar-chart-2" label="ĆWICZ." color={C.cyan} />

      {/* Pasek wyszukiwania */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={15} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj ćwiczenia…"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Feather name="x" size={15} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Licznik + przycisk dodaj */}
      <View style={styles.topBar}>
        <Text style={styles.count}>
          {filtered.length} {filtered.length === 1 ? 'ćwiczenie' : filtered.length < 5 ? 'ćwiczenia' : 'ćwiczeń'}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setInputVal(''); setModal({ type: 'add' }); }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={item => item}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Brak ćwiczeń</Text>
          </View>
        }
      />

      {/* Modal dodaj / edytuj */}
      <Modal
        visible={isAdding || isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModal(null)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1}>
            <Text style={styles.modalTitle}>
              {isAdding ? 'Nowe ćwiczenie' : 'Zmień nazwę'}
            </Text>
            {isEditing && (
              <Text style={styles.modalHint}>
                Zmiana nazwy zaktualizuje też wszystkie rekordy w historii.
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
              value={inputVal}
              onChangeText={setInputVal}
              placeholder="np. Bench Press"
              placeholderTextColor={C.muted}
              autoFocus
              onSubmitEditing={isAdding ? handleAdd : handleRename}
            />
            {isEditing && (
              <TouchableOpacity
                style={[styles.bwToggleBtn, bwExercises.has(modal?.name) && styles.bwToggleBtnActive]}
                onPress={() => handleToggleBW(modal?.name)}
              >
                <Text style={[styles.bwToggleText, bwExercises.has(modal?.name) && { color: C.gold }]}>
                  {bwExercises.has(modal?.name) ? '✓ Ćwiczenie z masą ciała (BW)' : 'Oznacz jako BW (masa ciała)'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(null)}>
                <Text style={styles.modalCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={isAdding ? handleAdd : handleRename}
              >
                <Text style={styles.modalSaveText}>{isAdding ? 'Dodaj' : 'Zapisz'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginTop: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: C.txt, fontSize: 14 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  count: { color: C.muted, fontSize: 12 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.cyan + '20', borderWidth: 1, borderColor: C.cyan + '60',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingLeft: 14, paddingRight: 8, paddingVertical: 10,
    marginBottom: 6,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  rowName: { color: C.txt, fontSize: 14, fontWeight: '600', flex: 1 },
  bwBadge: {
    backgroundColor: C.gold + '20', borderWidth: 1, borderColor: C.gold + '60',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  bwBadgeText: { color: C.gold, fontSize: 9, fontWeight: '800' },

  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnActive: { backgroundColor: C.gold + '15' },
  actionBtnText: { color: C.muted, fontSize: 10, fontWeight: '800' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: C.muted, fontSize: 15 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#111318', borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 24, width: '100%',
  },
  modalTitle: { color: C.txt, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  modalHint:  { color: C.muted, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  modalInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: C.txt, fontSize: 15, marginBottom: 16,
  },
  bwToggleBtn: {
    padding: 12, borderRadius: 10, marginBottom: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  bwToggleBtnActive: { borderColor: C.gold + '60', backgroundColor: C.gold + '10' },
  bwToggleText: { color: C.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  modalBtns:       { flexDirection: 'row', gap: 10 },
  modalCancel:     { flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.muted, fontSize: 14, fontWeight: '700' },
  modalSave:       { flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', backgroundColor: C.cyan + '20', borderWidth: 1, borderColor: C.cyan + '60' },
  modalSaveText:   { color: C.cyan, fontSize: 14, fontWeight: '800' },
});
