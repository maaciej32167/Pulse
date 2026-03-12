import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { loadTileSettings, saveTileSettings } from '../src/storage';
import { TILE_METRICS, TILE_PERIODS } from './HomeScreen';

const C = {
  bg:     '#080a12',
  card:   '#0d0f1a',
  border: '#1a1c2a',
  txt:    '#ddeeff',
  sub:    '#99aabb',
  muted:  '#6b7f93',
};
const RED = '#FF4757';
const NO_PERIOD = new Set(['streak', 'followers']);

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <Text style={styles.dropdownText} numberOfLines={1}>{selected?.label ?? value}</Text>
        <Feather name="chevron-down" size={11} color={C.muted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.ddOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.ddSheet}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.ddOption, opt.id === value && styles.ddOptionActive]}
                onPress={() => { onChange(opt.id); setOpen(false); }}
              >
                <Text style={[styles.ddOptionText, opt.id === value && styles.ddOptionTextActive]}>
                  {opt.label}
                </Text>
                {opt.id === value && <Feather name="check" size={13} color={RED} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TileSettingsScreen({ navigation }) {
  const [tiles, setTiles] = useState(null);

  useEffect(() => {
    loadTileSettings().then(setTiles);
  }, []);

  function handleChange(idx, key, val) {
    setTiles(prev => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t));
  }

  async function handleSave() {
    if (tiles) await saveTileSettings(tiles);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KAFELKI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>
          Wybierz co wyświetlają 3 kafelki na ekranie głównym
        </Text>

        {tiles && tiles.map((tile, i) => (
          <View key={i} style={styles.tileRow}>
            <Text style={styles.tileLabel}>KAFELEK {i + 1}</Text>
            <View style={styles.tileLine}>
              <Dropdown
                value={tile.metric}
                options={TILE_METRICS}
                onChange={val => handleChange(i, 'metric', val)}
              />
              {!NO_PERIOD.has(tile.metric) && (
                <Dropdown
                  value={tile.period}
                  options={TILE_PERIODS}
                  onChange={val => handleChange(i, 'period', val)}
                />
              )}
            </View>
            {i < tiles.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>ZAPISZ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: C.txt, fontSize: 13, fontWeight: '900', letterSpacing: 3,
  },

  content: { padding: 20 },

  sectionLabel: {
    color: C.muted, fontSize: 12, marginBottom: 24, lineHeight: 18,
  },

  tileRow:   { marginBottom: 4 },
  tileLabel: {
    color: C.muted, fontSize: 9, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  tileLine: { flexDirection: 'row', gap: 10 },
  divider:  { height: 1, backgroundColor: C.border, marginVertical: 18 },

  // Dropdown
  dropdown: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 13, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  dropdownText: { color: C.txt, fontSize: 11, fontWeight: '700', flex: 1, marginRight: 4 },
  ddOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  ddSheet: {
    width: '100%', backgroundColor: '#131525',
    borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  ddOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  ddOptionActive:     { backgroundColor: `${RED}12` },
  ddOptionText:       { color: C.sub, fontSize: 13, fontWeight: '600' },
  ddOptionTextActive: { color: RED, fontWeight: '700' },

  // Footer
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn: {
    backgroundColor: RED, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
