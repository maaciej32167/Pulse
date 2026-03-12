import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import UserAvatar from '../components/UserAvatar';
import { COLORS } from '../src/colors';

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
  gold:   '#FFD700',
};

// ─── mock data per gym ────────────────────────────────────────────────────────

const GYM_DATA = {
  '1': {
    checkedIn: [
      { id: 'c1', initials: 'MK', name: 'Marek Kowalski',   level: 24, klass: 'Powerlifter', color: '#FF4757', since: '14:30', doing: 'Martwy ciąg' },
      { id: 'c2', initials: 'AW', name: 'Anna Wiśniewska',  level: 18, klass: 'Athlete',     color: '#00F5FF', since: '15:00', doing: 'Pull-upy' },
      { id: 'c3', initials: 'RS', name: 'Robert Szymański', level: 31, klass: 'Bodybuilder', color: '#818cf8', since: '15:20', doing: 'Klatka / ramiona' },
    ],
    regulars: [
      { id: 'r1', initials: 'MK', name: 'Marek Kowalski',   level: 24, klass: 'Powerlifter', color: '#FF4757', trainings: 148, streak: 12, volume: 42000, duration: 168 },
      { id: 'r2', initials: 'AW', name: 'Anna Wiśniewska',  level: 18, klass: 'Athlete',     color: '#00F5FF', trainings: 112, streak: 7,  volume: 28500, duration: 112 },
      { id: 'r3', initials: 'RS', name: 'Robert Szymański', level: 31, klass: 'Bodybuilder', color: '#818cf8', trainings: 201, streak: 21, volume: 55200, duration: 241 },
      { id: 'r4', initials: 'KZ', name: 'Kasia Zając',      level: 9,  klass: 'Warrior',     color: '#FFD700', trainings: 54,  streak: 4,  volume: 14100, duration: 49  },
      { id: 'r5', initials: 'PB', name: 'Piotr Błaszczyk',  level: 42, klass: 'Powerlifter', color: '#FF4757', trainings: 334, streak: 31, volume: 68700, duration: 418 },
      { id: 'r6', initials: 'JR', name: 'Julia Rycerz',     level: 37, klass: 'Athlete',     color: '#00F5FF', trainings: 267, streak: 18, volume: 51300, duration: 294 },
    ],
    stats: {
      trainingsPerWeek: 214,
      avgSession: '68 min',
      totalMembers: 1240,
    },
    myStats: { rank: 4, streak: 8, volume: 22400, trainings: 47 },
    // obłożenie per godzina (0–23)
    hourly: [0, 0, 0, 0, 0, 2, 5, 12, 18, 14, 10, 8, 7, 8, 11, 16, 28, 35, 30, 20, 12, 7, 3, 1],
  },
  '2': {
    checkedIn: [
      { id: 'c1', initials: 'DW', name: 'Damian Wróbel', level: 28, klass: 'Bodybuilder', color: '#818cf8', since: '15:10', doing: 'Plecy / biceps' },
    ],
    regulars: [
      { id: 'r1', initials: 'DW', name: 'Damian Wróbel', level: 28, klass: 'Bodybuilder', color: '#818cf8', trainings: 176, streak: 9,  volume: 44600, duration: 198 },
      { id: 'r2', initials: 'TN', name: 'Tomasz Nowak',  level: 31, klass: 'Bodybuilder', color: '#818cf8', trainings: 143, streak: 5,  volume: 38200, duration: 157 },
    ],
    stats: {
      trainingsPerWeek: 142,
      avgSession: '55 min',
      totalMembers: 870,
    },
    myStats: null,
    hourly: [0, 0, 0, 0, 0, 1, 3, 8, 12, 10, 7, 5, 5, 6, 9, 14, 22, 28, 24, 16, 9, 4, 2, 0],
  },
};

