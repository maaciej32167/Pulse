import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';

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
      { id: 'c1', initials: 'MK', name: 'Marek Kowalski',  klass: 'Powerlifter', color: '#FF4757', since: '14:30', doing: 'Martwy ciąg' },
      { id: 'c2', initials: 'AW', name: 'Anna Wiśniewska', klass: 'Athlete',     color: '#00F5FF', since: '15:00', doing: 'Pull-upy' },
      { id: 'c3', initials: 'RS', name: 'Robert Szymański',klass: 'Bodybuilder', color: '#818cf8', since: '15:20', doing: 'Klatka / ramiona' },
    ],
    regulars: [
      { id: 'r1', initials: 'MK', name: 'Marek Kowalski',  level: 24, klass: 'Powerlifter', color: '#FF4757', trainings: 148, streak: 12 },
      { id: 'r2', initials: 'AW', name: 'Anna Wiśniewska', level: 18, klass: 'Athlete',     color: '#00F5FF', trainings: 112, streak: 7  },
      { id: 'r3', initials: 'RS', name: 'Robert Szymański',level: 31, klass: 'Bodybuilder', color: '#818cf8', trainings: 201, streak: 21 },
      { id: 'r4', initials: 'KZ', name: 'Kasia Zając',     level: 9,  klass: 'Warrior',     color: '#FFD700', trainings: 54,  streak: 4  },
      { id: 'r5', initials: 'PB', name: 'Piotr Błaszczyk', level: 42, klass: 'Powerlifter', color: '#FF4757', trainings: 334, streak: 31 },
      { id: 'r6', initials: 'JR', name: 'Julia Rycerz',    level: 37, klass: 'Athlete',     color: '#00F5FF', trainings: 267, streak: 18 },
    ],
    stats: {
      trainingsPerWeek: 214,
      peakHour: '17:00 – 19:00',
      avgSession: '68 min',
      totalMembers: 1240,
    },
  },
  '2': {
    checkedIn: [
      { id: 'c1', initials: 'DW', name: 'Damian Wróbel', klass: 'Bodybuilder', color: '#818cf8', since: '15:10', doing: 'Plecy / biceps' },
    ],
    regulars: [
      { id: 'r1', initials: 'DW', name: 'Damian Wróbel',  level: 28, klass: 'Bodybuilder', color: '#818cf8', trainings: 176, streak: 9  },
      { id: 'r2', initials: 'TN', name: 'Tomasz Nowak',   level: 31, klass: 'Bodybuilder', color: '#818cf8', trainings: 143, streak: 5  },
    ],
    stats: {
      trainingsPerWeek: 142,
      peakHour: '18:00 – 20:00',
      avgSession: '55 min',
      totalMembers: 870,
    },
  },
};

const DEFAULT_GYM_DATA = {
  checkedIn: [],
  regulars: [],
  stats: { trainingsPerWeek: 0, peakHour: '—', avgSession: '—', totalMembers: 0 },
};

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
      <View style={[styles.avatar, { backgroundColor: person.color + '22', borderColor: person.color + '55' }]}>
        <Text style={[styles.avatarText, { color: person.color }]}>{person.initials}</Text>
      </View>
      <View style={styles.checkInInfo}>
        <Text style={styles.personName}>{person.name}</Text>
        <View style={styles.klassBadgeRow}>
          <View style={[styles.klassBadge, { borderColor: person.color + '55' }]}>
            <Text style={[styles.klassText, { color: person.color }]}>{person.klass}</Text>
          </View>
          <Text style={styles.doingText}>{person.doing}</Text>
        </View>
      </View>
      <View style={styles.sinceWrap}>
        <View style={styles.liveIndicator} />
        <Text style={styles.sinceText}>od {person.since}</Text>
      </View>
    </View>
  );
}

