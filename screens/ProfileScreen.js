import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Modal, TextInput, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polygon, Line, Circle, Path, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import {
  loadRecords, loadBodyWeight, loadBWExercises, loadProfile, saveProfile,
} from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';
import { estimate1RM, round1, effectiveWeight } from '../src/utils';
import { COLORS } from '../src/colors';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

// ── Colors ────────────────────────────────────────────────────────────────────

const RED = '#FF4757';
const C = {
  bg:     '#080a12',
  card:   '#0d0f1a',
  border: '#1a1c2a',
  border2:'rgba(255,255,255,0.06)',
  txt:    '#ddeeff',
  sub:    '#99aabb',
  muted:  '#6b7f93',
  gold:   '#FFD700',
  accent: '#818cf8',
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_PL = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];
const DAYS_SHORT = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];
// ── Data helpers ──────────────────────────────────────────────────────────────

function startOfDay(ts) {
  if (!ts) return 0;
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupByDay(records) {
  const map = new Map();
  for (const r of records) {
    const day = startOfDay(r.timestamp || 0);
    if (!day) continue;
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(r);
  }
  return map;
}

function getDayVolume(recs) {
  return recs.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0);
}

function getDayDurationMs(recs) {
  const tss = recs.map(r => r.timestamp || 0).filter(Boolean);
  if (tss.length < 2) return 0;
  return Math.max(...tss) - Math.min(...tss);
}

