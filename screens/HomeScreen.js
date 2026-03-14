import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRecords, loadTileSettings, DEFAULT_TILES } from '../src/storage';
import { initHomeHeartbeat, replayHomeHeartbeat, unloadHomeHeartbeat } from '../src/heartbeat';

function startOfDay(ts) {
  if (!ts) return 0;
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// ─── constants ───────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

const CONTAINER  = Math.min(SW * 0.92, 300);
const HALF       = CONTAINER / 2;
const RADIUS     = 110 * (CONTAINER / 300);
const ITEM_SIZE  = 64;
const CENTER_SIZE = 68;
const CENTER_R   = CENTER_SIZE / 2;
const ITEM_BASE  = HALF - ITEM_SIZE / 2;
const CENTER_OFF = HALF - CENTER_R;

function toRad(deg) { return (deg * Math.PI) / 180; }

// Phases
const P = { IDLE: 0, OPEN: 1, HEARTBEAT: 2, EXPANDING: 3, CENTER: 4 };

const MENU = [
  { id: 'plan',     label: 'PLAN',     icon: 'calendar',    color: '#00F5FF', angle: -150, screen: 'Plan'         },
  { id: 'workout',  label: 'TRENING',  icon: 'zap',         color: '#FF4757', angle:  -90, screen: 'Log'          },
  { id: 'cwicz',    label: 'ĆWICZ.',   icon: 'bar-chart-2', color: '#00F5FF', angle:  -30, screen: 'Cwiczenia'    },
  { id: 'discover', label: 'DISCOVER', icon: 'compass',     color: '#818cf8', angle:   30, screen: 'Discover'     },
  { id: 'profile',  label: 'PROFIL',   icon: 'user',        color: '#FF4757', angle:   90, screen: 'Profil'       },
  { id: 'achiev',   label: 'ACHIEV.',  icon: 'award',       color: '#fbbf24', angle:  150, screen: 'Achievements' },
];

// Kolejność zgodna z ruchem wskazówek zegara (od 12):
const CW_ORDER  = [1, 2, 3, 4, 5, 0];
const CCW_ORDER = [0, 5, 4, 3, 2, 1];

const C = {
  bg: '#0A0A0C', txt: '#fff', muted: 'rgba(255,255,255,0.35)',
  coral: '#FF4757', cyan: '#00F5FF', border: 'rgba(255,255,255,0.08)',
};

// ─── Tile metrics config ──────────────────────────────────────────────────────

export const TILE_METRICS = [
  { id: 'duration',     label: 'CZAS' },
  { id: 'workouts',     label: 'TRENINGI' },
  { id: 'volume',       label: 'WOLUMEN' },
  { id: 'sets',         label: 'SERIE' },
  { id: 'streak',       label: 'STREAK' },
  { id: 'avg_duration', label: 'ŚR. CZAS' },
  { id: 'followers',    label: 'FOLLOWERS' },
];

export const TILE_PERIODS = [
  { id: 'week',  label: 'TEN TYDZIEŃ' },
  { id: 'month', label: 'TEN MIESIĄC' },
  { id: 'year',  label: 'TEN ROK' },
  { id: 'all',   label: 'CAŁY CZAS' },
];

function periodRange(period) {
  const now = Date.now();
  const d   = new Date();
  if (period === 'week') {
    const daysFromMonday = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(d.getDate() - daysFromMonday); monday.setHours(0,0,0,0);
    return [monday.getTime(), now];
  }
  if (period === 'month') {
    return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now];
  }
  if (period === 'year') {
    return [new Date(d.getFullYear(), 0, 1).getTime(), now];
  }
  return [0, now]; // all
}