const DEFAULT_GYM_DATA = {
  checkedIn: [],
  regulars: [],
  stats: { trainingsPerWeek: 0, avgSession: '—', totalMembers: 0 },
  hourly: new Array(24).fill(0),
};

const RANK_SORTS = [
  { key: 'trainings', label: 'Treningi' },
  { key: 'volume',    label: 'Wolumen'  },
  { key: 'duration',  label: 'Czas'     },
];

function sortRegulars(regulars, key) {
  return [...regulars].sort((a, b) => {
    if (key === 'volume')   return (b.volume   || 0) - (a.volume   || 0);
    if (key === 'duration') return (b.duration || 0) - (a.duration || 0);
    return b.trainings - a.trainings;
  });
}

// ─── LiveDot ──────────────────────────────────────────────────────────────────

function LiveDot() {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 2.4, duration: 900, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 0,   useNativeDriver: true }),
          Animated.delay(400),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0,   useNativeDriver: true }),
          Animated.delay(400),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.liveDotWrap}>
      <Animated.View style={[styles.livePulse, { transform: [{ scale }], opacity }]} />
      <View style={styles.liveDot} />
    </View>
  );
}

// ─── HourlyChart ──────────────────────────────────────────────────────────────

const SHOW_LABELS = new Set([6, 10, 14, 18, 22]);

