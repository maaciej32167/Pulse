import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import UserAvatar from '../components/UserAvatar';

// ─── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#0A0A0C',
  card:    'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  txt:     '#f1f5f9',
  muted:   '#64748b',
  accent:  '#818cf8',
  cyan:    '#00F5FF',
  coral:   '#FF4757',
};

// ─── mock data ────────────────────────────────────────────────────────────────

const GYMS = [
  { id: '1', name: 'Iron Temple',         address: 'ul. Sienna 12, Warszawa',    members: 1240, distance: '0.4 km', rating: 4.9 },
  { id: '2', name: 'FitLife 24',          address: 'ul. Marszałkowska 55, Warszawa', members: 870, distance: '1.1 km', rating: 4.6 },
  { id: '3', name: 'Powerzone Gym',       address: 'ul. Puławska 80, Warszawa',  members: 530, distance: '2.3 km', rating: 4.8 },
  { id: '4', name: 'Athletic Club',       address: 'al. Jerozolimskie 24',       members: 310, distance: '3.0 km', rating: 4.4 },
];

const USERS_SAME_GYM = [
  { id: 'u1', initials: 'MK', name: 'Marek Kowalski',  level: 24, klass: 'Powerlifter', volume: '42 000 kg/mc', color: '#FF4757', gym: 'Iron Temple' },
  { id: 'u2', initials: 'AW', name: 'Anna Wiśniewska', level: 18, klass: 'Athlete',     volume: '28 500 kg/mc', color: '#00F5FF', gym: 'Iron Temple' },
];

const USERS_SIMILAR = [
  { id: 'u3', initials: 'TN', name: 'Tomasz Nowak',    level: 31, klass: 'Bodybuilder', volume: '55 200 kg/mc', color: '#818cf8' },
  { id: 'u4', initials: 'KZ', name: 'Kasia Zając',     level: 9,  klass: 'Warrior',     volume: '14 100 kg/mc', color: '#FFD700' },
];