function fmtDuration(ms) {
  if (!ms || ms < 60000) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function fmtDurationShort(ms) {
  if (!ms || ms < 60000) return '0';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

// ── RPG helpers ───────────────────────────────────────────────────────────────

const RPG_CLASSES = [
  { maxAvgReps: 5,   name: 'IRONBORN', icon: '⚒',  color: RED },
  { maxAvgReps: 9,   name: 'WARRIOR',  icon: '⚔️',  color: '#f87171' },
  { maxAvgReps: 15,  name: 'COLOSSUS', icon: '💪',  color: '#a78bfa' },
  { maxAvgReps: 999, name: 'ATHLETE',  icon: '⚡', color: '#00F5FF' },
];

function getRPGClass(records) {
  if (!records.length) return { name: 'ROOKIE', icon: '🌱', color: C.muted };
  const avg = records.reduce((s, r) => s + Number(r.reps || 0), 0) / records.length;
  return RPG_CLASSES.find(c => avg < c.maxAvgReps) || RPG_CLASSES[RPG_CLASSES.length - 1];
}

function calcXPLevel(records) {
  const xp = records.length * 10;
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const xpThis = 50 * (level - 1) ** 2;
  const xpNext = 50 * level ** 2;
  return { xp, level, current: xp - xpThis, needed: xpNext - xpThis };
}

function calcDayStreak(dayMap) {
  const ONE = 86400000;
  const today = startOfDay(Date.now());
  const start = dayMap.has(today) ? today : dayMap.has(today - ONE) ? today - ONE : null;
  if (!start) return 0;
  let s = 0;
  for (let d = start; dayMap.has(d); d -= ONE) s++;
  return s;
}

function calcBestStreak(dayMap) {
  const days = Array.from(dayMap.keys()).sort((a, b) => a - b);
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    cur = prev !== null && d - prev === 86400000 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

function calcIronPath(records, dayMap, bodyWeight) {
  const best1RM = records.length
    ? Math.max(...records.map(r => estimate1RM(Number(r.weight), Number(r.reps)) || 0))
    : 0;
  const sila = Math.min(100, Math.round((best1RM / Math.max(bodyWeight * 2, 1)) * 100));

  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  let mVol = 0;
  for (const [day, recs] of dayMap) {
    if (day >= mStart && day <= mEnd) mVol += getDayVolume(recs);
  }
  const wolumen = Math.min(100, Math.round(mVol / 500));

  const last30 = Date.now() - 30 * 86400000;
  let recent = 0;
  for (const [day] of dayMap) if (day >= last30) recent++;
  const regularnosc = Math.min(100, Math.round(recent / 20 * 100));

  const uniqueEx = new Set(records.map(r => r.exercise)).size;
  const roznorodnosc = Math.min(100, Math.round(uniqueEx / 25 * 100));

  const progres = Math.min(100, Math.round(dayMap.size / 50 * 100));

  return [
    { label: 'SIŁA',         val: sila },
    { label: 'WOLUMEN',      val: wolumen },
    { label: 'REGULARNOŚĆ',  val: regularnosc },
    { label: 'RÓŻNORODNOŚĆ', val: roznorodnosc },
    { label: 'PROGRES',      val: progres },
  ];
}

// ── RadarChart (SVG) ──────────────────────────────────────────────────────────

function RadarChart({ data }) {
  const cx = 80, cy = 80, r = 55;
  const n = data.length;
  const ang = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt  = (i, ratio) => ({
    x: cx + Math.cos(ang(i)) * r * ratio,
    y: cy + Math.sin(ang(i)) * r * ratio,
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = data.map((d, i) => pt(i, d.val / 100));
  const polyPts    = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      {gridLevels.map(l => (
        <Polygon
          key={l}
          points={data.map((_, i) => { const p = pt(i, l); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="#1e2030" strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const p = pt(i, 1);
        return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e2030" strokeWidth={1} />;
      })}
      <Polygon points={polyPts} fill={`${RED}25`} stroke={RED} strokeWidth={1.5} />
      {dataPoints.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={RED} />)}
      {data.map((d, i) => {
        const p = pt(i, 1.3);
        return (
          <SvgText
            key={i} x={p.x} y={p.y}
            textAnchor="middle" fontSize={6} fill={C.muted}
            fontWeight="700"
          >
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ── IronPath ─────────────────────────────────────────────────────────────────

function IronPath({ data }) {
  return (
    <View style={styles.ironCard}>
      <RadarChart data={data} />
      <View style={styles.ironBars}>
        <Text style={styles.ironTitle}>Iron Path</Text>
        {data.map(({ label, val }) => (
          <View key={label} style={styles.ironItem}>
            <View style={styles.ironLabelRow}>
              <Text style={styles.ironLabel}>{label}</Text>
              <Text style={styles.ironVal}>{val}</Text>
            </View>
            <View style={styles.ironTrack}>
              <View style={[
                styles.ironFill,
                { width: `${val}%`, backgroundColor: val >= 85 ? RED : val >= 65 ? '#2a4a6a' : '#1e2a3a' },
              ]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── ProfileHero ───────────────────────────────────────────────────────────────

function EditProfileModal({ visible, profile, onSave, onClose }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => { if (visible) setDraft(profile); }, [profile, visible]);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) set('photo', result.assets[0].uri);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edytuj profil</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={C.sub} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Zdjęcie profilowe</Text>
          <TouchableOpacity style={styles.photoPickerBtn} onPress={pickPhoto} activeOpacity={0.8}>
            {draft.photo
              ? <Image source={{ uri: draft.photo }} style={styles.photoPickerImg} />
              : <View style={styles.photoPickerPlaceholder}>
                  <Feather name="camera" size={24} color={C.muted} />
                  <Text style={styles.photoPickerText}>Dodaj zdjęcie</Text>
                </View>
            }
            <View style={styles.photoPickerBadge}>
              <Feather name="edit-2" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          {[
            ['name',     'Imię i nazwisko',  'np. Jan Kowalski'],
            ['gym',      'Siłownia',         'np. FitFabric Poznań'],
            ['location', 'Miasto',           'np. Poznań'],
          ].map(([key, label, placeholder]) => (
            <View key={key}>
              <Text style={styles.modalLabel}>{label}</Text>
              <TextInput
                style={styles.modalInput}
                value={draft[key] || ''}
                onChangeText={v => set(key, v)}
                placeholder={placeholder}
                placeholderTextColor={C.muted}
              />
            </View>
          ))}

          <View style={styles.modalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Waga (kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={draft.weight ? String(draft.weight) : ''}
                onChangeText={v => set('weight', v ? parseFloat(v) || v : '')}
                placeholder="np. 80"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Wiek</Text>
              <TextInput
                style={styles.modalInput}
                value={draft.age ? String(draft.age) : ''}
                onChangeText={v => set('age', v ? parseInt(v) || v : '')}
                placeholder="np. 25"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.modalSaveBtn} onPress={() => onSave(draft)}>
            <Text style={styles.modalSaveBtnText}>Zapisz</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ProfileHero({ profile, records, onEditPress }) {
  const dayMap = useMemo(() => groupByDay(records), [records]);
  const { level } = calcXPLevel(records);
  const streak    = calcDayStreak(dayMap);
  const cls       = getRPGClass(records);
  const streakLbl = streak === 1 ? 'dzień' : 'dni';

  return (
    <View style={styles.hero}>
      {/* Left: avatar */}
      <TouchableOpacity style={styles.avatarWrap} onPress={onEditPress} activeOpacity={0.85}>
        {profile.photo
          ? <Image source={{ uri: profile.photo }} style={styles.avatarImg} />
          : <View style={styles.avatarBox}>
              <Feather name="user" size={28} color={C.muted} />
            </View>
        }
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{level}</Text>
        </View>
      </TouchableOpacity>

      {/* Right: info */}
      <View style={styles.heroInfo}>
        <Text style={styles.heroName} numberOfLines={1}>{profile.name || 'Twój Profil'}</Text>
        <Text style={[styles.heroClass, { color: cls.color }]}>{cls.icon} {cls.name}</Text>
        {!!profile.gym && (
          <Text style={styles.heroGym} numberOfLines={1}>{profile.gym}</Text>
        )}
        <Text style={styles.heroMeta}>
          {streak > 0 ? `🔥 streak ${streak} ${streakLbl}` : ''}
          {streak > 0 && profile.location ? '  ·  ' : ''}
          {profile.location ? `📍 ${profile.location}` : ''}
        </Text>
      </View>

      {/* Gear */}
      <TouchableOpacity style={styles.heroGear} onPress={onEditPress} hitSlop={12}>
        <View style={styles.heroGearBox}>
          <Text style={styles.heroGearText}>⚙</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── StatsView ─────────────────────────────────────────────────────────────────

function StatsView({ records, ironPath }) {
  const [timeframe, setTimeframe] = useState('week');
  const [metric,    setMetric]    = useState('duration');
  const dayMap = useMemo(() => groupByDay(records), [records]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (timeframe === 'week') {
      // Poniedziałek bieżącego tygodnia (Pn=0 … Nd=6)
      const today = new Date();
      const daysFromMonday = (today.getDay() + 6) % 7; // 0=Pn, 6=Nd
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);

      return DAYS_SHORT.map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const ts = startOfDay(d.getTime());
        const recs = dayMap.get(ts) || [];
        return { label, volume: getDayVolume(recs), trainings: recs.length > 0 ? 1 : 0, duration: getDayDurationMs(recs) };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mS = d.getTime();
      const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      let vol = 0, tr = 0, dur = 0;
      for (const [day, recs] of dayMap) {
        if (day >= mS && day <= mE) { vol += getDayVolume(recs); tr++; dur += getDayDurationMs(recs); }
      }
      return { label: MONTHS_PL[d.getMonth()].slice(0, 3), volume: vol, trainings: tr, duration: dur };
    });
  }, [timeframe, dayMap]);

  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  let mWorkouts = 0, mVolume = 0, mDuration = 0;
  for (const [day, recs] of dayMap) {
    if (day >= mStart && day <= mEnd) { mWorkouts++; mVolume += getDayVolume(recs); mDuration += getDayDurationMs(recs); }
  }
  const avgDur   = mWorkouts > 0 ? mDuration / mWorkouts : 0;
  const bestStr  = calcBestStreak(dayMap);

  const maxVal = Math.max(...chartData.map(d => d[metric]), 1);
  const BAR_H  = 80;
  const fmtBarVal = (d) => {
    if (metric === 'volume')   return `${Math.round(d.volume).toLocaleString('pl-PL')}`;
    if (metric === 'trainings')return `${d.trainings}`;
    return fmtDurationShort(d.duration);
  };
  const METRICS = [
    { id: 'duration', label: 'CZAS' },
    { id: 'trainings', label: 'TRENINGI' },
    { id: 'volume', label: 'WOLUMEN' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
      {/* Iron Path */}
      <IronPath data={ironPath} />

      {/* Timeframe */}
      <View style={styles.tfRow}>
        {[['week', 'TYDZIEŃ'], ['month', 'MIESIĄCE']].map(([id, lbl]) => (
          <TouchableOpacity
            key={id} style={[styles.tfBtn, timeframe === id && styles.tfBtnActive]}
            onPress={() => setTimeframe(id)}
          >
            <Text style={[styles.tfBtnText, timeframe === id && styles.tfBtnTextActive]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metric selector */}
      <View style={styles.metricRow}>
        {METRICS.map(m => (
          <TouchableOpacity
            key={m.id} style={[styles.metricBtn, metric === m.id && styles.metricBtnActive]}
            onPress={() => setMetric(m.id)}
          >
            <Text style={[styles.metricBtnText, metric === m.id && styles.metricBtnTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartCardTitle}>
          {METRICS.find(m => m.id === metric)?.label} · {timeframe === 'week' ? 'ten tydzień' : 'ostatnie 6 mies.'}
        </Text>
        <View style={styles.chartBarsRow}>
          {chartData.map((d, i) => {
            const v   = d[metric];
            const h   = Math.max(maxVal > 0 ? Math.round((v / maxVal) * BAR_H) : 0, v > 0 ? 2 : 0);
            const isM = v === Math.max(...chartData.map(x => x[metric])) && v > 0;
            return (
              <View key={i} style={styles.chartBarCol}>
                {isM && <Text style={[styles.chartTopLabel, { color: RED }]}>{fmtBarVal(d)}</Text>}
                <View style={[styles.chartBar, {
                  height: Math.max(h, 2),
                  backgroundColor: isM ? RED : v === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.12)',
                  ...(isM && { shadowColor: RED, shadowOpacity: 0.5, shadowRadius: 6 }),
                }]} />
                <Text style={styles.chartBarLabel}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Stat cards 2×2 */}
      <View style={styles.statGrid2}>
        {[
          [avgDur > 0 ? fmtDuration(avgDur) : '—',                                                'Śr. czas sesji'],
          [`${mWorkouts}`,                                                                          'Treningi (mies.)'],
          [`${Math.round(mVolume).toLocaleString('pl-PL')} kg`,                                    'Wolumen (mies.)'],
          [bestStr > 0 ? `${bestStr} dni` : '—',                                                   'Najdłuższy streak'],
        ].map(([val, lbl]) => (
          <View key={lbl} style={styles.statCard2}>
            <Text style={styles.statCard2Val}>{val}</Text>
            <Text style={styles.statCard2Lbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── HistoriaView ──────────────────────────────────────────────────────────────

function getPRExercises(dayRecs, allRecords, dayStart) {
  const prs = new Set(), seen = new Set();
  for (const r of dayRecs) {
    if (seen.has(r.exercise)) continue;
    seen.add(r.exercise);
    const prev = allRecords.filter(p => p.exercise === r.exercise && startOfDay(p.timestamp || 0) < dayStart);
    if (!prev.length) continue;
    const bestPrev = Math.max(...prev.map(p => estimate1RM(Number(p.weight), Number(p.reps)) || 0));
    const bestCur  = Math.max(...dayRecs.filter(d => d.exercise === r.exercise).map(d => estimate1RM(Number(d.weight), Number(d.reps)) || 0));
    if (bestCur > bestPrev) prs.add(r.exercise);
  }
  return [...prs];
}

function groupExSets(dayRecs, prSet = new Set()) {
  const map = new Map();
  for (const r of dayRecs) {
    if (!map.has(r.exercise)) map.set(r.exercise, []);
    map.get(r.exercise).push(r);
  }
  return Array.from(map.entries()).map(([ex, recs]) => {
    const volume = recs.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0);
    return {
      ex,
      sets: recs.length,
      volume: `${Math.round(volume)} kg`,
      pr: prSet.has(ex),
    };
  });
}

function WorkoutCard({ day, dayRecs, allRecords, bodyWeight, bwExercises, onSelect }) {
  const [open, setOpen] = useState(false);
  const date      = dayRecs[0]?.date || new Date(day).toLocaleDateString('pl-PL');
  const exercises = [...new Set(dayRecs.map(r => r.exercise))].length;
  const volume    = getDayVolume(dayRecs);
  const duration  = getDayDurationMs(dayRecs);
  const prExs     = getPRExercises(dayRecs, allRecords, day);
  const prSet     = new Set(prExs);
  const exRows    = groupExSets(dayRecs, prSet);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  }

  return (
    <View style={[styles.wCard, open && styles.wCardOpen]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <View style={styles.wCardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.wCardTitleRow}>
              {prExs.length > 0 && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>★ PR</Text>
                </View>
              )}
              <Text style={styles.wCardDate}>{date}</Text>
            </View>
            <Text style={styles.wCardMeta}>
              {duration > 0 ? fmtDuration(duration) : '—'}
              {'  ·  '}{exercises} ćw.{'  ·  '}{dayRecs.length} serii
            </Text>
          </View>
          <Text style={styles.wCardVolSub}>{Math.round(volume)} kg</Text>
          <Text style={[styles.wCardChev, open && styles.wCardChevOpen]}>▾</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.wCardBody}>
          <View style={styles.wCardDivider} />
          <View style={styles.exTableHeader}>
            {['Ćwiczenie', 'Sets', 'Volume'].map((h, i) => (
              <Text key={h} style={[styles.exTableHead, i > 0 && { textAlign: 'right' }]}>{h}</Text>
            ))}
          </View>
          {exRows.map((row, i) => (
            <View key={row.ex} style={[styles.exRow, i < exRows.length - 1 && styles.exRowBorder]}>
              <Text style={styles.exName} numberOfLines={1}>{row.ex}</Text>
              <Text style={styles.exSets}>{row.sets}</Text>
              <Text style={[styles.exWeight, row.pr && { color: RED, fontWeight: '700' }]}>{row.volume}</Text>
            </View>
          ))}
          <View style={styles.wCardActions}>
            <TouchableOpacity
              style={styles.wCardActionBtn}
              onPress={() => onSelect({ day, dayRecs, allRecords, bodyWeight, bwExercises, date })}
            >
              <Text style={styles.wCardActionText}>SZCZEGÓŁY</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── HistoriaDetail (inline workout detail) ────────────────────────────────────

function HistoriaDetail({ day, dayRecs, allRecords, bodyWeight, bwExercises, date, onBack }) {
  const groups = [];
  const map = new Map();
  for (const r of dayRecs) {
    if (!map.has(r.exercise)) { map.set(r.exercise, []); groups.push({ exercise: r.exercise, sets: map.get(r.exercise) }); }
    map.get(r.exercise).push(r);
  }

  const totalVolume = dayRecs.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0);
  const timestamps  = dayRecs.map(r => r.timestamp || 0).filter(Boolean);
  const dayStart    = timestamps.length ? Math.min(...timestamps) : 0;
  const duration    = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : null;

  const prMap = new Map(), prSet = new Set();
  for (const { exercise, sets } of groups) {
    const bestCur = Math.max(...sets.map(s => estimate1RM(Number(s.weight), Number(s.reps)) || 0));
    if (bestCur > 0) prMap.set(exercise, round1(bestCur));
    const prev = allRecords.filter(r => r.exercise === exercise && (r.timestamp || 0) < dayStart);
    if (prev.length) {
      const bestPrev = Math.max(...prev.map(r => estimate1RM(Number(r.weight), Number(r.reps)) || 0));
      if (bestCur > bestPrev) prSet.add(exercise);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
      {/* Back + title */}
      <TouchableOpacity style={styles.detailBack} onPress={onBack} activeOpacity={0.7}>
        <Feather name="chevron-left" size={16} color={RED} />
        <Text style={styles.detailBackText}>Historia</Text>
      </TouchableOpacity>
      <Text style={styles.detailDate}>{date}</Text>

      {/* Stat row */}
      <View style={styles.detailStats}>
        {[
          [duration != null ? fmtDuration(duration) : '—', 'Czas'],
          [groups.length,                                   'Ćwiczenia'],
          [dayRecs.length,                                  'Sets'],
          [`${Math.round(totalVolume)} kg`,                 'Volume'],
        ].map(([v, l], i, arr) => (
          <View key={l} style={[styles.detailStatItem, i < arr.length - 1 && styles.detailStatBorder]}>
            <Text style={styles.detailStatVal}>{v}</Text>
            <Text style={styles.detailStatLbl}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Exercise cards */}
      {groups.map(({ exercise, sets }) => {
        const pr1RM = prMap.get(exercise);
        const isPR  = prSet.has(exercise);
        const isBW  = bwExercises && bwExercises.has(exercise);
        return (
          <View key={exercise} style={styles.detailCard}>
            <View style={styles.detailCardHeader}>
              <Text style={styles.detailExName}>{exercise}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {isPR && (
                  <View style={styles.detailPRBadge}>
                    <Text style={styles.detailPRText}>★ PR</Text>
                  </View>
                )}
                {pr1RM && <Text style={styles.detailOrm}>1RM ≈ {pr1RM} kg</Text>}
              </View>
            </View>
            {sets.map((s, i) => {
              const weightStr = isBW
                ? `${round1(s.bodyWeightKg || bodyWeight)} + ${round1(s.weight)} kg`
                : `${round1(s.weight)} kg`;
              return (
                <View key={s.id || i} style={[styles.detailSetRow, s.isPR && styles.detailSetRowPR]}>
                  <Text style={styles.detailSetNum}>{i + 1}</Text>
                  <Text style={styles.detailSetWeight}>
                    {weightStr}<Text style={styles.detailSetX}> × </Text>
                    <Text style={styles.detailSetReps}>{s.reps} reps</Text>
                  </Text>
                  <Text style={styles.detailSetVol}>{Math.round((Number(s.weight) || 0) * (Number(s.reps) || 0))} kg</Text>
                  {s.isPR && (
                    <View style={styles.detailPRMedal}>
                      <Text style={styles.detailPRMedalText}>PR</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

function HistoriaView({ records, bodyWeight, bwExercises }) {
  const dayMap    = useMemo(() => groupByDay(records), [records]);
  const days      = useMemo(() => Array.from(dayMap.keys()).sort((a, b) => b - a), [dayMap]);
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <HistoriaDetail
        {...selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (!days.length) {
    return <View style={styles.empty}><Text style={styles.emptyText}>Brak treningów</Text></View>;
  }

  return (
    <FlatList
      data={days}
      keyExtractor={d => String(d)}
      contentContainerStyle={styles.listPad}
      ListHeaderComponent={<Text style={styles.listSectionTitle}>Ostatnie treningi</Text>}
      renderItem={({ item: day }) => (
        <WorkoutCard
          day={day}
          dayRecs={dayMap.get(day)}
          allRecords={records}
          bodyWeight={bodyWeight}
          bwExercises={bwExercises}
          onSelect={setSelected}
        />
      )}
    />
  );
}

function resolveTs(r) {
  if (r.timestamp) return Number(r.timestamp);
  if (r.isoDate)   return new Date(r.isoDate).getTime();
  if (r.date && r.date.includes('.')) {
    const [d, m, y] = r.date.split('.');
    const t = new Date(`${y}-${m}-${d}`).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

// ── RekordsView ───────────────────────────────────────────────────────────────

function fmtRowWeight(row) {
  if (row.bw && row.bwAt != null)
    return `${round1(row.bwAt)} + ${round1(row.extra)} kg`;
  return row.eff > 0 ? `${round1(row.eff)} kg` : '—';
}

function RekordsView({ records, bodyWeight, bwExercises }) {
  const [filterEx,  setFilterEx]  = useState('');
  const [sortKey,   setSortKey]   = useState('weight');
  const [sortDir,   setSortDir]   = useState('desc');
  const [exModal,   setExModal]   = useState(false);

  const exercises = useMemo(() =>
    [...new Set(records.map(r => r.exercise))].sort(),
    [records]
  );

  function toRow(r) {
    const bw     = bwExercises.has(r.exercise);
    const extra  = Number(r.weight) || 0;
    const bwAt   = bw ? bodyWeight : null;
    const eff    = bw ? bodyWeight + extra : extra;
    const reps   = Number(r.reps) || 0;
    const orm    = estimate1RM(eff, reps);
    const volume = eff * reps;
    return {
      ex: r.exercise, eff, extra, bwAt, bw,
      reps, date: r.date || '—',
      ts: resolveTs(r),
      orm, volume,
    };
  }

  const rows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorter = (a, b) => {
      if (sortKey === 'reps') return dir * (a.reps - b.reps);
      if (sortKey === 'date') return dir * (a.ts - b.ts);
      if (sortKey === 'orm')  return dir * ((a.orm || 0) - (b.orm || 0));
      return dir * (a.eff - b.eff); // weight
    };

    if (filterEx) {
      // Per-exercise: group by weight, keep best reps at each weight
      const byWeight = new Map();
      for (const r of records.filter(r => r.exercise === filterEx)) {
        const row = toRow(r);
        const cur = byWeight.get(row.eff);
        if (!cur || row.reps > cur.reps) byWeight.set(row.eff, row);
      }
      return Array.from(byWeight.values()).sort(sorter);
    }

    // All exercises: all sets globally, sorted by active sorter
    return records.map(toRow).sort(sorter);
  }, [records, filterEx, sortKey, sortDir, bodyWeight, bwExercises]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const arr = sortDir === 'desc' ? '↓' : '↑';
  const SORT_BTNS = [
    { key: 'date',   label: 'Data' },
    { key: 'weight', label: 'Ciężar' },
    { key: 'reps',   label: 'Powt.' },
    { key: 'orm',    label: '1RM' },
  ];

  if (!records.length)
    return <View style={styles.empty}><Text style={styles.emptyText}>Brak rekordów</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      {/* Exercise filter modal */}
      <Modal visible={exModal} animationType="slide" transparent onRequestClose={() => setExModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtruj ćwiczenie</Text>
              <TouchableOpacity onPress={() => setExModal(false)} hitSlop={12}>
                <Feather name="x" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['', ...exercises]}
              keyExtractor={i => i || '__all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.exFilterRow, (filterEx === item) && styles.exFilterRowActive]}
                  onPress={() => { setFilterEx(item); setExModal(false); }}
                >
                  <Text style={[styles.exFilterText, filterEx === item && { color: RED }]}>
                    {item || 'Wszystkie ćwiczenia'}
                  </Text>
                  {filterEx === item && <Feather name="check" size={14} color={RED} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Toolbar */}
      <View style={styles.rekordyToolbar}>
        <TouchableOpacity style={styles.exFilterBtn} onPress={() => setExModal(true)} activeOpacity={0.8}>
          <Feather name="filter" size={13} color={filterEx ? RED : C.sub} />
          <Text style={[styles.exFilterBtnText, filterEx && { color: RED }]} numberOfLines={1}>
            {filterEx || 'Wszystkie ćwiczenia'}
          </Text>
          <Feather name="chevron-down" size={13} color={filterEx ? RED : C.muted} />
        </TouchableOpacity>
      </View>

      {/* Sort buttons */}
      <View style={styles.sortRow}>
        {SORT_BTNS.map(b => (
          <TouchableOpacity
            key={b.key}
            style={[styles.sortBtn, sortKey === b.key && styles.sortBtnActive]}
            onPress={() => toggleSort(b.key)}
          >
            <Text style={[styles.sortBtnText, sortKey === b.key && styles.sortBtnTextActive]}>
              {b.label}{sortKey === b.key ? ` ${arr}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <FlatList
        data={rows}
        keyExtractor={(item, i) => `${item.ex}-${item.eff}-${item.reps}-${i}`}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Brak wyników</Text></View>}
        renderItem={({ item, index }) => (
          <View style={[styles.prRowCompact, index < rows.length - 1 && styles.prRowCompactBorder]}>
            {/* Left: name + meta */}
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.prExercise} numberOfLines={1}>{item.ex}</Text>
                {item.bw && <Text style={styles.bwTag}>BW</Text>}
              </View>
              <Text style={styles.prDate}>{item.date}</Text>
            </View>
            {/* Right: weight × reps + sub */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.prWeightReps}>
                <Text style={{ color: RED }}>{fmtRowWeight(item)}</Text>
                <Text style={{ color: C.txt }}> × {item.reps} reps</Text>
              </Text>
              <Text style={styles.prSubLine}>
                {item.orm ? `1RM ≈ ${round1(item.orm)} kg` : ''}
                {item.orm && item.volume > 0 ? '  ·  ' : ''}
                {item.volume > 0 ? `${Math.round(item.volume)} kg vol` : ''}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ── Muscle distribution ───────────────────────────────────────────────────────

const MUSCLE_COLORS = {
  'Klatka':   '#FF4757',
  'Plecy':    '#818cf8',
  'Barki':    '#00F5FF',
  'Nogi':     '#4ade80',
  'Biceps':   '#a78bfa',
  'Triceps':  '#FFD700',
  'Brzuch':   '#f97316',
  'Inne':     '#64748b',
};

const EX_MUSCLE = {
  'Bench press': 'Klatka', 'Incline bench press': 'Klatka', 'Incline dumbbell press': 'Klatka',
  'Dumbbell flye': 'Klatka', 'Cable crossovers': 'Klatka', 'Pec dec': 'Klatka',
  'Deadlift': 'Plecy', 'Barbell row': 'Plecy', 'Cable row': 'Plecy', 'Seated row': 'Plecy',
  'Chest-supported row': 'Plecy', '1-arm dumbbell row': 'Plecy',
  'Wide-grip lat pulldown': 'Plecy', 'Neutral-grip lat pulldown': 'Plecy',
  'Cable lat pull-over': 'Plecy', 'Pull Up': 'Plecy', 'Neutral Grip Pull Up': 'Plecy', 'Chin Up': 'Plecy',
  'Overhead press': 'Barki', 'Dumbbell Overhead press': 'Barki', 'Maschine shoulder press': 'Barki',
  'Standing dumbbell lateral raise': 'Barki', 'Cable lateral raise': 'Barki',
  'Barbell back squat': 'Nogi', 'Leg curl': 'Nogi', 'Leg extension': 'Nogi',
  'Glute press': 'Nogi', 'Seated calf raise': 'Nogi',
  'Barbell curl': 'Biceps', 'Barbbell preacher curl': 'Biceps', 'Incline curl': 'Biceps',
  'Face away bayesian Cable curl': 'Biceps',
  'Triceps pressdown (bar)': 'Triceps', 'Overhead Cable triceps extension': 'Triceps',
  'Skullcrusher': 'Triceps', 'Dips': 'Triceps',
  'Allah (Cable crunch)': 'Brzuch',
};

function getMuscleData(records) {
  const map = new Map();
  for (const r of records) {
    const muscle = EX_MUSCLE[r.exercise] || 'Inne';
    map.set(muscle, (map.get(muscle) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value, color: MUSCLE_COLORS[name] || MUSCLE_COLORS['Inne'] }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ data }) {
  const SIZE = 140, cx = 70, cy = 70, R = 58, IR = 34;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  function pt(angle, r) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(startAngle, endAngle, color, key) {
    const outerS = pt(startAngle, R), outerE = pt(endAngle, R);
    const innerE = pt(endAngle, IR), innerS = pt(startAngle, IR);
    const large  = endAngle - startAngle > 180 ? 1 : 0;
    const d = [
      `M ${outerS.x} ${outerS.y}`,
      `A ${R} ${R} 0 ${large} 1 ${outerE.x} ${outerE.y}`,
      `L ${innerE.x} ${innerE.y}`,
      `A ${IR} ${IR} 0 ${large} 0 ${innerS.x} ${innerS.y}`,
      'Z',
    ].join(' ');
    return <Path key={key} d={d} fill={color} opacity={0.9} />;
  }

  let cur = 0;
  return (
    <Svg width={SIZE} height={SIZE}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * 360;
        const seg = arc(cur, cur + sweep - 0.5, d.color, i);
        cur += sweep;
        return seg;
      })}
    </Svg>
  );
}

function MuscleDistribution({ records }) {
  const data  = useMemo(() => getMuscleData(records), [records]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length) return null;

  return (
    <View style={styles.muscleCard}>
      <Text style={styles.muscleTitle}>Dystrybucja partii mięśniowych</Text>
      <View style={styles.muscleBody}>
        <DonutChart data={data} />
        <View style={styles.muscleLegend}>
          {data.map(d => (
            <View key={d.name} style={styles.muscleLegendItem}>
              <View style={[styles.muscleDot, { backgroundColor: d.color }]} />
              <Text style={styles.muscleName}>{d.name}</Text>
              <Text style={[styles.musclePct, { color: d.color }]}>
                {Math.round(d.value / total * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── ReportCalendar ────────────────────────────────────────────────────────────

function ReportCalendar({ dayMap, year, month, daysInMon, stats }) {
  const calWeeks = useMemo(() => {
    const startDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const prevDays = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--)
      cells.push({ day: prevDays - i, cur: false, ts: null });
    for (let d = 1; d <= daysInMon; d++)
      cells.push({ day: d, cur: true, ts: new Date(year, month, d).getTime() });
    const rem = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= rem; d++) cells.push({ day: d, cur: false, ts: null });
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month, daysInMon]);

  const isToday    = ts => ts && startOfDay(ts) === startOfDay(Date.now());
  const hasWorkout = ts => ts && dayMap.has(startOfDay(ts));

  return (
    <View style={styles.reportCalCard}>
      <View style={styles.calDaysRow}>
        {DAYS_SHORT.map(d => (
          <View key={d} style={styles.calDayHeader}>
            <Text style={styles.calDayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>
      {calWeeks.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((cell, ci) => {
            const workout = hasWorkout(cell.ts);
            const tod     = isToday(cell.ts);
            return (
              <View key={ci} style={[styles.calCell, workout && styles.calCellWorkout, tod && !workout && styles.calCellToday]}>
                <Text style={[styles.calCellText, !cell.cur && styles.calCellGhost, workout && styles.calCellWorkoutText, tod && styles.calCellTodayText]}>
                  {cell.day}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={styles.calSummary}>
        {[
          ['Treningów', stats.workouts, RED],
          ['Przerw', daysInMon - stats.workouts, C.muted],
          ['Aktywność', `${Math.round(stats.workouts / daysInMon * 100)}%`, C.sub],
        ].map(([l, v, c]) => (
          <View key={l} style={{ alignItems: 'center' }}>
            <Text style={[styles.calSumVal, { color: c }]}>{v}</Text>
            <Text style={styles.calSumLbl}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── MonthlyReportView ─────────────────────────────────────────────────────────

function MonthlyReportView({ records }) {
  const today = new Date();
  const [year,          setYear]         = useState(today.getFullYear());
  const [month,         setMonth]        = useState(today.getMonth());
  const [metric,        setMetric]       = useState('volume');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear,    setPickerYear]   = useState(today.getFullYear());
  const [mode,          setMode]         = useState('month'); // 'month' | 'year'

  const dayMap = useMemo(() => groupByDay(records), [records]);

  const mStart     = useMemo(() => new Date(year, month, 1).getTime(),                      [year, month]);
  const mEnd       = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59).getTime(),      [year, month]);
  const daysInMon  = useMemo(() => new Date(year, month + 1, 0).getDate(),                  [year, month]);

  // ── Stats for selected month
  const stats = useMemo(() => {
    let workouts = 0, duration = 0, volume = 0, sets = 0;
    for (const [day, recs] of dayMap) {
      if (day < mStart || day > mEnd) continue;
      workouts++;
      duration += getDayDurationMs(recs);
      volume   += getDayVolume(recs);
      sets     += recs.length;
    }
    return { workouts, duration, volume, sets };
  }, [dayMap, mStart, mEnd]);

  // ── Weekly chart data — kalendarzowe tygodnie Pn–Pt w danym miesiącu
  const chartData = useMemo(() => {
    const weeks = [];
    // Znajdź poniedziałek tygodnia zawierającego 1. dzień miesiąca
    const firstDay = new Date(year, month, 1);
    const daysFromMonday = (firstDay.getDay() + 6) % 7; // 0=Pn
    const weekStart = new Date(year, month, 1 - daysFromMonday);

    for (let w = new Date(weekStart); w.getMonth() <= month && w.getFullYear() <= year; w.setDate(w.getDate() + 7)) {
      // Pn–Pt tego tygodnia (pomijamy Sb i Nd)
      let val = 0;
      let pn = null, pt = null;
      for (let offset = 0; offset < 7; offset++) {        // Pn=0 … Nd=6
        const d = new Date(w);
        d.setDate(w.getDate() + offset);
        if (d.getMonth() !== month) continue;             // poza miesiącem — pomiń
        if (!pn) pn = d.getDate();
        pt = d.getDate();
        const ts   = startOfDay(d.getTime());
        const recs = dayMap.get(ts) || [];
        if      (metric === 'volume')   val += getDayVolume(recs);
        else if (metric === 'duration') val += getDayDurationMs(recs);
        else if (metric === 'workouts') val += recs.length > 0 ? 1 : 0;
        else                            val += recs.length;
      }
      if (pn !== null) weeks.push({ label: `${pn}–${pt}`, value: val });
    }
    return weeks;
  }, [dayMap, year, month, metric]);


  // ── Navigation
  const isCurrent = year === today.getFullYear() && month === today.getMonth();
  function prevMonth() { if (mode === 'year') { setYear(y => y-1); return; } if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); }
  function nextMonth() { if (mode === 'year') { if (year < today.getFullYear()) setYear(y => y+1); return; } if (isCurrent) return; if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); }

  // ── Yearly stats
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59).getTime();
  const yearStats = useMemo(() => {
    let workouts = 0, duration = 0, volume = 0, sets = 0;
    for (const [day, recs] of dayMap) {
      if (day < yearStart || day > yearEnd) continue;
      workouts++; duration += getDayDurationMs(recs); volume += getDayVolume(recs); sets += recs.length;
    }
    return { workouts, duration, volume, sets };
  }, [dayMap, year]);

  const yearChartData = useMemo(() => MONTHS_PL.map((lbl, i) => {
    const mS = new Date(year, i, 1).getTime();
    const mE = new Date(year, i + 1, 0, 23, 59, 59).getTime();
    let value = 0;
    for (const [day, recs] of dayMap) {
      if (day < mS || day > mE) continue;
      if      (metric === 'volume')   value += getDayVolume(recs);
      else if (metric === 'duration') value += getDayDurationMs(recs);
      else if (metric === 'workouts') value += 1;
      else                            value += recs.length;
    }
    return { label: lbl.slice(0, 3).toUpperCase(), value };
  }), [dayMap, year, metric]);

  // ── Chart bar renderer
  const activeChartData = mode === 'year' ? yearChartData : chartData;
  const maxVal = Math.max(...activeChartData.map(d => d.value), 1);
  const BAR_H  = 80;
  function fmtBarVal(v) {
    if (metric === 'volume')   return `${Math.round(v).toLocaleString('pl-PL')}`;
    if (metric === 'duration') return fmtDurationShort(v);
    return `${v}`;
  }

  // ── Active records for the selected period
  const periodStart = mode === 'year' ? yearStart : mStart;
  const periodEnd   = mode === 'year' ? yearEnd   : mEnd;
  const activeRecords = useMemo(() =>
    records.filter(r => {
      const ts = r.timestamp || 0;
      return ts >= periodStart && ts <= periodEnd;
    }),
    [records, periodStart, periodEnd]
  );

  // ── Stat card definitions
  const activeStats = mode === 'year' ? yearStats : stats;
  const STAT_CARDS = [
    { id: 'workouts', label: 'TRENINGI', value: `${activeStats.workouts}` },
    { id: 'duration', label: 'CZAS',     value: activeStats.duration > 0 ? fmtDuration(activeStats.duration) : '—' },
    { id: 'volume',   label: 'WOLUMEN',  value: `${Math.round(activeStats.volume).toLocaleString('pl-PL')} kg` },
    { id: 'sets',     label: 'SERIE',    value: `${activeStats.sets}` },
  ];

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={16}>
          <Feather name="chevron-left" size={22} color={C.txt} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setPickerYear(year); setPickerVisible(true); }}
          activeOpacity={0.7} style={styles.monthNavPill}
        >
          <Text style={styles.monthNavTitle}>
            {mode === 'year' ? `ROK ${year}` : `${MONTHS_PL[month].toUpperCase()} ${year}`}
          </Text>
          <Feather name="chevron-down" size={13} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} hitSlop={16} style={{ opacity: (mode === 'year' ? year >= today.getFullYear() : isCurrent) ? 0.2 : 1 }}>
          <Feather name="chevron-right" size={22} color={C.txt} />
        </TouchableOpacity>
      </View>

      {/* Month/Year picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz miesiąc</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={12}>
                <Feather name="x" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* Year selector */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} hitSlop={12}>
                <Feather name="chevron-left" size={20} color={C.txt} />
              </TouchableOpacity>
              <Text style={styles.pickerYearLabel}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y + 1)}
                hitSlop={12}
                style={{ opacity: pickerYear >= today.getFullYear() ? 0.2 : 1 }}
                disabled={pickerYear >= today.getFullYear()}
              >
                <Feather name="chevron-right" size={20} color={C.txt} />
              </TouchableOpacity>
            </View>

            {/* Yearly report option */}
            <TouchableOpacity
              style={[styles.pickerYearlyBtn, mode === 'year' && pickerYear === year && styles.pickerMonthCellActive]}
              onPress={() => { setYear(pickerYear); setMode('year'); setPickerVisible(false); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.pickerYearlyText, mode === 'year' && pickerYear === year && styles.pickerMonthTextActive]}>
                Raport roczny {pickerYear}
              </Text>
            </TouchableOpacity>

            {/* Month grid */}
            <View style={styles.pickerMonthGrid}>
              {MONTHS_PL.map((m, i) => {
                const isFuture = pickerYear === today.getFullYear() && i > today.getMonth();
                const isActive = pickerYear === year && i === month;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.pickerMonthCell, isActive && styles.pickerMonthCellActive, isFuture && { opacity: 0.25 }]}
                    disabled={isFuture}
                    onPress={() => { setYear(pickerYear); setMonth(i); setMode('month'); setPickerVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerMonthText, isActive && styles.pickerMonthTextActive]}>
                      {m.slice(0, 3).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 4 stat cards — tap to switch chart */}
      <View style={styles.statGrid2}>
        {STAT_CARDS.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.statCard2, metric === s.id && styles.statCard2Active]}
            onPress={() => setMetric(s.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.statCard2Val, metric === s.id && { color: RED }]}>{s.value}</Text>
            <Text style={[styles.statCard2Lbl, metric === s.id && { color: RED }]}>{s.label}</Text>
            {metric === s.id && <View style={styles.statCard2Dot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bar chart — weekly */}
      <View style={styles.chartCard}>
        <Text style={styles.chartCardTitle}>
          {STAT_CARDS.find(s => s.id === metric)?.label} · {mode === 'year' ? 'miesięcznie' : 'tygodniowo'}
        </Text>
        <View style={styles.chartBarsRow}>
          {activeChartData.map((d, i) => {
            const h   = Math.max(d.value > 0 ? Math.round((d.value / maxVal) * BAR_H) : 0, d.value > 0 ? 3 : 0);
            const isM = d.value === Math.max(...chartData.map(x => x.value)) && d.value > 0;
            return (
              <View key={i} style={styles.chartBarCol}>
                {isM && <Text style={[styles.chartTopLabel, { color: RED }]}>{fmtBarVal(d.value)}</Text>}
                <View style={[styles.chartBar, {
                  height: Math.max(h, 2),
                  backgroundColor: isM ? RED : d.value === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.12)',
                  ...(isM && { shadowColor: RED, shadowOpacity: 0.5, shadowRadius: 6 }),
                }]} />
                <Text style={styles.chartBarLabel}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Calendar — only in month mode */}
      {mode === 'month' && (
        <ReportCalendar dayMap={dayMap} year={year} month={month} daysInMon={daysInMon} stats={stats} />
      )}

      {/* Muscle distribution */}
      <MuscleDistribution records={activeRecords} />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── KalendarzView ─────────────────────────────────────────────────────────────

function KalendarzView({ records, navigation, bodyWeight, bwExercises }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const dayMap = useMemo(() => groupByDay(records), [records]);
  const workoutDays = useMemo(() => new Set(Array.from(dayMap.keys())), [dayMap]);

  const weeks = useMemo(() => {
    const firstDay  = new Date(year, month, 1);
    const startDow  = (firstDay.getDay() + 6) % 7;
    const daysInMon = new Date(year, month + 1, 0).getDate();
    const prevDays  = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--)
      cells.push({ day: prevDays - i, currentMonth: false, ts: null });
    for (let d = 1; d <= daysInMon; d++)
      cells.push({ day: d, currentMonth: true, ts: new Date(year, month, d).getTime() });
    const rem = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= rem; d++)
      cells.push({ day: d, currentMonth: false, ts: null });
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  const mStart = new Date(year, month, 1).getTime();
  const mEnd   = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  let mW = 0, mV = 0;
  for (const [d, recs] of dayMap) { if (d >= mStart && d <= mEnd) { mW++; mV += getDayVolume(recs); } }

  function handleDayPress(ts) {
    if (!ts) return;
    const dayTs = startOfDay(ts);
    const recs = dayMap.get(dayTs);
    if (!recs) return;
    navigation.navigate('WorkoutDetail', {
      date: recs[0]?.date || new Date(dayTs).toLocaleDateString('pl-PL'),
      records: recs, bodyWeight, bwExercises: Array.from(bwExercises), allRecords: records,
    });
  }

  const isToday    = ts => ts && startOfDay(ts) === startOfDay(Date.now());
  const hasWorkout = ts => ts && workoutDays.has(startOfDay(ts));

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
      <View style={styles.calNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={16}>
          <Feather name="chevron-left" size={22} color={C.txt} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.calTitle}>{MONTHS_PL[month].toUpperCase()} {year}</Text>
          <Text style={styles.calSub}>{mW} treningów · {Math.round(mV)} kg</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} hitSlop={16}>
          <Feather name="chevron-right" size={22} color={C.txt} />
        </TouchableOpacity>
      </View>

      <View style={styles.calDaysRow}>
        {DAYS_SHORT.map(d => (
          <View key={d} style={styles.calDayHeader}>
            <Text style={styles.calDayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calWeekRow}>
          {week.map((cell, ci) => {
            const workout = hasWorkout(cell.ts);
            const today   = isToday(cell.ts);
            return (
              <TouchableOpacity
                key={ci}
                style={[styles.calCell, workout && styles.calCellWorkout, today && !workout && styles.calCellToday]}
                onPress={() => handleDayPress(cell.ts)}
                disabled={!workout}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.calCellText,
                  !cell.currentMonth && styles.calCellGhost,
                  workout && styles.calCellWorkoutText,
                  today && styles.calCellTodayText,
                ]}>
                  {cell.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Monthly summary */}
      <View style={styles.calSummary}>
        {[['Treningów', mW, RED], ['Przerw', new Date(year, month + 1, 0).getDate() - mW, C.muted], ['Aktywność', `${Math.round(mW / new Date(year, month + 1, 0).getDate() * 100)}%`, C.sub]].map(([l, v, c]) => (
          <View key={l} style={{ alignItems: 'center' }}>
            <Text style={[styles.calSumVal, { color: c }]}>{v}</Text>
            <Text style={styles.calSumLbl}>{l}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── ProfileScreen ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'stats',    label: 'STATS' },
  { key: 'historia', label: 'HISTORIA' },
  { key: 'rekordy',  label: 'REKORDY' },
  { key: 'dash',     label: 'RAPORT' },
  { key: 'kalend',   label: 'KALENDARZ' },
];

export default function ProfileScreen({ navigation }) {
  const [records,     setRecords]     = useState([]);
  const [bodyWeight,  setBodyWeight]  = useState(80);
  const [bwExercises, setBwExercises] = useState(new Set());
  const [profile,     setProfile]     = useState({ name: '', gym: '', location: '', avatar: '🧔' });
  const [tab,         setTab]         = useState('stats');
  const [editVisible, setEditVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [rec, bw, bwEx, prof] = await Promise.all([
          loadRecords(), loadBodyWeight(), loadBWExercises(), loadProfile(),
        ]);
        rec.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRecords(rec);
        setBodyWeight(bw);
        setBwExercises(bwEx);
        setProfile(prof);
      }
      load();
    }, [])
  );

  async function handleSaveProfile(draft) {
    await saveProfile(draft);
    setProfile(draft);
    if (draft.weight) setBodyWeight(parseFloat(draft.weight));
    setEditVisible(false);
  }

  const dayMap    = useMemo(() => groupByDay(records), [records]);
  const ironPath  = useMemo(() => calcIronPath(records, dayMap, bodyWeight), [records, dayMap, bodyWeight]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Górna belka — nienaruszona */}
      <ScreenHeader navigation={navigation} icon="user" label="PROFIL" color={COLORS.profil} />

      {/* Profil hero */}
      <ProfileHero profile={profile} records={records} onEditPress={() => setEditVisible(true)} />

      {/* Modal edycji */}
      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onSave={handleSaveProfile}
        onClose={() => setEditVisible(false)}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBarItem, tab === t.key && styles.tabBarItemActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabBarText, tab === t.key && styles.tabBarTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {tab === 'stats'    && <StatsView    records={records} ironPath={ironPath} />}
      {tab === 'historia' && <HistoriaView records={records} bodyWeight={bodyWeight} bwExercises={bwExercises} />}
      {tab === 'rekordy'  && <RekordsView  records={records} bodyWeight={bodyWeight} bwExercises={bwExercises} />}
      {tab === 'dash'     && <MonthlyReportView records={records} />}
      {tab === 'kalend'   && <KalendarzView records={records} navigation={navigation} bodyWeight={bodyWeight} bwExercises={bwExercises} />}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatarImg: {
    width: 62, height: 62, borderRadius: 18,
    borderWidth: 2, borderColor: `${RED}44`,
  },
  avatarBox: {
    width: 62, height: 62, borderRadius: 18,
    backgroundColor: '#181a2e', borderWidth: 2, borderColor: `${RED}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute', bottom: -7, right: -7,
    backgroundColor: RED, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 2, borderColor: C.bg,
  },
  levelBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  heroInfo:  { flex: 1 },
  heroName:  { color: C.txt, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  heroClass: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  heroGym:   { color: C.muted, fontSize: 10, marginBottom: 2 },
  heroMeta:  { color: C.muted, fontSize: 10 },
  heroGear:     { paddingLeft: 10 },
  heroGearBox: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroGearText: { fontSize: 14, color: C.sub },

  // Iron Path
  ironCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 14, gap: 10,
  },
  ironBars:     { flex: 1 },
  ironTitle:    { color: C.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  ironItem:     { marginBottom: 7 },
  ironLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  ironLabel:    { color: C.sub, fontSize: 8, fontWeight: '700' },
  ironVal:      { color: C.sub, fontSize: 8, fontWeight: '700' },
  ironTrack:    { height: 2, backgroundColor: C.border, borderRadius: 2 },
  ironFill:     { height: '100%', borderRadius: 2 },

  // Tabs
  tabBar: { borderBottomWidth: 1, borderBottomColor: C.border },
  tabBarInner: { paddingHorizontal: 12 },
  tabBarItem: {
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1,
  },
  tabBarItemActive:   { borderBottomColor: RED },
  tabBarText:         { color: C.muted, fontSize: 9.5, fontWeight: '700', letterSpacing: 1 },
  tabBarTextActive:   { color: RED },

  // Common
  padded:  { padding: 16 },
  listPad: { padding: 16, paddingBottom: 32 },
  empty:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.muted, fontSize: 16 },
  listSectionTitle: {
    color: C.muted, fontSize: 8.5, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },

  // StatsView
  tfRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tfBtn: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
  },
  tfBtnActive:   { borderColor: RED, backgroundColor: `${RED}18` },
  tfBtnText:     { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  tfBtnTextActive: { color: RED },

  metricRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 12 },
  metricBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  metricBtnActive:   { backgroundColor: '#1e2030' },
  metricBtnText:     { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  metricBtnTextActive: { color: C.txt },

  chartCard: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 12,
  },
  chartCardTitle: { color: C.sub, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chartBarsRow:   { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  chartBarCol:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartTopLabel:  { fontSize: 7, fontWeight: '700', textAlign: 'center' },
  chartBar:       { width: '85%', borderRadius: 3 },
  chartBarLabel:  { color: C.muted, fontSize: 8, textAlign: 'center' },

  statGrid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard2: {
    flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  statCard2Val: { color: C.txt, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statCard2Lbl: { color: C.muted, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.5 },

  // HistoriaView
  wCard: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 8, overflow: 'hidden',
  },
  wCardOpen:    { borderColor: '#2a2d45' },
  wCardHeader:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  wCardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  prBadge: {
    backgroundColor: `${RED}20`, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  prBadgeText:  { color: RED, fontSize: 7.5, fontWeight: '700', letterSpacing: 0.5 },
  wCardDate:    { color: C.txt, fontSize: 13, fontWeight: '700' },
  wCardMeta:    { color: C.muted, fontSize: 10 },
  wCardVol:     { fontSize: 12, fontWeight: '700' },
  wCardVolSub:  { color: C.muted, fontSize: 10 },
  wCardChev:    { color: C.muted, fontSize: 14, marginLeft: 4 },
  wCardChevOpen: { transform: [{ rotate: '180deg' }] },
  wCardBody:    { paddingHorizontal: 14, paddingBottom: 10 },
  wCardDivider: { height: 1, backgroundColor: C.border, marginBottom: 8 },

  exTableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  exTableHead:   { flex: 1, color: C.muted, fontSize: 7.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  exRow:         { flexDirection: 'row', paddingVertical: 6 },
  exRowBorder:   { borderBottomWidth: 1, borderBottomColor: '#13151e' },
  exName:        { flex: 1, color: C.sub, fontSize: 11 },
  exSets:        { color: C.muted, fontSize: 11, textAlign: 'right', marginRight: 14 },
  exWeight:      { color: C.sub, fontSize: 11, textAlign: 'right', minWidth: 60 },
  wCardActions:  { flexDirection: 'row', gap: 8, marginTop: 10 },
  wCardActionBtn: {
    flex: 1, padding: 8, backgroundColor: C.border, borderRadius: 8, alignItems: 'center',
  },
  wCardActionText: { color: C.sub, fontSize: 9.5, fontWeight: '700', letterSpacing: 1 },

  // HistoriaDetail
  detailBack: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  detailBackText: { color: RED, fontSize: 13, fontWeight: '700' },
  detailDate: { color: C.txt, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  detailStats: {
    flexDirection: 'row', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 14,
  },
  detailStatItem:   { flex: 1, alignItems: 'center', paddingVertical: 12 },
  detailStatBorder: { borderRightWidth: 1, borderRightColor: C.border },
  detailStatVal:    { color: C.txt, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  detailStatLbl:    { color: C.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailCard: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailExName: { color: C.txt, fontSize: 13, fontWeight: '700', flex: 1 },
  detailPRBadge: { backgroundColor: `${RED}20`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  detailPRText:  { color: RED, fontSize: 9, fontWeight: '800' },
  detailOrm:     { color: C.muted, fontSize: 10, alignSelf: 'center' },
  detailSetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  detailSetNum:    { color: C.muted, fontSize: 10, width: 14, textAlign: 'center' },
  detailSetWeight: { color: RED, fontSize: 12, fontWeight: '700', flex: 1 },
  detailSetX:      { color: C.muted, fontSize: 11 },
  detailSetReps:   { color: C.txt, fontSize: 12, fontWeight: '600' },
  detailSetVol:    { color: C.muted, fontSize: 10, minWidth: 50, textAlign: 'right' },
  detailSetRowPR:  { backgroundColor: 'rgba(255,215,0,0.06)' },
  detailPRMedal: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFD700', borderWidth: 2, borderColor: '#B8860B',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  detailPRMedalText: {
    color: '#000', fontSize: 7, fontWeight: '900',
    fontStyle: 'italic', letterSpacing: 0.8, fontFamily: 'Georgia',
  },

  // RekordsView
  rekordyToolbar: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  exFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', maxWidth: '100%',
  },
  exFilterBtnText: { color: C.sub, fontSize: 12, fontWeight: '600', flex: 1 },

  sortRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sortBtn: {
    flex: 1, paddingVertical: 6, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  sortBtnActive:     { borderColor: RED },
  sortBtnText:       { color: C.muted, fontSize: 10, fontWeight: '700' },
  sortBtnTextActive: { color: RED },

  exFilterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  exFilterRowActive: {},
  exFilterText: { color: C.sub, fontSize: 14 },

  prRowCompact: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  prRowCompactBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  prWeightReps: { color: C.txt, fontSize: 14, fontWeight: '800' },
  prSubLine:    { color: C.muted, fontSize: 10, marginTop: 2 },
  bwTag: {
    color: C.muted, fontSize: 10, fontWeight: '700',
    backgroundColor: C.border, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1, marginLeft: 4,
  },

  prRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, marginBottom: 7,
  },
  prRowNew:    { borderColor: `${RED}44` },
  prTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  newBadge: {
    backgroundColor: `${RED}20`, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { color: RED, fontSize: 7.5, fontWeight: '700', letterSpacing: 0.5 },
  prExercise:  { color: C.txt, fontSize: 13, fontWeight: '700', flex: 1 },
  prDate:      { color: C.muted, fontSize: 9.5 },
  prOrm:       { color: C.sub, fontSize: 20, fontWeight: '800', lineHeight: 24 },
  prTrend:     { color: '#3a8a4a', fontSize: 9.5 },

  // MonthlyReportView
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  monthNavTitleWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthNavTitle:       { color: C.txt, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  monthNavPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  monthNavPillActive: { backgroundColor: `${RED}18` },

  pickerYearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pickerYearLabel: { color: C.txt, fontSize: 18, fontWeight: '800', minWidth: 60, textAlign: 'center' },
  pickerYearlyBtn: {
    marginHorizontal: 12, marginTop: 12, paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  pickerYearlyText: { color: C.sub, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  pickerMonthCell: {
    width: '22%', paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
  },
  pickerMonthCellActive:  { backgroundColor: RED, borderColor: RED },
  pickerMonthText:        { color: C.sub, fontSize: 12, fontWeight: '700' },
  pickerMonthTextActive:  { color: '#fff' },
  statCard2Active: { borderColor: `${RED}55`, backgroundColor: `${RED}0a` },
  statCard2Dot: {
    position: 'absolute', bottom: 8, right: 8,
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: RED,
  },
  muscleCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 14, marginTop: 12,
  },
  muscleTitle: { color: C.muted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  muscleBody:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muscleLegend:{ flex: 1, gap: 7 },
  muscleLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  muscleDot:   { width: 8, height: 8, borderRadius: 4 },
  muscleName:  { flex: 1, color: C.sub, fontSize: 11 },
  musclePct:   { fontSize: 11, fontWeight: '800' },

  reportCalCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 14, marginTop: 12,
  },

  // DashboardView (legacy styles kept for safety)
  dashHero: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: '#18080c', borderWidth: 1, borderColor: `${RED}33`,
    borderRadius: 16, padding: 20, marginBottom: 10,
  },
  dashBigNum: { fontSize: 48, fontWeight: '800', color: RED, lineHeight: 52 },
  dashBigLbl: { fontSize: 8.5, color: C.sub, textTransform: 'uppercase', marginTop: 4 },
  dashGrid:   { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dashGridVal:{ fontSize: 13, fontWeight: '700', color: C.sub },
  dashGridLbl:{ fontSize: 9, color: C.muted },

  dashCard: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 10,
  },
  dashCardTitle: { color: C.muted, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  dashRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dashRowBorder:{ borderBottomWidth: 1, borderBottomColor: C.border },
  dashRowLabel: { color: C.sub, fontSize: 12 },
  dashRowVal:   { fontSize: 12, fontWeight: '700' },
  dashRowVol:   { color: C.muted, fontSize: 11 },
  dashRankRow:  { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dashRank: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: '#1e2030',
    alignItems: 'center', justifyContent: 'center',
  },
  dashRankNum: { color: C.muted, fontSize: 9, fontWeight: '700' },

  // KalendarzView
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calTitle: { color: C.txt, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  calSub:   { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 2 },
  calDaysRow:      { flexDirection: 'row', marginBottom: 4 },
  calDayHeader:    { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calDayHeaderText:{ color: C.muted, fontSize: 9, fontWeight: '700' },
  calWeekRow:  { flexDirection: 'row', marginBottom: 3 },
  calCell: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 5, margin: 1, borderWidth: 1, borderColor: '#13151e',
  },
  calCellWorkout: { backgroundColor: `${RED}1a`, borderColor: `${RED}33` },
  calCellToday:   { borderColor: 'rgba(255,255,255,0.4)' },
  calCellText:        { color: '#2a3040', fontSize: 10, fontWeight: '500' },
  calCellGhost:       { opacity: 0.3 },
  calCellWorkoutText: { color: RED, fontWeight: '700' },
  calCellTodayText:   { color: C.txt, fontWeight: '900' },
  calSummary:  { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  calSumVal:   { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  calSumLbl:   { color: C.muted, fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginTop: 2 },

  // EditProfileModal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: '#111114', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.border,
  },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:    { color: C.txt, fontSize: 16, fontWeight: '800' },
  modalLabel:    { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  modalRow:      { flexDirection: 'row', marginTop: 0 },
  modalInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, color: C.txt, fontSize: 14,
  },
  photoPickerBtn: {
    alignSelf: 'center', position: 'relative',
  },
  photoPickerImg: {
    width: 88, height: 88, borderRadius: 22,
    borderWidth: 2, borderColor: `${RED}55`,
  },
  photoPickerPlaceholder: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoPickerText: { color: C.muted, fontSize: 9, fontWeight: '700' },
  photoPickerBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#111114',
  },
  modalSaveBtn: {
    marginTop: 22, backgroundColor: RED, borderRadius: 12, padding: 14, alignItems: 'center',
  },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