function computeTileStat(records, { metric, period }) {
  const [from, to] = periodRange(period);
  const rec = records.filter(r => {
    const ts = r.timestamp || 0;
    return ts >= from && ts <= to;
  });

  if (metric === 'workouts') {
    const wids = new Set(rec.map(r => r.workoutId).filter(Boolean));
    if (wids.size > 0) return wids.size;
    // fallback: unique days
    return new Set(rec.map(r => startOfDay(r.timestamp || 0)).filter(Boolean)).size;
  }
  if (metric === 'volume') {
    return rec.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0);
  }
  if (metric === 'sets') {
    return rec.length;
  }
  if (metric === 'duration') {
    const days = new Map();
    for (const r of rec) {
      const day = startOfDay(r.timestamp || 0);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(r.timestamp || 0);
    }
    let totalMs = 0;
    for (const ts of days.values()) {
      if (ts.length > 1) totalMs += Math.max(...ts) - Math.min(...ts);
    }
    return totalMs;
  }
  if (metric === 'avg_duration') {
    const days = new Map();
    for (const r of rec) {
      const day = startOfDay(r.timestamp || 0);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(r.timestamp || 0);
    }
    let totalMs = 0, count = 0;
    for (const ts of days.values()) {
      if (ts.length > 1) { totalMs += Math.max(...ts) - Math.min(...ts); count++; }
    }
    return count > 0 ? totalMs / count : 0;
  }
  if (metric === 'followers') {
    return 0; // wymaga backendu
  }
  if (metric === 'streak') {
    // streak ignores period — shows current streak
    const allDays = new Set(records.map(r => startOfDay(r.timestamp || 0)).filter(Boolean));
    const ONE = 86400000;
    const today = startOfDay(Date.now());
    const start = allDays.has(today) ? today : allDays.has(today - ONE) ? today - ONE : null;
    if (!start) return 0;
    let s = 0;
    for (let day = start; allDays.has(day); day -= ONE) s++;
    return s;
  }
  return 0;
}

export function formatTileVal(metric, val) {
  if (metric === 'duration' || metric === 'avg_duration') {
    const ms = val;
    if (!ms || ms < 60000) return '—';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
  }
  if (metric === 'volume') {
    if (!val) return '—';
    return val >= 1000
      ? `${(val / 1000).toFixed(1).replace('.0', '')}t`
      : `${Math.round(val)}kg`;
  }
  if (metric === 'streak') {
    return val > 0 ? `${val}d` : '—';
  }
  return val > 0 ? String(val) : '—';
}