const USERS_POPULAR = [
  { id: 'u5', initials: 'PB', name: 'Piotr Błaszczyk', level: 42, klass: 'Powerlifter', volume: '68 700 kg/mc', color: '#FF4757' },
  { id: 'u6', initials: 'JR', name: 'Julia Rycerz',    level: 37, klass: 'Athlete',     volume: '51 300 kg/mc', color: '#00F5FF' },
  { id: 'u7', initials: 'DW', name: 'Damian Wróbel',   level: 28, klass: 'Bodybuilder', volume: '44 600 kg/mc', color: '#818cf8' },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ label, icon, sub }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && <Feather name={icon} size={12} color={C.muted} style={{ marginRight: 6 }} />}
        <Text style={styles.sectionTitle}>{label}</Text>
      </View>
      {sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

function GymCard({ gym, onPress }) {
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <TouchableOpacity style={styles.gymCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.gymIconWrap}>
        <Feather name="map-pin" size={20} color={C.cyan} />
      </View>
      <View style={styles.gymInfo}>
        <Text style={styles.gymName}>{gym.name}</Text>
        <Text style={styles.gymAddress}>{gym.address}</Text>
        <View style={styles.gymMeta}>
          <Feather name="users" size={11} color={C.muted} />
          <Text style={styles.gymMetaText}>{gym.members.toLocaleString('pl-PL')} członków</Text>
          <View style={styles.dot} />
          <Feather name="star" size={11} color="#FFD700" />
          <Text style={[styles.gymMetaText, { color: '#FFD700' }]}>{gym.rating}</Text>
          <View style={styles.dot} />
          <Text style={styles.gymMetaText}>{gym.distance}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.checkInBtn, checkedIn && styles.checkInBtnActive]}
        onPress={(e) => { e.stopPropagation?.(); setCheckedIn(v => !v); }}
        activeOpacity={0.75}
      >
        <Feather name={checkedIn ? 'check' : 'map-pin'} size={13} color={checkedIn ? C.bg : C.cyan} />
        <Text style={[styles.checkInLabel, checkedIn && { color: C.bg }]}>
          {checkedIn ? 'IN' : 'CHECK-IN'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function UserCard({ user }) {
  const [following, setFollowing] = useState(false);
  const [friend, setFriend]       = useState(false);

  return (
    <View style={styles.userCard}>
      <UserAvatar initials={user.initials} level={user.level} color={user.color} size="md" style={{ marginRight: 0 }} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userVolume}>{user.volume}</Text>
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={() => setFollowing(v => !v)}
            activeOpacity={0.75}
          >
            <Feather name={following ? 'eye-off' : 'eye'} size={11} color={following ? C.muted : C.accent} />
            <Text style={[styles.followLabel, following && { color: C.muted }]}>
              {following ? 'Obserwujesz' : 'Obserwuj'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.friendBtn, friend && styles.friendBtnActive]}
            onPress={() => setFriend(v => !v)}
            activeOpacity={0.75}
          >
            <Feather name={friend ? 'user-check' : 'user-plus'} size={11} color={friend ? C.muted : C.cyan} />
            <Text style={[styles.friendLabel, friend && { color: C.muted }]}>
              {friend ? 'Znajomy' : 'Dodaj'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function DiscoverScreen({ navigation }) {
  const [query, setQuery] = useState('');

  const q = query.toLowerCase();

  const filteredGyms       = GYMS.filter(g =>
    g.name.toLowerCase().includes(q) || g.address.toLowerCase().includes(q)
  );

  const filterUsers = (list) => !q
    ? list
    : list.filter(u => u.name.toLowerCase().includes(q));

  const sameGym  = filterUsers(USERS_SAME_GYM);
  const similar  = filterUsers(USERS_SIMILAR);
  const popular  = filterUsers(USERS_POPULAR);
  const anyUsers = sameGym.length + similar.length + popular.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="compass" label="DISCOVER" color={C.accent} />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={C.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj siłowni lub znajomych…"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Feather name="x" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gyms section */}
        {filteredGyms.length > 0 && (
          <>
            <SectionTitle label="SIŁOWNIE W POBLIŻU" />
            {filteredGyms.map(gym => (
              <GymCard
                key={gym.id}
                gym={gym}
                onPress={() => navigation.navigate('Gym', { gym })}
              />
            ))}
          </>
        )}

        {/* Same gym */}
        {sameGym.length > 0 && (
          <>
            <SectionTitle
              label="TA SAMA SIŁOWNIA"
              icon="map-pin"
              sub="Trenują w Iron Temple"
            />
            {sameGym.map(user => <UserCard key={user.id} user={user} />)}
          </>
        )}

        {/* Similar level */}
        {similar.length > 0 && (
          <>
            <SectionTitle
              label="PODOBNY POZIOM"
              icon="zap"
              sub="Zbliżony styl i staż treningu"
            />
            {similar.map(user => <UserCard key={user.id} user={user} />)}
          </>
        )}

        {/* Popular in city */}
        {popular.length > 0 && (
          <>
            <SectionTitle
              label="POPULARNE W OKOLICY"
              icon="trending-up"
              sub="Najaktywniejsze profile w pobliżu"
            />
            {popular.map(user => <UserCard key={user.id} user={user} />)}
          </>
        )}

        {/* Empty state */}
        {filteredGyms.length === 0 && !anyUsers && (
          <View style={styles.empty}>
            <Feather name="search" size={40} color={C.muted} />
            <Text style={styles.emptyText}>Brak wyników dla "{query}"</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { opacity: 0.7 },
  searchInput: {
    flex: 1,
    color: C.txt,
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // Section title
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    color: C.muted,
    textTransform: 'uppercase',
  },
  sectionSub: {
    fontSize: 11,
    color: C.muted,
    opacity: 0.6,
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // Gym card
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  gymIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.cyan + '12',
    borderWidth: 1,
    borderColor: C.cyan + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymInfo: { flex: 1 },
  gymName: { color: C.txt, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  gymAddress: { color: C.muted, fontSize: 12, marginTop: 2, letterSpacing: 0.2 },
  gymMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gymMetaText: { color: C.muted, fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.muted, opacity: 0.5 },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cyan + '55',
    backgroundColor: C.cyan + '10',
  },
  checkInBtnActive: {
    backgroundColor: C.cyan,
    borderColor: C.cyan,
  },
  checkInLabel: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { color: C.txt, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  klassBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  klassText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  userVolume: { color: C.muted, fontSize: 11, marginTop: 3 },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accent + '70',
    backgroundColor: C.accent + '15',
  },
  followBtnActive: {
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  followLabel: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cyan + '60',
    backgroundColor: C.cyan + '10',
  },
  friendBtnActive: {
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  friendLabel: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: C.muted, fontSize: 14, letterSpacing: 0.3 },
});