function RegularCard({ person, rank }) {
  return (
    <View style={styles.regularCard}>
      <Text style={styles.rank}>#{rank}</Text>
      <View style={[styles.avatar, { backgroundColor: person.color + '22', borderColor: person.color + '55' }]}>
        <Text style={[styles.avatarText, { color: person.color }]}>{person.initials}</Text>
      </View>
      <View style={styles.regularInfo}>
        <Text style={styles.personName}>{person.name}</Text>
        <View style={styles.klassBadgeRow}>
          <View style={[styles.klassBadge, { borderColor: person.color + '55' }]}>
            <Text style={[styles.klassText, { color: person.color }]}>{person.klass}</Text>
          </View>
          <Text style={styles.personLevel}>LVL {person.level}</Text>
        </View>
      </View>
      <View style={styles.regularStats}>
        <Text style={styles.regularTrainings}>{person.trainings}</Text>
        <Text style={styles.regularLabel}>treningów</Text>
        <View style={styles.streakRow}>
          <Feather name="zap" size={10} color={C.gold} />
          <Text style={styles.streakText}>{person.streak} tyg.</Text>
        </View>
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
  const gym  = route.params?.gym  ?? {};
  const data = GYM_DATA[gym.id]  ?? DEFAULT_GYM_DATA;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="map-pin" label={gym.name ?? 'SIŁOWNIA'} color={C.cyan} />

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

        {/* Stats grid */}
        <SectionTitle label="STATYSTYKI" icon="bar-chart-2" />
        <View style={styles.statsGrid}>
          <StatCard icon="users"     value={data.stats.totalMembers.toLocaleString('pl-PL')} label="Członków"          color={C.accent} />
          <StatCard icon="activity"  value={data.stats.trainingsPerWeek}                      label="Treningów / tydzień" color={C.cyan}   />
          <StatCard icon="clock"     value={data.stats.avgSession}                             label="Śr. czas sesji"    color={C.coral}  />
          <StatCard icon="trending-up" value={data.stats.peakHour}                            label="Peak hours"        color={C.gold}   />
        </View>

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
        {data.regulars.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>Brak danych</Text>
          </View>
        ) : (
          data.regulars.map((p, i) => <RegularCard key={p.id} person={p} rank={i + 1} />)
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  gymAddress: { color: C.muted, fontSize: 12 },
  metaDot:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.muted, opacity: 0.4 },

  // Section header
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle:    { fontSize: 11, fontWeight: '800', letterSpacing: 4, color: C.muted, textTransform: 'uppercase' },
  sectionCount:    { fontSize: 11, color: C.muted, opacity: 0.6 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
  },
  statIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: C.txt, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  statLabel: { color: C.muted, fontSize: 11, letterSpacing: 0.3 },

  // Check-in card
  checkInCard: {
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
  checkInInfo: { flex: 1 },
  sinceWrap:   { alignItems: 'flex-end', gap: 4 },
  liveIndicator: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e', alignSelf: 'flex-end' },
  sinceText:   { color: C.muted, fontSize: 11 },
  doingText:   { color: C.muted, fontSize: 11 },

  // Regular card
  regularCard: {
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
  rank:        { color: C.muted, fontSize: 13, fontWeight: '800', width: 24, textAlign: 'center' },
  regularInfo: { flex: 1 },
  regularStats: { alignItems: 'flex-end', gap: 2 },
  regularTrainings: { color: C.txt, fontSize: 18, fontWeight: '800' },
  regularLabel:     { color: C.muted, fontSize: 10 },
  streakRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  streakText:       { color: C.gold, fontSize: 10, fontWeight: '700' },

  // Shared
  avatar:       { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  personName:   { color: C.txt, fontSize: 14, fontWeight: '700' },
  klassBadgeRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  klassBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  klassText:    { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  personLevel:  { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },

  // Empty section
  emptySection:     { paddingVertical: 20, alignItems: 'center' },
  emptySectionText: { color: C.muted, fontSize: 13, opacity: 0.6 },
});
