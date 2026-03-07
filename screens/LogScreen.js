import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { loadMyGym, saveMyGym } from '../src/storage';

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:     '#0A0A0C',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  txt:    '#f1f5f9',
  muted:  '#64748b',
  accent: '#818cf8',
  cyan:   '#00F5FF',
  coral:  '#FF4757',
};

// ─── mock siłownie ────────────────────────────────────────────────────────────

const GYMS = [
  { id: '1', name: 'Iron Temple',     address: 'ul. Sienna 12, Warszawa',        distance: '0.4 km' },
  { id: '2', name: 'FitLife 24',      address: 'ul. Marszałkowska 55, Warszawa', distance: '1.1 km' },
  { id: '3', name: 'Powerzone Gym',   address: 'ul. Puławska 80, Warszawa',      distance: '2.3 km' },
  { id: '4', name: 'Athletic Club',   address: 'al. Jerozolimskie 24, Warszawa', distance: '3.0 km' },
];

// ─── komponenty ───────────────────────────────────────────────────────────────

function GymRow({ gym, selected, onSelect, onSetMy, isMy }) {
  return (
    <TouchableOpacity
      style={[styles.gymRow, selected && styles.gymRowSelected]}
      onPress={() => onSelect(gym)}
      activeOpacity={0.75}
    >
      <View style={[styles.gymIcon, selected && styles.gymIconSelected]}>
        <Feather name="map-pin" size={16} color={selected ? C.bg : C.cyan} />
      </View>
      <View style={styles.gymMeta}>
        <View style={styles.gymNameRow}>
          <Text style={[styles.gymName, selected && styles.gymNameSelected]}>{gym.name}</Text>
          {isMy && (
            <View style={styles.myBadge}>
              <Text style={styles.myBadgeText}>MOJA</Text>
            </View>
          )}
        </View>
        <Text style={styles.gymAddress}>{gym.address}</Text>
        {gym.distance && <Text style={styles.gymDist}>{gym.distance}</Text>}
      </View>
      {selected ? (
        <Feather name="check-circle" size={20} color={C.coral} />
      ) : (
        <TouchableOpacity onPress={() => onSetMy(gym)} hitSlop={12} style={styles.starBtn}>
          <Feather name="star" size={16} color={isMy ? '#FFD700' : C.muted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── główny ekran ─────────────────────────────────────────────────────────────

export default function LogScreen({ navigation }) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(null);
  const [myGym, setMyGym]       = useState(null);

  useEffect(() => {
    loadMyGym().then(g => {
      setMyGym(g);
    });
  }, []);

  async function handleSetMy(gym) {
    await saveMyGym(gym);
    setMyGym(gym);
  }

  function handleSelect(gym) {
    setSelected(gym);
  }

  function handleNoGym() {
    setSelected({ id: null, name: 'Bez miejsca', address: '' });
  }

  function handleStartWorkout() {
    if (!selected) {
      Alert.alert('Wybierz miejsce', 'Wybierz siłownię lub "Bez miejsca" aby rozpocząć trening.');
      return;
    }
    navigation.navigate('Workout', {
      gym: selected,
      checkInTime: Date.now(),
    });
  }

  const q = query.toLowerCase();
  const filteredGyms = GYMS.filter(g =>
    g.name.toLowerCase().includes(q) || g.address.toLowerCase().includes(q)
  );

  // "Moja siłownia" na górze jeśli ustawiona i nie jest już w wynikach
  const showMyGymFirst = myGym && !q;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="zap" label="NOWY TRENING" color={C.coral} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={15} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj siłowni…"
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

      <FlatList
        data={filteredGyms}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Moja siłownia */}
            {showMyGymFirst && myGym && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>MOJA SIŁOWNIA</Text>
                <GymRow
                  gym={myGym}
                  selected={selected?.id === myGym.id}
                  onSelect={handleSelect}
                  onSetMy={handleSetMy}
                  isMy={true}
                />
              </View>
            )}
            <Text style={styles.sectionLabel}>W POBLIŻU</Text>
          </>
        }
        renderItem={({ item }) => (
          <GymRow
            gym={item}
            selected={selected?.id === item.id}
            onSelect={handleSelect}
            onSetMy={handleSetMy}
            isMy={myGym?.id === item.id}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.noGymBtn} onPress={handleNoGym} activeOpacity={0.7}>
            <Feather name="slash" size={15} color={C.muted} />
            <Text style={styles.noGymText}>Trenuj bez miejsca</Text>
          </TouchableOpacity>
        }
      />

      {/* CTA */}
      <View style={styles.footer}>
        {selected && (
          <View style={styles.selectedInfo}>
            <Feather name="map-pin" size={13} color={C.coral} />
            <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.startBtn, !selected && styles.startBtnDisabled]}
          onPress={handleStartWorkout}
          activeOpacity={0.8}
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.startBtnText}>ROZPOCZNIJ TRENING</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 16 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginTop: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: C.txt, fontSize: 14 },

  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 4,
    color: C.muted, textTransform: 'uppercase',
    marginTop: 16, marginBottom: 8,
  },

  gymRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  gymRowSelected: { borderColor: C.coral, backgroundColor: 'rgba(255,71,87,0.06)' },
  gymIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.cyan + '15', borderWidth: 1, borderColor: C.cyan + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  gymIconSelected: { backgroundColor: C.coral, borderColor: C.coral },
  gymMeta: { flex: 1 },
  gymNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gymName: { color: C.txt, fontSize: 14, fontWeight: '700' },
  gymNameSelected: { color: C.coral },
  gymAddress: { color: C.muted, fontSize: 12, marginTop: 2 },
  gymDist: { color: C.muted, fontSize: 11, marginTop: 2 },
  myBadge: {
    backgroundColor: '#FFD70020', borderWidth: 1, borderColor: '#FFD70060',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  myBadgeText: { color: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  starBtn: { padding: 4 },

  noGymBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginTop: 4,
  },
  noGymText: { color: C.muted, fontSize: 13 },

  footer: {
    padding: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: C.border,
    gap: 10,
  },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedName: { color: C.coral, fontSize: 13, fontWeight: '600', flex: 1 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.coral, borderRadius: 14,
    paddingVertical: 16,
    shadowColor: C.coral, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  startBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
