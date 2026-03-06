import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// ─── constants ───────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

const CONTAINER  = Math.min(SW * 0.92, 300);
const HALF       = CONTAINER / 2;
const RADIUS     = 110 * (CONTAINER / 300);
const ITEM_SIZE  = 56;
const CENTER_SIZE = 68;
const CENTER_R   = CENTER_SIZE / 2;
const ORBIT_SIZE = 240 * (CONTAINER / 300);
const ITEM_BASE  = HALF - ITEM_SIZE / 2;
const CENTER_OFF = HALF - CENTER_R;

function toRad(deg) { return (deg * Math.PI) / 180; }

// Phases
const P = { IDLE: 0, OPEN: 1, HEARTBEAT: 2, EXPANDING: 3, CENTER: 4 };

const MENU = [
  { id: 'plan',    label: 'PLAN',     icon: 'calendar',    color: '#00F5FF', angle: -162, screen: 'Plan'      },
  { id: 'workout', label: 'TRENING',  icon: 'zap',         color: '#FF4757', angle: -117, screen: 'Start'     },
  { id: 'stats',   label: 'HISTORIA', icon: 'activity',    color: '#FFD700', angle:  -90, screen: 'Historia'  },
  { id: 'cwicz',   label: 'ĆWICZ.',   icon: 'bar-chart-2', color: '#00F5FF', angle:  -63, screen: 'Cwiczenia' },
  { id: 'profile', label: 'PROFIL',   icon: 'user',        color: '#FF4757', angle:  -18, screen: 'Profil'    },
];

const C = {
  bg: '#0A0A0C', txt: '#fff', muted: 'rgba(255,255,255,0.35)',
  coral: '#FF4757', cyan: '#00F5FF', border: 'rgba(255,255,255,0.08)',
};