function HourlyChart({ hourly }) {
  const slice  = hourly.slice(5, 23);   // godziny 5–22
  const max    = Math.max(...slice, 1);
  const BAR_H  = 44;

  return (
    <View style={styles.hourlyCard}>
      <View style={styles.hourlyBars}>
        {slice.map((v, i) => {
          const hour  = i + 5;
          const h     = v > 0 ? Math.max(Math.round((v / max) * BAR_H), 3) : 2;
          const isPeak = v === max;
          return (
            <View key={hour} style={styles.hourlyBarCol}>
              <View style={[
                styles.hourlyBar,
                {
                  height: h,
                  backgroundColor: isPeak
                    ? C.coral
                    : v === 0
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.14)',
                },
                isPeak && styles.hourlyBarPeak,
              ]} />
              <Text style={[styles.hourlyLabel, SHOW_LABELS.has(hour) && styles.hourlyLabelVisible]}>
                {SHOW_LABELS.has(hour) ? hour : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ label, icon, count }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && <Feather name={icon} size={12} color={C.muted} style={{ marginRight: 6 }} />}
        <Text style={styles.sectionTitle}>{label}</Text>
      </View>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
  );
}

function CheckInCard({ person }) {
  return (
    <View style={styles.checkInCard}>
      <UserAvatar initials={person.initials} level={person.level} color={person.color} size="md" />
      <View style={styles.checkInInfo}>
        <Text style={styles.personName}>{person.name}</Text>
        <Text style={styles.doingText}>{person.doing}</Text>
      </View>
      <View style={styles.sinceWrap}>
        <LiveDot />
        <Text style={styles.sinceText}>od {person.since}</Text>
      </View>
    </View>
  );
}

function RegularCard({ person, rank, sortKey }) {
  const h = Math.floor((person.duration || 0) / 60);
  const m = (person.duration || 0) % 60;
  const durationStr = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;

  const metricVal   = sortKey === 'volume'
    ? `${Math.round((person.volume || 0) / 1000)}k kg`
    : sortKey === 'duration'
      ? durationStr
      : person.trainings;
  const metricLabel = sortKey === 'volume'
    ? 'wolumen/mc'
    : sortKey === 'duration'
      ? 'czas/mc'
      : 'treningów';

  return (
    <View style={styles.regularCard}>
      <Text style={styles.rank}>#{rank}</Text>
      <UserAvatar initials={person.initials} level={person.level} color={person.color} size="md" />
      <View style={styles.regularInfo}>
        <Text style={styles.personName}>{person.name}</Text>
      </View>
      <View style={styles.regularStats}>
        <Text style={styles.regularTrainings}>{metricVal}</Text>
        <Text style={styles.regularLabel}>{metricLabel}</Text>
        <View style={styles.streakRow}>
          <Feather name="zap" size={10} color={C.gold} />
          <Text style={styles.streakText}>{person.streak} tyg.</Text>
        </View>
      </View>
    </View>
  );
}

function MyGymCard({ myStats, totalMembers }) {
  const items = [
    { icon: 'award',    value: `#${myStats.rank} z ${totalMembers.toLocaleString('pl-PL')}`, label: 'Twoje miejsce' },
    { icon: 'zap',      value: `${myStats.streak} tyg.`,                                     label: 'Streak tutaj'  },
    { icon: 'trending-up', value: `${Math.round(myStats.volume / 1000)}k kg`,                label: 'Twój wolumen'  },
    { icon: 'activity', value: myStats.trainings,                                             label: 'Treningów'     },
  ];

  return (
    <View style={styles.myCard}>
      <View style={styles.myCardHeader}>
        <View style={styles.myCardDot} />
        <Text style={styles.myCardTitle}>TWÓJ WYNIK TUTAJ</Text>
      </View>
      <View style={styles.myCardRow}>
        {items.map((item, i) => (
          <View key={item.label} style={[styles.myCardItem, i < items.length - 1 && styles.myCardItemBorder]}>
            <Feather name={item.icon} size={13} color={C.cyan} style={{ marginBottom: 5 }} />
            <Text style={styles.myCardVal}>{item.value}</Text>
            <Text style={styles.myCardLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: (color || C.accent) + '18' }]}>
        <Feather name={icon} size={16} color={color || C.accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function GymScreen({ navigation, route }) {
  const gym      = route.params?.gym ?? {};
  const data     = GYM_DATA[gym.id]  ?? DEFAULT_GYM_DATA;
  const [rankSort, setRankSort] = useState('trainings');

  const sortedRegulars = sortRegulars(data.regulars, rankSort);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="map-pin" label={gym.name ?? 'SIŁOWNIA'} color={COLORS.discover} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gym meta */}
        <View style={styles.gymMeta}>
          <Feather name="map-pin" size={12} color={C.muted} />
          <Text style={styles.gymAddress}>{gym.address}</Text>
          <View style={styles.metaDot} />
          <Feather name="star" size={12} color={C.gold} />
          <Text style={[styles.gymAddress, { color: C.gold }]}>{gym.rating}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.gymAddress}>{gym.distance}</Text>
        </View>

        {/* Twój wynik na tej siłowni */}
        {data.myStats && (
          <MyGymCard myStats={data.myStats} totalMembers={data.stats.totalMembers} />
        )}

        {/* Stats grid — 3 karty */}
        <SectionTitle label="STATYSTYKI" icon="bar-chart-2" />
        <View style={styles.statsGrid}>
          <StatCard icon="users"    value={data.stats.totalMembers.toLocaleString('pl-PL')} label="Członków"           color={C.accent} />
          <StatCard icon="activity" value={data.stats.trainingsPerWeek}                      label="Treningów / tydzień" color={C.cyan}   />
          <StatCard icon="clock"    value={data.stats.avgSession}                             label="Śr. czas sesji"     color={C.coral}  />
        </View>

        {/* Obłożenie w ciągu dnia */}
        <SectionTitle label="OBŁOŻENIE W CIĄGU DNIA" icon="clock" />
        <HourlyChart hourly={data.hourly} />

        {/* Teraz tutaj */}
        <SectionTitle label="TERAZ TUTAJ" icon="radio" count={data.checkedIn.length} />
        {data.checkedIn.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>Nikt nie jest obecnie zameldowany</Text>
          </View>
        ) : (
          data.checkedIn.map(p => <CheckInCard key={p.id} person={p} />)
        )}

        {/* Stali bywalcy */}
        <SectionTitle label="STALI BYWALCY" icon="award" count={data.regulars.length} />

        {/* Sort control */}
        <View style={styles.sortRow}>
          {RANK_SORTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortBtn, rankSort === s.key && styles.sortBtnActive]}
              onPress={() => setRankSort(s.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.sortBtnText, rankSort === s.key && styles.sortBtnTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {sortedRegulars.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>Brak danych</Text>
          </View>
        ) : (
          sortedRegulars.map((p, i) => (
            <RegularCard key={p.id} person={p} rank={i + 1} sortKey={rankSort} />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  gymMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginBottom: 4,
  },
  gymAddress: { color: C.muted, fontSize: 12 },
  metaDot:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.muted, opacity: 0.4 },

  // Section header
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle:    { fontSize: 11, fontWeight: '800', letterSpacing: 4, color: C.muted, textTransform: 'uppercase' },
  sectionCount:    { fontSize: 11, color: C.muted, opacity: 0.6 },

  // Stats grid — 3 karty
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, alignItems: 'flex-start', gap: 6,
  },
  statIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: C.txt, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  statLabel: { color: C.muted, fontSize: 10, letterSpacing: 0.3 },

  // Hourly chart
  hourlyCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, paddingBottom: 8,
  },
  hourlyBars: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 60, gap: 3,
  },
  hourlyBarCol: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
  },
  hourlyBar: {
    width: '100%', borderRadius: 3,
  },
  hourlyBarPeak: {
    shadowColor: '#FF4757', shadowOpacity: 0.5, shadowRadius: 4,
  },
  hourlyLabel: {
    color: 'transparent', fontSize: 8, marginTop: 4,
  },
  hourlyLabelVisible: {
    color: C.muted,
  },

  // LiveDot
  liveDotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  livePulse: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#22c55e',
  },

  // Check-in card
  checkInCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
  },
  checkInInfo: { flex: 1 },
  sinceWrap:   { alignItems: 'flex-end', gap: 5 },
  sinceText:   { color: C.muted, fontSize: 11 },
  doingText:   { color: C.muted, fontSize: 11 },

  // Sort control
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sortBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  sortBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '18' },
  sortBtnText: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sortBtnTextActive: { color: C.accent },

  // Regular card
  regularCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
  },
  rank:        { color: C.muted, fontSize: 13, fontWeight: '800', width: 24, textAlign: 'center' },
  regularInfo: { flex: 1 },
  regularStats: { alignItems: 'flex-end', gap: 2 },
  regularTrainings: { color: C.txt, fontSize: 18, fontWeight: '800' },
  regularLabel:     { color: C.muted, fontSize: 10 },
  streakRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  streakText:       { color: C.gold, fontSize: 10, fontWeight: '700' },

  // Shared
  personName:    { color: C.txt, fontSize: 14, fontWeight: '700' },
  klassBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  klassBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  klassText:     { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // My gym card
  myCard: {
    marginTop: 12,
    borderRadius: 16, borderWidth: 1, borderColor: C.cyan + '40',
    backgroundColor: C.cyan + '08',
    overflow: 'hidden',
  },
  myCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.cyan + '20',
  },
  myCardDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.cyan,
  },
  myCardTitle: {
    fontSize: 10, fontWeight: '800', letterSpacing: 3,
    color: C.cyan, textTransform: 'uppercase',
  },
  myCardRow: {
    flexDirection: 'row',
  },
  myCardItem: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
  },
  myCardItemBorder: {
    borderRightWidth: 1, borderRightColor: C.cyan + '20',
  },
  myCardVal: {
    color: C.txt, fontSize: 15, fontWeight: '800', marginBottom: 3,
  },
  myCardLabel: {
    color: C.muted, fontSize: 10, letterSpacing: 0.3,
  },

  // Empty section
  emptySection:     { paddingVertical: 20, alignItems: 'center' },
  emptySectionText: { color: C.muted, fontSize: 13, opacity: 0.6 },
});
