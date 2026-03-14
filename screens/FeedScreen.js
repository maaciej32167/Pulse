import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { loadRecords, loadProfile } from '../src/storage';

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
  green:  '#22c55e',
  violet: '#a78bfa',
};

// ── PR labels ─────────────────────────────────────────────────────────────────

const PR_ICON  = { weight: '⬆', orm: '🏆', setVolume: '💪', sessionVolume: '🔥' };
const PR_LABEL = { weight: 'MAX CIĘŻAR', orm: 'BEST 1RM', setVolume: 'VOL SETU', sessionVolume: 'VOL SESJI' };

// ── Mock data ─────────────────────────────────────────────────────────────────

const NOW = Date.now();
const MIN = 60000;
const DAY = 86400000;

// Ludzie trenujący teraz w Twojej siłowni
const MOCK_LIVE = [
  { id: 'l1', name: 'Tomek B.',  initials: 'TB', color: '#00F5FF', exercise: 'Squat'       },
  { id: 'l2', name: 'Kasia M.',  initials: 'KM', color: '#a78bfa', exercise: 'Bench Press'  },
  { id: 'l3', name: 'Rafał J.',  initials: 'RJ', color: '#fbbf24', exercise: 'Deadlift'     },
  { id: 'l4', name: 'Bartek S.', initials: 'BS', color: '#22c55e', exercise: 'Pull-ups'     },
];