// ─── component ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase]   = useState(P.IDLE);
  const [active, setActive] = useState(null);
  const [showRipple, setShowRipple] = useState(false);

  const timers     = useRef([]);
  const itemAnims  = useRef(MENU.map(() => new Animated.Value(0))).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heartAnim  = useRef(new Animated.Value(1)).current;
  const rippleAnim  = useRef(new Animated.Value(0)).current;
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const heroMoveAnim = useRef(new Animated.Value(0)).current;
  const pulse1     = useRef(new Animated.Value(0)).current;
  const pulse2     = useRef(new Animated.Value(0)).current;
  const loop1Ref      = useRef(null);
  const loop2Ref      = useRef(null);
  const pulseTimer    = useRef(null);
  const heartbeatRef  = useRef(null);

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
    pulse1.setValue(0); pulse2.setValue(0);
    loop1Ref.current = Animated.loop(
      Animated.timing(pulse1, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    loop1Ref.current.start();
    pulseTimer.current = setTimeout(() => {
      loop2Ref.current = Animated.loop(
        Animated.timing(pulse2, { toValue: 1, duration: 2000, useNativeDriver: true })
      );
      loop2Ref.current.start();
    }, 700);

    // Spokojny rytm serca (~60 bpm): lub·DUB + pauza, w pętli
    heartAnim.setValue(1);
    heartbeatRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.06, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0.99, duration: 140, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.09, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00, duration: 180, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00, duration: 560, useNativeDriver: true }), // pauza
      ])
    );
    heartbeatRef.current.start();
  }

  function stopPulse() {
    loop1Ref.current?.stop();
    loop2Ref.current?.stop();
    clearTimeout(pulseTimer.current);
    heartbeatRef.current?.stop();
    heartAnim.setValue(1);
  }

  // Bardzo delikatne pulsowanie gdy menu otwarte (2× subtelniejsze niż IDLE)
  function startOpenHeartbeat() {
    heartAnim.setValue(1);
    heartbeatRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.03,  duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0.995, duration: 140, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.045, duration: 110, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00,  duration: 180, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1.00,  duration: 560, useNativeDriver: true }),
      ])
    );
    heartbeatRef.current.start();
  }

  // Reset everything on focus
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
      startPulse();
      return () => { stopPulse(); clearAll(); };
    }, [])
  );

  // ── toggle open / close ──
  function handleToggle() {
    if (phase === P.IDLE) {
      setPhase(P.OPEN);
      stopPulse();
      startOpenHeartbeat();

      // Ripple
      setShowRipple(true);
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        .start(() => setShowRipple(false));

      // Rotate +45°
      Animated.spring(rotateAnim, { toValue: 1, tension: 45, friction: 10, useNativeDriver: true }).start();

      // Fan items out — wolniejszy stagger
      Animated.stagger(70,
        itemAnims.map(a => Animated.spring(a, { toValue: 1, tension: 40, friction: 11, useNativeDriver: true }))
      ).start();

    } else if (phase === P.OPEN) {
      setPhase(P.IDLE);

      // Rotate back
      Animated.spring(rotateAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }).start();

      // Collapse items
      Animated.stagger(45,
        [...itemAnims].reverse().map(a =>
          Animated.spring(a, { toValue: 0, tension: 60, friction: 13, useNativeDriver: true })
        )
      ).start(() => startPulse());
    }
  }

  // ── select item → full phase sequence ──
  function handleItem(itemId) {
    if (phase !== P.OPEN) return;
    const item = MENU.find(m => m.id === itemId);
    setActive(itemId);
    setPhase(P.HEARTBEAT);

    // Płynne zwijanie ikon menu
    Animated.stagger(40,
      [...itemAnims].reverse().map(a =>
        Animated.spring(a, { toValue: 0, tension: 50, friction: 13, useNativeDriver: true })
      )
    ).start();

    // Rotate back to +
    Animated.spring(rotateAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }).start();

    // Zatrzymaj delikatne pulsowanie przed lub·DUB
    heartbeatRef.current?.stop();

    // lub·DUB — powolne, dostojne (850ms)
    heartAnim.setValue(1);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1.20, duration: 120, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.32, duration: 150, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0.97, duration: 130, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 1.00, duration: 200, useNativeDriver: true }),
    ]).start();

    // T+850ms → środek zapada się do zera
    after(() => {
      setPhase(P.EXPANDING);
      Animated.timing(heartAnim, {
        toValue: 0, duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 850);

    // T+1350ms → hero pojawia się w centrum (timing: gwarantowane 1.0 po 450ms)
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

    // T+1850ms → hero wędruje w górę (timing: gwarantowane 1.0 po 950ms)
    after(() => {
      Animated.timing(heroMoveAnim, {
        toValue: 1, duration: 950,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
        useNativeDriver: true,
      }).start();
    }, 1850);

    // T+3000ms → nawigacja (heroMoveAnim kończy się w T+2800ms — 200ms zapasu)
    after(() => {
      navigation.navigate(item.screen);
    }, 3000);
  }

  // ── derived interpolations ──
  const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const ring1Scale   = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] });
  const ring1Opacity = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0]   });
  const ring2Scale   = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] });
  const ring2Opacity = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0]   });

  const rippleScale   = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });

  // Dopasowanie pozycji hero do ScreenHeader:
  //   środek ikony w ScreenHeader = insets.top + paddingV(14) + halfIcon(22) = insets.top + 36
  //   środek ikony hero (przed animacją) = SH/2 − HERO_ICON_ABOVE_CENTER
  //   HERO_ICON_ABOVE_CENTER ≈ totalContentHeight/2 − heroIconHeight/2 ≈ 52px
  const HERO_ICON_ABOVE_CENTER = 52;
  const TARGET_SCALE = 44 / 96; // heroIcon 96px → ScreenHeader iconWrap 44px
  const targetIconY  = insets.top + 36; // środek ikony w ScreenHeader od góry ekranu
  const heroTargetTranslateY = targetIconY + HERO_ICON_ABOVE_CENTER * TARGET_SCALE - SH / 2;

  const heroTranslateY = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, heroTargetTranslateY],
  });
  const heroScaleDown = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, TARGET_SCALE],
  });
  // Tytuł musi skalować się dodatkowo do fontSize 13 (ScreenHeader label)
  // Kontener już skaluje o TARGET_SCALE, więc dodatkowy współczynnik = 13 / (52 × TARGET_SCALE)
  const heroLabelScale = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 13 / (52 * TARGET_SCALE)],
  });
  // Korekcja pozycji labela w górę
  const heroLabelTranslateY = heroMoveAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, -20],
  });
  // Podtytuł znika podczas ruchu
  const heroSubOpacity = heroMoveAnim.interpolate({
    inputRange: [0, 0.25, 1], outputRange: [1, 0, 0],
  });

  const sel = MENU.find(m => m.id === active);
  const hiding  = phase >= P.HEARTBEAT;
  const isOpen  = phase === P.OPEN;
  const isCenter = phase >= P.CENTER;

  const ring1Size = CENTER_SIZE + 16;
  const ring2Size = CENTER_SIZE + 36;
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
        </Animated.View>

        {/* ── Active hint ── */}
        <Animated.View style={[styles.hintWrap, hiding && styles.fade]}>
          <Text style={[styles.hint, isOpen && { color: C.cyan }]}>
            {isOpen ? 'SELECT DESTINATION' : 'TAP TO NAVIGATE'}
          </Text>
        </Animated.View>

        {/* ── Menu stage ── */}
        <View style={styles.stage}>
          <View style={{ width: CONTAINER, height: CONTAINER }}>

            {/* Orbit ring */}
            <View style={[styles.orbitRing, {
              left: HALF - ORBIT_SIZE / 2, top: HALF - ORBIT_SIZE / 2,
              width: ORBIT_SIZE, height: ORBIT_SIZE, borderRadius: ORBIT_SIZE / 2,
            }, isOpen && styles.orbitRingOpen]} />

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

            {/* Pulse ring 1 */}
            {phase === P.IDLE && (
              <Animated.View style={[styles.pulseRing, {
                left: CENTER_OFF - 8, top: CENTER_OFF - 8,
                width: ring1Size, height: ring1Size, borderRadius: ring1Size / 2,
                transform: [{ scale: ring1Scale }], opacity: ring1Opacity,
              }]} />
            )}

            {/* Pulse ring 2 */}
            {phase === P.IDLE && (
              <Animated.View style={[styles.pulseRing, {
                left: CENTER_OFF - 18, top: CENTER_OFF - 18,
                width: ring2Size, height: ring2Size, borderRadius: ring2Size / 2,
                borderColor: 'rgba(255,71,87,0.2)',
                transform: [{ scale: ring2Scale }], opacity: ring2Opacity,
              }]} />
            )}

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
                {/* Hide + icon during heartbeat */}
                {phase !== P.HEARTBEAT && (
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
            <View style={styles.stat}>
              <Text style={styles.statValue}>147<Text style={styles.statUnit}>k</Text></Text>
              <Text style={styles.statLabel}>CALORIES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>38</Text>
              <Text style={styles.statLabel}>WORKOUTS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>FRIENDS</Text>
            </View>
          </View>
        </Animated.View>

      </SafeAreaView>

      {/* ── Hero icon + title (centered, appears when center button vanishes) ── */}
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
    fontSize: 7, fontWeight: '800', letterSpacing: 0.5,
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
  statsStrip:  { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 16 },
  stat:        { alignItems: 'center' },
  statValue:   { fontSize: 28, fontWeight: '700', letterSpacing: 1, color: '#fff', lineHeight: 32 },
  statUnit:    { fontSize: 16, color: C.cyan },
  statLabel:   { fontSize: 10, letterSpacing: 5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Hero
  heroWrap: {
    alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  heroIcon: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: { fontSize: 52, fontWeight: '900', letterSpacing: 12, textTransform: 'uppercase' },
  heroSub:   { fontSize: 13, letterSpacing: 6, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: 8 },
});
