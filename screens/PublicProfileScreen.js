import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const PR_ICON  = { weight: '⬆', orm: '🏆', setVolume: '💪', sessionVolume: '🔥' };
const PR_LABEL = { weight: 'MAX CIĘŻAR', orm: 'BEST 1RM', setVolume: 'VOL SETU', sessionVolume: 'VOL SESJI' };

const C = {
  bg:     '#0A0A0C',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  txt:    '#f1f5f9',
  sub:    '#99aabb',
  muted:  '#64748b',
  red:    '#FF4757',
  cyan:   '#00F5FF',
  gold:   '#FFD700',
  indigo: '#818cf8',
};

function fmtVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k kg`;
  return `${Math.round(v)} kg`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 40 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: color + '60' }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35, color }]}>{initials}</Text>
    </View>
  );
}

// ── WorkoutCard — post na profilu ─────────────────────────────────────────────

function WorkoutCard({ post, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Tytuł + czas */}
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{post.workout.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {post.prs.length > 0 && (
            <View style={styles.prBadge}>
              <Feather name="award" size={10} color={C.gold} />
              <Text style={styles.prBadgeText}>PR</Text>
            </View>
          )}
          <Text style={styles.cardTime}>{post.timeAgo}</Text>
        </View>
      </View>

      {/* Siłownia */}
      <View style={styles.gymRow}>
        <Feather name="map-pin" size={10} color={C.muted} />
        <Text style={styles.gymText}>{post.gym.name}</Text>
      </View>

      {/* Opis */}
      {!!post.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{post.description}</Text>
      )}

      {/* Statystyki */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Feather name="clock" size={11} color={C.cyan} />
          <Text style={[styles.statVal, { color: C.cyan }]}>{post.workout.duration}</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="bar-chart-2" size={11} color={C.indigo} />
          <Text style={[styles.statVal, { color: C.indigo }]}>{post.workout.exercises} ćwicz.</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="layers" size={11} color={C.muted} />
          <Text style={[styles.statVal, { color: C.muted }]}>{post.workout.sets} serii</Text>
        </View>
        <View style={styles.stat}>
          <Feather name="trending-up" size={11} color={C.gold} />
          <Text style={[styles.statVal, { color: C.gold }]}>{fmtVolume(post.workout.volume)}</Text>
        </View>
      </View>

      {/* Ćwiczenia preview */}
      {post.exercises.slice(0, 3).map((ex, i) => (
        <View key={i} style={styles.exRow}>
          <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
          {ex.isPR && <View style={styles.exPRDot} />}
          <Text style={styles.exSets}>{ex.sets.length} × {Math.max(...ex.sets.map(s => s.w))} kg</Text>
        </View>
      ))}
      {post.exercises.length > 3 && (
        <Text style={styles.exMore}>+{post.exercises.length - 3} więcej</Text>
      )}
    </TouchableOpacity>
  );
}

// ── WorkoutDetail — pełny podgląd ─────────────────────────────────────────────

function WorkoutDetail({ post, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Feather name="chevron-left" size={16} color={C.red} />
        <Text style={styles.backText}>Profil</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>{post.workout.title}</Text>
      <View style={styles.gymRow}>
        <Feather name="map-pin" size={11} color={C.muted} />
        <Text style={styles.gymText}>{post.gym.name}</Text>
        <Text style={[styles.gymText, { marginLeft: 6 }]}>· {post.timeAgo}</Text>
      </View>

      {!!post.description && (
        <Text style={styles.detailDesc}>{post.description}</Text>
      )}

      {/* Statystyki siatka */}
      <View style={styles.detailStats}>
        {[
          { icon: 'clock',       color: C.cyan,   label: 'Czas',     val: post.workout.duration },
          { icon: 'bar-chart-2', color: C.indigo,  label: 'Ćwiczenia', val: post.workout.exercises },
          { icon: 'layers',      color: C.red,     label: 'Serie',    val: post.workout.sets },
          { icon: 'trending-up', color: C.gold,    label: 'Wolumen',  val: fmtVolume(post.workout.volume) },
        ].map(s => (
          <View key={s.label} style={styles.detailStat}>
            <Text style={[styles.detailStatVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.detailStatLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {post.prs.length > 0 && (
        <View style={styles.prSection}>
          <Feather name="award" size={13} color={C.gold} />
          <Text style={styles.prSectionText}>Nowy rekord: {post.prs.join(', ')}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Ćwiczenia</Text>
      {post.exercises.map((ex, i) => (
        <View key={i} style={styles.exCard}>
          <View style={styles.exCardHeader}>
            <Text style={styles.exCardName}>{ex.name}</Text>
          </View>
          {ex.isPR && (ex.prTypes || []).length > 0 && (
            <View style={styles.prTypesRow}>
              {(ex.prTypes || []).map(t => (
                <View key={t} style={styles.prTypeChip}>
                  <Text style={styles.prTypeChipText}>{PR_ICON[t]} {PR_LABEL[t]}</Text>
                </View>
              ))}
            </View>
          )}
          {ex.sets.map((s, j) => (
            <View key={j} style={styles.setRow}>
              <Text style={styles.setNum}>{j + 1}</Text>
              <Text style={styles.setWeight}>{s.w > 0 ? `${s.w} kg` : 'BW'}</Text>
              <Text style={styles.setX}>×</Text>
              <Text style={styles.setReps}>{s.r} reps</Text>
              {s.w > 0 && <Text style={styles.setVol}>{Math.round(s.w * s.r)} kg</Text>}
            </View>
          ))}
        </View>
      ))}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── PublicProfileScreen ───────────────────────────────────────────────────────

export default function PublicProfileScreen({ navigation, route }) {
  const { user, posts = [] } = route.params;
  const [selected, setSelected] = useState(null);

  const totalWorkouts = posts.length;
  const totalVolume   = posts.reduce((s, p) => s + p.workout.volume, 0);
  const totalPRs      = posts.reduce((s, p) => s + p.prs.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header nawigacyjny */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backNavBtn} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      {selected ? (
        <WorkoutDetail post={selected} onBack={() => setSelected(null)} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <View>
              {/* Hero sekcja użytkownika */}
              <View style={styles.hero}>
                <Avatar initials={user.initials} color={user.color} size={72} />
                <Text style={styles.heroName}>{user.name}</Text>
                {!!user.gym && (
                  <View style={styles.heroGymRow}>
                    <Feather name="map-pin" size={12} color={C.muted} />
                    <Text style={styles.heroGym}>{user.gym}</Text>
                  </View>
                )}

                {/* Mini statystyki */}
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{totalWorkouts}</Text>
                    <Text style={styles.heroStatLbl}>Treningi</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{fmtVolume(totalVolume)}</Text>
                    <Text style={styles.heroStatLbl}>Wolumen</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatVal, { color: C.gold }]}>{totalPRs}</Text>
                    <Text style={styles.heroStatLbl}>Rekordy</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Treningi</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="activity" size={32} color={C.muted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>Brak udostępnionych treningów.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <WorkoutCard post={item} onPress={() => setSelected(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  navHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backNavBtn: { width: 40, alignItems: 'flex-start' },
  navTitle:   { flex: 1, textAlign: 'center', color: C.txt, fontSize: 13, fontWeight: '900', letterSpacing: 3 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '800' },
  heroName:   { color: C.txt, fontSize: 22, fontWeight: '800', marginTop: 14 },
  heroGymRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  heroGym:    { color: C.muted, fontSize: 12 },

  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, marginTop: 20, paddingVertical: 14, paddingHorizontal: 8,
    width: '100%',
  },
  heroStat:       { flex: 1, alignItems: 'center' },
  heroStatVal:    { color: C.txt, fontSize: 18, fontWeight: '800' },
  heroStatLbl:    { color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  heroStatDivider:{ width: 1, height: 32, backgroundColor: C.border },

  listPad:      { paddingHorizontal: 14, paddingBottom: 32 },
  sectionTitle: { color: C.txt, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  // Card
  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle:  { color: C.txt, fontSize: 15, fontWeight: '800' },
  cardTime:   { color: C.muted, fontSize: 11 },
  cardDesc:   { color: C.sub, fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 6 },

  gymRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  gymText: { color: C.muted, fontSize: 11 },

  statsRow: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  stat:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal: { fontSize: 11, fontWeight: '700' },

  exRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  exName:  { color: C.sub, fontSize: 12, flex: 1 },
  exSets:  { color: C.muted, fontSize: 11 },
  exPRDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginRight: 6 },
  exMore:  { color: C.muted, fontSize: 11, marginTop: 2 },

  prTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  prTypeChip: {
    backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '50',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  prTypeChipText: { color: C.gold, fontSize: 10, fontWeight: '800' },

  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.gold + '20', borderWidth: 1, borderColor: C.gold + '60',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  prBadgeText: { color: C.gold, fontSize: 10, fontWeight: '800' },

  // Detail
  detailContent: { padding: 16 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText:      { color: C.red, fontSize: 14, fontWeight: '600' },
  detailTitle:   { color: C.txt, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  detailDesc:    { color: C.sub, fontSize: 14, lineHeight: 20, marginVertical: 12 },

  detailStats: {
    flexDirection: 'row',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginVertical: 14,
  },
  detailStat:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: C.border },
  detailStatVal: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  detailStatLbl: { color: C.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  prSection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.gold + '12', borderWidth: 1, borderColor: C.gold + '40',
    borderRadius: 10, padding: 10, marginBottom: 16,
  },
  prSectionText: { color: C.gold, fontSize: 13, fontWeight: '600' },

  exCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  exCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  exCardName:   { color: C.txt, fontSize: 13, fontWeight: '700', flex: 1 },

  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  setNum:    { color: C.muted, fontSize: 11, width: 16, textAlign: 'center' },
  setWeight: { color: C.red, fontSize: 13, fontWeight: '700', minWidth: 50 },
  setX:      { color: C.muted, fontSize: 12 },
  setReps:   { color: C.txt, fontSize: 13, flex: 1 },
  setVol:    { color: C.muted, fontSize: 11 },

  empty:     { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: 'center' },
});