// ─── component ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase]   = useState(P.IDLE);
  const [active, setActive] = useState(null);
  const [showRipple, setShowRipple] = useState(false);
  const [tiles, setTiles]   = useState(DEFAULT_TILES);
  const [tileVals, setTileVals] = useState([0, 0, 0]);

  const timers     = useRef([]);
  const itemAnims  = useRef(MENU.map(() => new Animated.Value(0))).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heartAnim  = useRef(new Animated.Value(1)).current;
  const rippleAnim  = useRef(new Animated.Value(0)).current;
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const heroMoveAnim = useRef(new Animated.Value(0)).current;
  const pulseRunning  = useRef(false);
  const openRunning   = useRef(false);
  const heartbeatRef  = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  const after = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };
  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  function startPulse() {
    pulseRunning.current = true;
    heartAnim.setValue(1);

    function runCycle() {
      if (!pulseRunning.current) return;
      heartAnim.setValue(1);
      if (soundEnabledRef.current) replayHomeHeartbeat();
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.06, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0.99, duration: 140, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.09, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00, duration: 180, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00, duration: 560, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && pulseRunning.current) runCycle();
      });
    }

    runCycle();
  }

  function stopPulse() {
    pulseRunning.current = false;
    heartAnim.stopAnimation();
  }

  function startOpenHeartbeat() {
    openRunning.current = true;
    heartAnim.setValue(1);

    function runCycle() {
      if (!openRunning.current) return;
      heartAnim.setValue(1);
      if (soundEnabledRef.current) replayHomeHeartbeat();
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.03,  duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0.995, duration: 140, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.045, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00,  duration: 180, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00,  duration: 560, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && openRunning.current) runCycle();
      });
    }

    runCycle();
  }

  function stopOpenHeartbeat() {
    openRunning.current = false;
    heartAnim.stopAnimation();
  }

  useFocusEffect(
    useCallback(() => {
      clearAll();
      setPhase(P.IDLE);
      setActive(null);
      setShowRipple(false);
      itemAnims.forEach(a => a.setValue(0));
      rotateAnim.setValue(0);
      heartAnim.setValue(1);
      heroAnim.setValue(0);
      heroMoveAnim.setValue(0);
      (async () => {
        const saved = await AsyncStorage.getItem('pulse_sound_enabled');
        const enabled = saved === null ? true : saved === 'true';
        soundEnabledRef.current = enabled;
        setSoundEnabled(enabled);
        await initHomeHeartbeat();
        startPulse();
      })();

      (async () => {
        const [rec, tileSettings] = await Promise.all([loadRecords(), loadTileSettings()]);
        setTiles(tileSettings);
        setTileVals(tileSettings.map(tile => computeTileStat(rec, tile)));
      })();

      return () => { stopPulse(); clearAll(); unloadHomeHeartbeat(); };
    }, [])
  );

  // ── toggle open / close ──
  function handleToggle() {
    if (phase === P.IDLE) {
      setPhase(P.OPEN);
      stopPulse();
      startOpenHeartbeat();

      setShowRipple(true);
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        .start(() => setShowRipple(false));

      Animated.spring(rotateAnim, { toValue: 1, tension: 45, friction: 10, useNativeDriver: true }).start();

      Animated.stagger(100,
        CW_ORDER.map(i => Animated.spring(itemAnims[i], { toValue: 1, tension: 40, friction: 11, useNativeDriver: true }))
      ).start();

    } else if (phase === P.OPEN) {
      setPhase(P.IDLE);
      stopOpenHeartbeat();

      if (soundEnabledRef.current) replayHomeHeartbeat();
      heartAnim.setValue(1);
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.03,  duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0.995, duration: 140, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.045, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00,  duration: 180, useNativeDriver: true }),
      ]).start();

      Animated.spring(rotateAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }).start();

      Animated.stagger(100,
        CCW_ORDER.map(i => Animated.spring(itemAnims[i], { toValue: 0, tension: 60, friction: 13, useNativeDriver: true }))
      ).start(() => startPulse());
    }
  }

  // ── select item → full phase sequence ──
  function handleItem(itemId) {
    if (phase !== P.OPEN) return;
    const item = MENU.find(m => m.id === itemId);
    setActive(itemId);
    setPhase(P.HEARTBEAT);

    Animated.stagger(100,
      CCW_ORDER.map(i => Animated.spring(itemAnims[i], { toValue: 0, tension: 50, friction: 13, useNativeDriver: true }))
    ).start();

    Animated.spring(rotateAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }).start();

    stopOpenHeartbeat();

    if (soundEnabledRef.current) replayHomeHeartbeat();
    heartAnim.setValue(1);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1.20, duration: 120, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.32, duration: 150, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0.97, duration: 130, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.00, duration: 200, useNativeDriver: true }),
    ]).start();

    after(() => {
      setPhase(P.EXPANDING);
      Animated.timing(heartAnim, {
        toValue: 0, duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 850);

    after(() => {
      setPhase(P.CENTER);
      heroAnim.setValue(0);
      heroMoveAnim.setValue(0);
      Animated.timing(heroAnim, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 1350);

    after(() => {
      Animated.timing(heroMoveAnim, {
        toValue: 1, duration: 950,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
        useNativeDriver: true,
      }).start();
    }, 1850);

    after(() => {
      navigation.navigate(item.screen);
    }, 3000);
  }

  // ── derived interpolations ──
  const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const rippleScale   = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });

  const HERO_ICON_ABOVE_CENTER = 52;
  const TARGET_SCALE = 44 / 96;
  const targetIconY  = insets.top + 36;
  const heroTargetTranslateY = targetIconY + HERO_ICON_ABOVE_CENTER * TARGET_SCALE - SH / 2;

  const heroTranslateY = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, heroTargetTranslateY],
  });
  const heroScaleDown = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, TARGET_SCALE],
  });
  const heroLabelScale = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 13 / (52 * TARGET_SCALE)],
  });
  const heroLabelTranslateY = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, -20],
  });
  const heroSubOpacity = heroMoveAnim.interpolate({
    inputRange: [0, 0.25, 1], outputRange: [1, 0, 0],
  });

  const sel = MENU.find(m => m.id === active);
  const hiding  = phase >= P.HEARTBEAT;
  const isOpen  = phase === P.OPEN;
  const isCenter = phase >= P.CENTER;

  const rippleSize = CENTER_SIZE + 60;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Header ── */}
        <Animated.View style={[styles.header, hiding && styles.fade]}>
          <Text style={styles.logo}>
            <Text style={{ color: C.cyan }}>PU</Text>
            <Text style={{ color: '#fff'  }}>L</Text>
            <Text style={{ color: C.coral }}>SE</Text>
          </Text>
          <Text style={styles.tagline}>Train · Track · Share</Text>
          <TouchableOpacity
            style={styles.soundBtn}
            onPress={() => {
              const next = !soundEnabledRef.current;
              soundEnabledRef.current = next;
              setSoundEnabled(next);
              AsyncStorage.setItem('pulse_sound_enabled', String(next));
            }}
            hitSlop={12}
          >
            <Feather
              name={soundEnabled ? 'volume-2' : 'volume-x'}
              size={18}
              color={soundEnabled ? 'rgba(255,255,255,0.4)' : C.coral}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hint ── */}
        <Animated.View style={[styles.hintWrap, hiding && styles.fade]}>
          <Text style={[styles.hint, isOpen && { color: C.cyan }]}>
            {isOpen ? 'SELECT DESTINATION' : 'TAP TO NAVIGATE'}
          </Text>
        </Animated.View>

        {/* ── Menu stage ── */}
        <View style={styles.stage}>
          <View style={{ width: CONTAINER, height: CONTAINER }}>


            {/* Menu items */}
            {MENU.map((item, i) => {
              const rad     = toRad(item.angle);
              const targetX = Math.cos(rad) * RADIUS;
              const targetY = Math.sin(rad) * RADIUS;
              const anim    = itemAnims[i];

              const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, targetX] });
              const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, targetY] });

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.itemWrap,
                    { left: ITEM_BASE, top: ITEM_BASE, width: ITEM_SIZE, height: ITEM_SIZE },
                    { transform: [{ translateX }, { translateY }, { scale: anim }], opacity: anim },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.itemBtn}
                    onPress={() => handleItem(item.id)}
                    disabled={hiding}
                    activeOpacity={0.7}
                  >
                    <Feather name={item.icon} size={20} color={item.color} />
                    <Text style={[styles.itemLabel, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}


            {/* Ripple */}
            {showRipple && (
              <Animated.View style={[styles.ripple, {
                left: CENTER_OFF - 30, top: CENTER_OFF - 30,
                width: rippleSize, height: rippleSize, borderRadius: rippleSize / 2,
                transform: [{ scale: rippleScale }], opacity: rippleOpacity,
              }]} />
            )}

            {/* Center button */}
            <Animated.View style={[
              styles.centerWrap,
              {
                left: CENTER_OFF, top: CENTER_OFF,
                width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: CENTER_R,
                transform: [{ rotate: rotation }, { scale: heartAnim }],
                opacity: 1,
              },
            ]}>
              <TouchableOpacity
                style={[styles.centerBtn, { borderRadius: CENTER_R }]}
                onPress={handleToggle}
                disabled={hiding}
                activeOpacity={0.85}
              >
                {phase < P.HEARTBEAT && (
                  <Feather name="plus" size={26} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>

          </View>
        </View>

        {/* ── Footer ── */}
        <Animated.View style={[styles.footerWrap, hiding && styles.fade]}>
          <Text style={styles.instruction}>
            {isOpen ? 'Select destination' : 'Press center to expand'}
          </Text>
          <View style={styles.statsStrip}>
            {tiles.map((tile, i) => {
              const metaCfg = TILE_METRICS.find(m => m.id === tile.metric);
              const periodCfg = TILE_PERIODS.find(p => p.id === tile.period);
              const val = tileVals[i] ?? 0;
              return [
                i > 0 && <View key={`div_${i}`} style={styles.statDivider} />,
                <View key={tile.metric + i} style={styles.stat}>
                  <Text style={styles.statValue}>{formatTileVal(tile.metric, val)}</Text>
                  <Text style={styles.statLabel}>{metaCfg?.label ?? tile.metric}</Text>
                  {tile.period !== 'all' && (
                    <Text style={styles.statPeriod}>{periodCfg?.label}</Text>
                  )}
                </View>,
              ];
            })}
          </View>
        </Animated.View>

      </SafeAreaView>

      {/* ── Hero icon + title ── */}
      {isCenter && sel && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.heroWrap, {
            transform: [
              { translateY: heroTranslateY },
              { scale: heroAnim },
              { scale: heroScaleDown },
            ],
            opacity: heroAnim,
          }]}
          pointerEvents="none"
        >
          <View style={[styles.heroIcon, { backgroundColor: sel.color + '18', borderColor: sel.color + '55' }]}>
            <Feather name={sel.icon} size={40} color={sel.color} />
          </View>
          <Animated.Text
            style={[styles.heroTitle, { color: sel.color, transform: [{ translateY: heroLabelTranslateY }, { scale: heroLabelScale }] }]}
          >
            {sel.label}
          </Animated.Text>
          <Animated.Text style={[styles.heroSub, { opacity: heroSubOpacity }]}>
            Pulse · Active View
          </Animated.Text>
        </Animated.View>
      )}

    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  fade: { opacity: 0 },

  header:  { alignItems: 'center', paddingTop: 24, paddingBottom: 4 },
  soundBtn: { position: 'absolute', right: 16, top: 28 },
  logo:    { fontSize: 52, fontWeight: '900', letterSpacing: 8 },
  tagline: { fontSize: 12, letterSpacing: 6, color: C.muted, textTransform: 'uppercase', marginTop: 6 },

  hintWrap: { alignItems: 'center', height: 24, justifyContent: 'center', marginBottom: 32 },
  hint: { fontSize: 12, letterSpacing: 5, fontWeight: '600', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  orbitRing:     { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  orbitRingOpen: { borderColor: 'rgba(0,245,255,0.08)' },

  itemWrap: { position: 'absolute' },
  itemBtn: {
    flex: 1,
    backgroundColor: 'rgba(15,15,20,0.9)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    gap: 2,
  },
  itemLabel: {
    fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  pulseRing: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,71,87,0.4)' },
  ripple:    { position: 'absolute', backgroundColor: 'rgba(255,71,87,0.25)' },

  centerWrap: { position: 'absolute', overflow: 'hidden' },
  centerBtn: {
    flex: 1, backgroundColor: C.coral,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.coral, shadowOpacity: 0.6,
    shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  footerWrap:  { alignItems: 'center', paddingBottom: 8 },
  instruction: { fontSize: 11, letterSpacing: 4, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 24 },
  statsStrip:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 24, marginBottom: 16 },
  stat:        { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 28, fontWeight: '700', letterSpacing: 1, color: '#fff', lineHeight: 32 },
  statUnit:    { fontSize: 16, color: C.cyan },
  statLabel:   { fontSize: 10, letterSpacing: 5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  statPeriod:  { fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginTop: 2 },

  // Hero
  heroWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  heroIcon: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  heroTitle: { fontSize: 52, fontWeight: '900', letterSpacing: 12, textTransform: 'uppercase' },
  heroSub:   { fontSize: 13, letterSpacing: 6, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: 8 },
});