const MOCK_FEED = [
  {
    id: 'f1',
    user: { name: 'Marek K.', initials: 'MK', color: '#FF4757' },
    gym:  { name: 'FitFabric Poznań' },
    ts: NOW - 32 * MIN,
    timeAgo: '32 min temu',
    gymRank: 1,
    workout: { title: 'Push Day', duration: '1h 12min', volume: 8420, exercises: 5, sets: 18 },
    exercises: [
      { name: 'Bench Press',      sets: [{ w: 100, r: 5 }, { w: 100, r: 5 }, { w: 95, r: 6 }], isPR: true, prTypes: ['weight', 'orm'] },
      { name: 'Overhead Press',   sets: [{ w: 70,  r: 6 }, { w: 70,  r: 5 }, { w: 65, r: 7 }] },
      { name: 'Incline Dumbbell', sets: [{ w: 32,  r: 10 }, { w: 32, r: 9 }, { w: 30, r: 10 }] },
      { name: 'Lateral Raises',   sets: [{ w: 14,  r: 15 }, { w: 14, r: 12 }, { w: 12, r: 15 }] },
      { name: 'Tricep Pushdown',  sets: [{ w: 35,  r: 12 }, { w: 35, r: 10 }, { w: 32, r: 12 }] },
    ],
    likes: 14, comments: 3,
    prs: ['Bench Press'],
    description: 'Nowy rekord na ławce 💪 Czuję się coraz silniejszy.',
  },
  {
    id: 'f2',
    user: { name: 'Anna W.', initials: 'AW', color: '#818cf8' },
    gym:  { name: "Gold's Gym Warszawa" },
    ts: NOW - 2 * 60 * MIN,
    timeAgo: '2h temu',
    gymRank: 3,
    workout: { title: 'Leg Day', duration: '58min', volume: 12300, exercises: 4, sets: 16 },
    exercises: [
      { name: 'Squat',             sets: [{ w: 80,  r: 5 }, { w: 80,  r: 5 }, { w: 75,  r: 6 }, { w: 70, r: 8 }] },
      { name: 'Romanian Deadlift', sets: [{ w: 70,  r: 8 }, { w: 70,  r: 8 }, { w: 65,  r: 10 }] },
      { name: 'Leg Press',         sets: [{ w: 150, r: 12 }, { w: 150, r: 10 }, { w: 140, r: 12 }] },
      { name: 'Calf Raises',       sets: [{ w: 60,  r: 20 }, { w: 60,  r: 18 }, { w: 55,  r: 20 }] },
    ],
    likes: 9, comments: 1,
    prs: [],
    description: null,
  },
  {
    id: 'f3',
    user: { name: 'Piotr R.', initials: 'PR', color: '#00F5FF' },
    gym:  { name: 'Hammer Gym Kraków' },
    ts: NOW - 5 * 60 * MIN,
    timeAgo: '5h temu',
    gymRank: 2,
    workout: { title: 'Pull Day', duration: '1h 5min', volume: 9750, exercises: 5, sets: 20 },
    exercises: [
      { name: 'Deadlift',     sets: [{ w: 160, r: 3 }, { w: 160, r: 3 }, { w: 150, r: 5 }], isPR: true, prTypes: ['weight'] },
      { name: 'Pull-ups',     sets: [{ w: 0,   r: 10 }, { w: 0,  r: 9 }, { w: 0,   r: 8 }] },
      { name: 'Barbell Row',  sets: [{ w: 90,  r: 8 }, { w: 90,  r: 7 }, { w: 85,  r: 8 }] },
      { name: 'Face Pulls',   sets: [{ w: 25,  r: 15 }, { w: 25, r: 15 }, { w: 25,  r: 12 }] },
      { name: 'Hammer Curls', sets: [{ w: 20,  r: 12 }, { w: 20, r: 10 }, { w: 18,  r: 12 }, { w: 18, r: 12 }] },
    ],
    likes: 21, comments: 5,
    prs: ['Deadlift'],
    description: 'Martwy ciąg w górę. Cel: 180 kg do końca roku.',
  },
  {
    id: 'f1b',
    user: { name: 'Marek K.', initials: 'MK', color: '#FF4757' },
    gym:  { name: 'FitFabric Poznań' },
    ts: NOW - 3 * DAY,
    timeAgo: '3 dni temu',
    gymRank: 1,
    workout: { title: 'Pull Day', duration: '58min', volume: 7100, exercises: 4, sets: 16 },
    exercises: [
      { name: 'Deadlift',     sets: [{ w: 140, r: 5 }, { w: 140, r: 4 }, { w: 130, r: 5 }] },
      { name: 'Pull-ups',     sets: [{ w: 0,   r: 10 }, { w: 0,  r: 9 }, { w: 0,   r: 8 }] },
      { name: 'Barbell Row',  sets: [{ w: 80,  r: 8 }, { w: 80,  r: 8 }, { w: 75,  r: 8 }] },
      { name: 'Hammer Curls', sets: [{ w: 18,  r: 12 }, { w: 18, r: 10 }, { w: 16,  r: 12 }, { w: 16, r: 10 }] },
    ],
    likes: 7, comments: 1,
    prs: [],
    description: null,
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtVolume(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${Math.round(v)} kg`;
}

function dateKey(ts) {
  if (!ts) return 'unknown';
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateLabel(ts) {
  if (!ts) return '';
  const now = new Date();
  const todayKey = dateKey(now.getTime());
  const yesterdayKey = dateKey(now.getTime() - DAY);
  const k = dateKey(ts);
  if (k === todayKey) return 'Dziś';
  if (k === yesterdayKey) return 'Wczoraj';
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

function rankColor(rank) {
  if (rank === 1) return C.gold;
  if (rank === 2) return '#c0c0c0';
  return '#cd7f32';
}

// ── buildFeedItems — posts + day separators ───────────────────────────────────

function buildFeedItems(posts, myGym) {
  const items = [];
  let lastKey = null;
  for (const post of posts) {
    const k = dateKey(post.ts);
    if (k !== lastKey) {
      const label = dateLabel(post.ts);
      // Ile treningów z mojej siłowni tego dnia
      const gymCount = myGym
        ? posts.filter(p => dateKey(p.ts) === k && p.gym.name === myGym).length
        : 0;
      items.push({ type: 'sep', id: `sep-${k}`, label, gymName: myGym, gymCount });
      lastKey = k;
    }
    items.push({ type: 'post', id: post.id, post });
  }
  return items;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 40 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: color + '60' }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35, color }]}>{initials}</Text>
    </View>
  );
}

// ── LiveStrip — TERAZ W SIŁOWNI ───────────────────────────────────────────────

function LiveStrip({ gymName, people }) {
  return (
    <View style={styles.liveWrap}>
      <View style={styles.liveHeader}>
        <View style={styles.livePulse} />
        <Text style={styles.liveTitle}>TERAZ TUTAJ</Text>
        <Text style={styles.liveGymName} numberOfLines={1}>{gymName}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
        {people.map(p => (
          <View key={p.id} style={styles.liveItem}>
            <View>
              <Avatar initials={p.initials} color={p.color} size={46} />
              <View style={styles.liveActiveDot} />
            </View>
            <Text style={styles.liveName} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
            <Text style={styles.liveExercise} numberOfLines={1}>{p.exercise}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── FilterTabs ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all',     label: 'WSZYSCY'  },
  { id: 'gym',     label: 'SIŁOWNIA' },
  { id: 'friends', label: 'ZNAJOMI'  },
];

function FilterTabs({ active, onChange }) {
  return (
    <View style={styles.tabsWrap}>
      {TABS.map(t => (
        <TouchableOpacity
          key={t.id}
          style={[styles.tab, active === t.id && styles.tabActive]}
          onPress={() => onChange(t.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, active === t.id && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── DaySeparator ──────────────────────────────────────────────────────────────

function DaySeparator({ label, gymName, gymCount }) {
  return (
    <View style={styles.dayWrap}>
      <View style={styles.dayLine} />
      <View style={styles.dayChip}>
        <Text style={styles.dayLabel}>{label}</Text>
        {gymName && gymCount > 0 && (
          <Text style={styles.dayGym}> · {gymName} · {gymCount} treningi</Text>
        )}
      </View>
      <View style={styles.dayLine} />
    </View>
  );
}

// ── FeedCard ──────────────────────────────────────────────────────────────────

function FeedCard({ post, onPress, onAvatarPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Pressable onPress={onAvatarPress} hitSlop={8}>
          <Avatar initials={post.user.initials} color={post.user.color} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardUser}>{post.user.name}</Text>
          <View style={styles.cardGymRow}>
            <Feather name="map-pin" size={10} color={C.muted} />
            <Text style={styles.cardGym}>{post.gym.name}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardTime}>{post.timeAgo}</Text>
          </View>
          {/* Rank w siłowni */}
          {post.gymRank && (
            <View style={styles.rankRow}>
              <Text style={[styles.rankChip, { color: rankColor(post.gymRank), borderColor: rankColor(post.gymRank) + '50', backgroundColor: rankColor(post.gymRank) + '15' }]}>
                #{post.gymRank} w siłowni · ten tydzień
              </Text>
            </View>
          )}
        </View>
        {post.prs.length > 0 && (
          <View style={styles.prBadge}>
            <Feather name="award" size={11} color={C.gold} />
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        )}
      </View>

      {/* Opis */}
      {!!post.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{post.description}</Text>
      )}

      {/* Statystyki */}
      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Feather name="clock" size={12} color={C.cyan} />
          <Text style={[styles.cardStatVal, { color: C.cyan }]}>{post.workout.duration}</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="bar-chart-2" size={12} color={C.indigo} />
          <Text style={[styles.cardStatVal, { color: C.indigo }]}>{post.workout.exercises} ćwicz.</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="layers" size={12} color={C.muted} />
          <Text style={[styles.cardStatVal, { color: C.muted }]}>{post.workout.sets} serii</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="trending-up" size={12} color={C.gold} />
          <Text style={[styles.cardStatVal, { color: C.gold }]}>{fmtVolume(post.workout.volume)}</Text>
        </View>
      </View>

      {/* Ćwiczenia preview */}
      <View style={styles.exPreview}>
        {post.exercises.slice(0, 3).map((ex, i) => (
          <View key={i} style={styles.exPreviewRow}>
            <Text style={styles.exPreviewName} numberOfLines={1}>{ex.name}</Text>
            {ex.isPR && <View style={styles.exPRDot} />}
            <Text style={styles.exPreviewSets}>{ex.sets.length} × {Math.max(...ex.sets.map(s => s.w))} kg</Text>
          </View>
        ))}
        {post.exercises.length > 3 && (
          <Text style={styles.exPreviewMore}>+{post.exercises.length - 3} więcej</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.cardAction} hitSlop={8}>
          <Feather name="heart" size={14} color={C.muted} />
          <Text style={styles.cardActionText}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardAction} hitSlop={8}>
          <Feather name="message-circle" size={14} color={C.muted} />
          <Text style={styles.cardActionText}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardAction} hitSlop={8}>
          <Feather name="share-2" size={14} color={C.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── FeedDetail ────────────────────────────────────────────────────────────────

function FeedDetail({ post, onBack, onAvatarPress }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Feather name="chevron-left" size={16} color={C.red} />
          <Text style={styles.backText}>Feed</Text>
        </TouchableOpacity>

        <View style={styles.detailHeader}>
          <Pressable onPress={onAvatarPress} hitSlop={8}>
            <Avatar initials={post.user.initials} color={post.user.color} size={48} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.detailUser}>{post.user.name}</Text>
            <View style={styles.cardGymRow}>
              <Feather name="map-pin" size={11} color={C.muted} />
              <Text style={styles.cardGym}>{post.gym.name}</Text>
            </View>
            {post.gymRank && (
              <View style={[styles.rankRow, { marginTop: 4 }]}>
                <Text style={[styles.rankChip, { color: rankColor(post.gymRank), borderColor: rankColor(post.gymRank) + '50', backgroundColor: rankColor(post.gymRank) + '15' }]}>
                  #{post.gymRank} w siłowni · ten tydzień
                </Text>
              </View>
            )}
            <Text style={[styles.cardTime, { marginTop: 2 }]}>{post.timeAgo}</Text>
          </View>
          {post.prs.length > 0 && (
            <View style={styles.prBadge}>
              <Feather name="award" size={11} color={C.gold} />
              <Text style={styles.prBadgeText}>PR</Text>
            </View>
          )}
        </View>

        {!!post.description && (
          <Text style={styles.detailDesc}>{post.description}</Text>
        )}

        <View style={styles.detailStats}>
          {[
            { icon: 'clock',       color: C.cyan,   label: 'Czas',      val: post.workout.duration },
            { icon: 'bar-chart-2', color: C.indigo,  label: 'Ćwiczenia', val: post.workout.exercises },
            { icon: 'layers',      color: C.red,     label: 'Serie',     val: post.workout.sets },
            { icon: 'trending-up', color: C.gold,    label: 'Wolumen',   val: fmtVolume(post.workout.volume) },
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
    </View>
  );
}

// ── FeedScreen ────────────────────────────────────────────────────────────────

export default function FeedScreen({ navigation }) {
  const [selected, setSelected]   = useState(null);
  const [myPosts,  setMyPosts]    = useState([]);
  const [myGym,    setMyGym]      = useState('FitFabric Poznań'); // default mock
  const [activeTab, setActiveTab] = useState('all');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [records, profile] = await Promise.all([loadRecords(), loadProfile()]);

        // Wykryj siłownię z ostatniego treningu
        const withGym = [...records].reverse().find(r => r.gymName);
        if (withGym?.gymName) setMyGym(withGym.gymName);

        // Grupuj rekordy po workoutId
        const wMap = new Map();
        for (const r of records) {
          const key = r.workoutId || r.isoDate || 'unknown';
          if (!wMap.has(key)) wMap.set(key, []);
          wMap.get(key).push(r);
        }

        const posts = [];
        for (const [, recs] of wMap) {
          if (!recs.length) continue;
          const sorted = [...recs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const first  = sorted[0];
          const last   = sorted[sorted.length - 1];
          const dur    = sorted.length > 1 ? last.timestamp - first.timestamp : null;
          const totalVol = recs.reduce((s, r) => s + Number(r.weight) * Number(r.reps), 0);

          const exMap = new Map();
          for (const r of recs) {
            if (!exMap.has(r.exercise)) exMap.set(r.exercise, []);
            exMap.get(r.exercise).push({ w: Number(r.weight), r: Number(r.reps), isPR: r.isPR, prTypes: r.prTypes || [] });
          }
          const exercises = [...exMap.entries()].map(([name, sets]) => {
            const uniqueTypes = [...new Set(sets.flatMap(s => s.prTypes || []))];
            return { name, sets, isPR: sets.some(s => s.isPR), prTypes: uniqueTypes };
          });

          const prs = exercises.filter(e => e.isPR).map(e => e.name);

          const durationStr = dur
            ? dur < 3600000
              ? `${Math.floor(dur / 60000)} min`
              : `${Math.floor(dur / 3600000)}h ${Math.floor((dur % 3600000) / 60000)}min`
            : null;

          const ts = first.timestamp || 0;
          const diffMin = Math.round((Date.now() - ts) / 60000);
          const timeAgo = diffMin < 60 ? `${diffMin} min temu`
            : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h temu`
            : `${Math.floor(diffMin / 1440)} dni temu`;

          posts.push({
            id: first.workoutId || first.id,
            user: {
              name: profile.name || 'Ty',
              initials: (profile.name || 'TY').slice(0, 2).toUpperCase(),
              color: '#FF4757',
            },
            gym: { name: first.gymName || 'Siłownia' },
            ts, timeAgo,
            gymRank: null,
            workout: {
              title: 'Trening',
              duration: durationStr || '—',
              volume: Math.round(totalVol),
              exercises: exercises.length,
              sets: recs.length,
            },
            exercises,
            likes: 0, comments: 0,
            prs,
            description: first.note || null,
          });
        }

        posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        setMyPosts(posts.slice(0, 5));
      })();
    }, [])
  );

  // Połącz własne posty z mockami
  const allPosts = [
    ...myPosts,
    ...MOCK_FEED.filter(m => !myPosts.find(p => p.id === m.id)),
  ].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // Filtruj wg aktywnej zakładki
  const filteredPosts =
    activeTab === 'gym'     ? allPosts.filter(p => p.gym.name === myGym)
    : activeTab === 'friends' ? myPosts
    : allPosts;

  // Zbuduj płaską listę z separatorami dni
  const feedItems = buildFeedItems(filteredPosts, myGym);

  function handleAvatarPress(post) {
    const isOwn = myPosts.some(p => p.id === post.id);
    if (isOwn) {
      navigation.navigate('Profil');
    } else {
      const userPosts = allPosts.filter(p => p.user.name === post.user.name);
      navigation.navigate('PublicProfile', {
        user: { ...post.user, gym: post.gym.name },
        posts: userPosts,
      });
    }
  }

  if (selected) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader navigation={navigation} icon="rss" label="FEED" color={C.red} />
        <FeedDetail
          post={selected}
          onBack={() => setSelected(null)}
          onAvatarPress={() => handleAvatarPress(selected)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader navigation={navigation} icon="rss" label="FEED" color={C.red} />

      <FlatList
        data={feedItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* TERAZ TUTAJ — pasek */}
            {myGym && (
              <LiveStrip gymName={myGym} people={MOCK_LIVE} />
            )}
            {/* Zakładki filtrowania */}
            <FilterTabs active={activeTab} onChange={setActiveTab} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={C.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>
              {activeTab === 'gym'
                ? `Nikt z ${myGym} nie trenował jeszcze w tej zakładce.`
                : activeTab === 'friends'
                ? 'Brak treningów znajomych.'
                : 'Brak aktywności.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'sep') {
            return (
              <DaySeparator
                label={item.label}
                gymName={item.gymName}
                gymCount={item.gymCount}
              />
            );
          }
          return (
            <View style={{ marginBottom: 10 }}>
              <FeedCard
                post={item.post}
                onPress={() => setSelected(item.post)}
                onAvatarPress={() => handleAvatarPress(item.post)}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  listPad: { padding: 14, paddingBottom: 32 },

  // Avatar
  avatar:     { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },

  // LiveStrip
  liveWrap: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 16, marginBottom: 12, paddingTop: 12, paddingBottom: 4,
  },
  liveHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, marginBottom: 10,
  },
  livePulse: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.green,
    shadowColor: C.green, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  },
  liveTitle:   { color: C.green, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  liveGymName: { color: C.muted, fontSize: 11, flex: 1 },
  liveScroll:  { paddingHorizontal: 14, paddingBottom: 12, gap: 16 },
  liveItem:    { alignItems: 'center', width: 58 },
  liveActiveDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.bg,
  },
  liveName:     { color: C.txt,  fontSize: 10, fontWeight: '700', marginTop: 5, textAlign: 'center' },
  liveExercise: { color: C.muted, fontSize: 9, marginTop: 1, textAlign: 'center' },

  // FilterTabs
  tabsWrap: {
    flexDirection: 'row', gap: 6, marginBottom: 14,
  },
  tab: {
    flex: 1, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card, alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderColor: 'rgba(255,71,87,0.4)',
  },
  tabText:       { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tabTextActive: { color: C.red },

  // DaySeparator
  dayWrap:  { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  dayLine:  { flex: 1, height: 1, backgroundColor: C.border },
  dayChip:  { flexDirection: 'row', alignItems: 'center' },
  dayLabel: { color: C.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayGym:   { color: 'rgba(100,116,139,0.6)', fontSize: 10 },

  // Card
  card: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardUser:    { color: C.txt, fontSize: 14, fontWeight: '700' },
  cardGymRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardGym:     { color: C.muted, fontSize: 11 },
  cardDot:     { color: C.muted, fontSize: 11 },
  cardTime:    { color: C.muted, fontSize: 11 },
  cardDesc:    { color: C.sub, fontSize: 13, lineHeight: 18, marginBottom: 10 },

  rankRow:  { marginTop: 4 },
  rankChip: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },

  cardStats: {
    flexDirection: 'row', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  cardStat:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatVal: { fontSize: 12, fontWeight: '700' },

  exPreview:     { marginBottom: 10 },
  exPreviewRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  exPreviewName: { color: C.sub, fontSize: 12, flex: 1 },
  exPreviewSets: { color: C.muted, fontSize: 11 },
  exPRDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginRight: 6 },
  exPreviewMore: { color: C.muted, fontSize: 11, marginTop: 2 },

  cardFooter:     { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  cardAction:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardActionText: { color: C.muted, fontSize: 12 },

  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.gold + '20', borderWidth: 1, borderColor: C.gold + '60',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  prBadgeText: { color: C.gold, fontSize: 10, fontWeight: '800' },

  prTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  prTypeChip: {
    backgroundColor: C.gold + '18', borderWidth: 1, borderColor: C.gold + '50',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  prTypeChipText: { color: C.gold, fontSize: 10, fontWeight: '800' },

  // Detail
  detailContent: { padding: 16 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText:      { color: C.red, fontSize: 14, fontWeight: '600' },
  detailHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  detailUser:    { color: C.txt, fontSize: 16, fontWeight: '800' },
  detailDesc:    { color: C.sub, fontSize: 14, lineHeight: 20, marginBottom: 16 },

  detailStats: {
    flexDirection: 'row',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginBottom: 14,
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

  sectionTitle: { color: C.txt, fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

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
  setWeight: { color: C.red,   fontSize: 13, fontWeight: '700', minWidth: 50 },
  setX:      { color: C.muted, fontSize: 12 },
  setReps:   { color: C.txt,   fontSize: 13, flex: 1 },
  setVol:    { color: C.muted, fontSize: 11 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
