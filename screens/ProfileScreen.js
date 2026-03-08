import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Modal, TextInput, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import {
  loadRecords, loadBodyWeight, loadBWExercises, loadProfile, saveProfile,
} from '../src/storage';
import ScreenHeader from '../components/ScreenHeader';
import { estimate1RM, round1, effectiveWeight } from '../src/utils';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

// ── Colors ────────────────────────────────────────────────────────────────────

const RED = '#FF4757';
const C = {
  bg:     '#080a12',
  card:   '#0d0f1a',
  border: '#1a1c2a',
  border2:'rgba(255,255,255,0.06)',
  txt:    '#ddeeff',
  sub:    '#778899',
  muted:  '#445566',
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
  const [metric,    setMetric]    = useState('volume');
  const dayMap = useMemo(() => groupByDay(records), [records]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (timeframe === 'week') {
      return DAYS_SHORT.map((label, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
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
    if (metric === 'volume')   return d.volume >= 1000 ? `${(d.volume / 1000).toFixed(0)}k` : `${Math.round(d.volume)}`;
    if (metric === 'trainings')return `${d.trainings}`;
    return fmtDurationShort(d.duration);
  };
  const METRICS = [
    { id: 'volume', label: 'WOLUMEN' },
    { id: 'trainings', label: 'TRENINGI' },
    { id: 'duration', label: 'CZAS' },
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
          [`${mWorkouts}`,                                                                          'Treningi (mies.)'],
          [avgDur > 0 ? fmtDuration(avgDur) : '—',                                                'Śr. czas sesji'],
          [mVolume >= 1000 ? `${Math.round(mVolume / 1000)}k kg` : `${Math.round(mVolume)} kg`,   'Wolumen (mies.)'],
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

function WorkoutCard({ day, dayRecs, allRecords, navigation, bodyWeight, bwExercises }) {
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
          {/* Table header */}
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
          {/* Actions */}
          <View style={styles.wCardActions}>
            <TouchableOpacity
              style={styles.wCardActionBtn}
              onPress={() => navigation.navigate('WorkoutDetail', {
                date, records: dayRecs, bodyWeight,
                bwExercises: Array.from(bwExercises), allRecords,
              })}
            >
              <Text style={styles.wCardActionText}>SZCZEGÓŁY</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function HistoriaView({ records, navigation, bodyWeight, bwExercises }) {
  const dayMap = useMemo(() => groupByDay(records), [records]);
  const days   = useMemo(() => Array.from(dayMap.keys()).sort((a, b) => b - a), [dayMap]);

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
          navigation={navigation}
          bodyWeight={bodyWeight}
          bwExercises={bwExercises}
        />
      )}
    />
  );
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
      ts: Number(r.timestamp) || 0,
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

    // All exercises: all sets globally, sorted by weight desc then reps desc
    const allRows = records.map(toRow);
    return allRows.sort((a, b) => {
      const wDiff = b.eff - a.eff;
      if (wDiff !== 0) return wDiff;
      return b.reps - a.reps;
    });
  }, [records, filterEx, sortKey, sortDir, bodyWeight, bwExercises]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const arr = sortDir === 'desc' ? '↓' : '↑';
  const SORT_BTNS = [
    { key: 'weight', label: 'Ciężar' },
    { key: 'reps',   label: 'Powt.' },
    { key: 'orm',    label: '1RM' },
    { key: 'date',   label: 'Data' },
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
              <Text style={[styles.prWeightReps, index === 0 && { color: RED }]}>
                {fmtRowWeight(item)} × {item.reps} sets
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

// ── MonthlyReportView ─────────────────────────────────────────────────────────

function MonthlyReportView({ records }) {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [metric, setMetric] = useState('volume');

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

  // ── Weekly chart data (chunks of 7 days: 1-7, 8-14, 15-21, 22-28, 29-end)
  const chartData = useMemo(() => {
    const weeks = [];
    for (let start = 1; start <= daysInMon; start += 7) {
      const end = Math.min(start + 6, daysInMon);
      let val = 0;
      for (let d = start; d <= end; d++) {
        const ts   = startOfDay(new Date(year, month, d).getTime());
        const recs = dayMap.get(ts) || [];
        if      (metric === 'volume')   val += getDayVolume(recs);
        else if (metric === 'duration') val += getDayDurationMs(recs);
        else if (metric === 'workouts') val += recs.length > 0 ? 1 : 0;
        else if (metric === 'sets')     val += recs.length;
      }
      weeks.push({ label: `${start}–${end}`, value: val });
    }
    return weeks;
  }, [dayMap, year, month, daysInMon, metric]);

  // ── Calendar grid
  const calWeeks = useMemo(() => {
    const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const prevDays = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--)
      cells.push({ day: prevDays - i, cur: false, ts: null });
    for (let d = 1; d <= daysInMon; d++)
      cells.push({ day: d, cur: true, ts: new Date(year, month, d).getTime() });
    const rem = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= rem; d++)
      cells.push({ day: d, cur: false, ts: null });
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month, daysInMon]);

  // ── Navigation
  const isCurrent = year === today.getFullYear() && month === today.getMonth();
  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); }
  function nextMonth() { if (isCurrent) return; if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); }

  // ── Chart bar renderer
  const maxVal = Math.max(...chartData.map(d => d.value), 1);
  const BAR_H  = 80;
  function fmtBarVal(v) {
    if (metric === 'volume')   return v >= 1000 ? `${Math.round(v/1000)}k` : `${Math.round(v)}`;
    if (metric === 'duration') return fmtDurationShort(v);
    return `${v}`;
  }

  // ── Stat card definitions
  const STAT_CARDS = [
    { id: 'workouts', label: 'TRENINGI', value: `${stats.workouts}` },
    { id: 'duration', label: 'CZAS',     value: stats.duration > 0 ? fmtDuration(stats.duration) : '—' },
    { id: 'volume',   label: 'WOLUMEN',  value: stats.volume >= 1000 ? `${Math.round(stats.volume/1000)}k kg` : `${Math.round(stats.volume)} kg` },
    { id: 'sets',     label: 'SERIE',    value: `${stats.sets}` },
  ];

  const isToday    = ts => ts && startOfDay(ts) === startOfDay(Date.now());
  const hasWorkout = ts => ts && dayMap.has(startOfDay(ts));

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={16}>
          <Feather name="chevron-left" size={22} color={C.txt} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTHS_PL[month].toUpperCase()} {year}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={16} style={{ opacity: isCurrent ? 0.2 : 1 }}>
          <Feather name="chevron-right" size={22} color={C.txt} />
        </TouchableOpacity>
      </View>

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
          {STAT_CARDS.find(s => s.id === metric)?.label} · tygodniowo
        </Text>
        <View style={styles.chartBarsRow}>
          {chartData.map((d, i) => {
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

      {/* Calendar */}
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
                <View key={ci} style={[
                  styles.calCell,
                  workout && styles.calCellWorkout,
                  tod && !workout && styles.calCellToday,
                ]}>
                  <Text style={[
                    styles.calCellText,
                    !cell.cur      && styles.calCellGhost,
                    workout        && styles.calCellWorkoutText,
                    tod            && styles.calCellTodayText,
                  ]}>
                    {cell.day}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* Summary row */}
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
    setEditVisible(false);
  }

  const dayMap    = useMemo(() => groupByDay(records), [records]);
  const ironPath  = useMemo(() => calcIronPath(records, dayMap, bodyWeight), [records, dayMap, bodyWeight]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Górna belka — nienaruszona */}
      <ScreenHeader navigation={navigation} icon="user" label="PROFIL" color={C.accent} />

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
      {tab === 'historia' && <HistoriaView records={records} navigation={navigation} bodyWeight={bodyWeight} bwExercises={bwExercises} />}
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
  monthNavTitle: {
    color: C.txt, fontSize: 13, fontWeight: '800', letterSpacing: 1.5,
  },
  statCard2Active: { borderColor: `${RED}55`, backgroundColor: `${RED}0a` },
  statCard2Dot: {
    position: 'absolute', bottom: 8, right: 8,
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: RED,
  },
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
