/**
 * screens/AchievementsScreen.js
 * System achievementów – React Native / Expo
 *
 * Importuje dane z: ../src/achievements.js
 * Rejestracja w App.js:
 *   <Stack.Screen name="Achievements" component={AchievementsScreen} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Modal, Pressable, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENTS, CATEGORIES, RARITY, getCollectionStats,
} from '../src/achievements';

// ─── Kolory ───────────────────────────────────────────────────────────────
const C = {
  bg:      '#080a12',
  card:    '#0d0f1a',
  border:  '#1a1c2a',
  border2: '#1e2030',
  text:    '#ccd6e0',
  muted:   '#445566',
  muted2:  '#334455',
  red:     '#FF4757',
  dim:     '#2a3a4a',
  dim2:    '#1e2a34',
};

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48 - 10) / 2; // 2 kolumny z marginesami

// ─── Helper: rarity config ────────────────────────────────────────────────
function R(rarity) {
  return RARITY[rarity] ?? RARITY.common;
}

function fmtXP(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
}
function fmtNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
}

// ─── ACHIEVEMENT CARD ─────────────────────────────────────────────────────
const AchievCard = React.memo(({ achievement, unlocked, progress, onPress }) => {
  const r        = R(achievement.rarity);
  const isSecret = achievement.rarity === 'secret';
  const max      = achievement.condition?.value ?? 1;
  const cur      = progress?.current ?? (unlocked ? max : 0);
  const pct      = max > 1 ? Math.min(100, Math.round((cur / max) * 100)) : (unlocked ? 100 : 0);
  const showBar  = max > 1 && !isSecret;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: CARD_W },
        unlocked && { borderColor: r.color + '44', backgroundColor: r.color + '10' },
      ]}
      onPress={() => onPress(achievement)}
      activeOpacity={0.75}
    >
      {/* Top glow strip */}
      {unlocked && (
        <View style={[styles.cardGlowStrip, { backgroundColor: r.color }]} />
      )}

      {/* Unlocked checkmark */}
      {unlocked && (
        <View style={[styles.cardCheck, { backgroundColor: r.color }]}>
          <Feather name="check" size={8} color="#fff" />
        </View>
      )}

      {/* Icon */}
      <Text style={[styles.cardIcon, !unlocked && styles.cardIconLocked]}>
        {isSecret && !unlocked ? '🔒' : achievement.icon}
      </Text>

      {/* Name */}
      <Text
        style={[styles.cardName, { color: unlocked ? r.color : C.dim }]}
        numberOfLines={2}
      >
        {isSecret && !unlocked ? '???' : achievement.name}
      </Text>

      {/* Desc */}
      <Text style={[styles.cardDesc, !unlocked && { color: C.dim2 }]} numberOfLines={2}>
        {isSecret && !unlocked ? 'Odkryj warunek samodzielnie' : achievement.description}
      </Text>

      {/* Progress bar */}
      {showBar && (
        <View style={styles.barWrap}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: unlocked ? r.color : C.dim }]} />
          </View>
          <Text style={[styles.barPct, { color: unlocked ? r.color : C.dim2 }]}>{pct}%</Text>
        </View>
      )}

      {/* Bottom row */}
      <View style={styles.cardBottom}>
        <View style={[styles.rarityBadge, { borderColor: unlocked ? r.color + '55' : C.border2, backgroundColor: unlocked ? r.color + '18' : '#111520' }]}>
          <Text style={[styles.rarityText, { color: unlocked ? r.color : C.dim2 }]}>
            {R(achievement.rarity).label}
          </Text>
        </View>
        <Text style={[styles.xpText, { color: unlocked ? C.muted : C.dim2 }]}>
          {fmtXP(achievement.xpReward)} XP
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────
function DetailModal({ achievement, unlocked, progress, visible, onClose }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [visible]);

  if (!achievement) return null;

  const r        = R(achievement.rarity);
  const isSecret = achievement.rarity === 'secret';
  const max      = achievement.condition?.value ?? 1;
  const cur      = progress?.current ?? (unlocked ? max : 0);
  const pct      = max > 1 ? Math.min(100, Math.round((cur / max) * 100)) : (unlocked ? 100 : 0);

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[styles.modalSheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={e => e.stopPropagation()}
        >
          {/* Glow strip */}
          <View style={[styles.modalGlow, { backgroundColor: r.color }]} />

          {/* Close */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Feather name="x" size={16} color={C.muted} />
          </TouchableOpacity>

          {/* Icon */}
          <Text style={[styles.modalIcon, !unlocked && styles.cardIconLocked]}>
            {isSecret && !unlocked ? '🔒' : achievement.icon}
          </Text>

          {/* Rarity badge */}
          <View style={[styles.modalRarityBadge, { borderColor: r.color + '55', backgroundColor: r.color + '18' }]}>
            <Text style={[styles.modalRarityText, { color: r.color }]}>
              {r.label}
            </Text>
          </View>

          {/* Name */}
          <Text style={[styles.modalName, { color: unlocked ? r.color : C.dim }]}>
            {isSecret && !unlocked ? '???' : achievement.name}
          </Text>

          {/* Description */}
          <Text style={styles.modalDesc}>
            {isSecret && !unlocked
              ? 'Ten achievement jest ukryty. Odkryjesz go przez trenowanie.'
              : (unlocked && achievement.revealedDescription)
                ? achievement.revealedDescription
                : achievement.description}
          </Text>

          {/* Flavor text */}
          {(unlocked || !isSecret) && achievement.flavor && (
            <View style={[styles.modalFlavor, { borderLeftColor: r.color }]}>
              <Text style={styles.modalFlavorText}>{achievement.flavor}</Text>
            </View>
          )}

          {/* Progress */}
          {max > 1 && !isSecret && (
            <View style={styles.modalProgressWrap}>
              <View style={styles.modalProgressHeader}>
                <Text style={styles.modalProgressLabel}>Postęp</Text>
                <Text style={[styles.modalProgressValue, { color: unlocked ? r.color : C.muted }]}>
                  {fmtNum(cur)} / {fmtNum(max)}
                </Text>
              </View>
              <View style={styles.modalBarBg}>
                <View style={[styles.modalBarFill, { width: `${pct}%`, backgroundColor: r.color }]} />
              </View>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.modalStats}>
            <View style={styles.modalStat}>
              <Text style={[styles.modalStatVal, { color: unlocked ? r.color : C.dim }]}>
                {fmtXP(achievement.xpReward)}
              </Text>
              <Text style={styles.modalStatLabel}>XP REWARD</Text>
            </View>
            <View style={styles.modalStatDivider} />
            <View style={styles.modalStat}>
              <Text style={[styles.modalStatVal, { color: unlocked ? '#2ecc71' : C.dim }]}>
                {unlocked ? '✓' : '—'}
              </Text>
              <Text style={styles.modalStatLabel}>STATUS</Text>
            </View>
            {achievement.category && (
              <>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatVal, { color: C.muted, fontSize: 13 }]}>
                    {CATEGORIES.find(c => c.id === achievement.category)?.icon ?? '?'}
                  </Text>
                  <Text style={styles.modalStatLabel}>KATEGORIA</Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────
export default function AchievementsScreen({ navigation }) {
  const [selectedCat, setSelectedCat]   = useState('all');
  const [unlockedIds, setUnlockedIds]   = useState([]);
  const [progressMap, setProgressMap]   = useState({});
  const [selectedAch, setSelectedAch]   = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showLocked, setShowLocked]     = useState(false); // true = tylko niezdobyte

  // Wczytaj odblokowane achievementy z AsyncStorage
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem('pulse_achievements');
        if (stored) {
          const data = JSON.parse(stored);
          setUnlockedIds(data.unlockedIds ?? []);
          setProgressMap(data.progress ?? {});
        }
      } catch (e) {
        console.warn('[Achievements] load error:', e);
      }
    }
    load();
  }, []);

  const stats = getCollectionStats(unlockedIds);

  // Filtrowanie
  const visibleAch = ACHIEVEMENTS
    .filter(a => selectedCat === 'all' || a.category === selectedCat)
    .filter(a => !showLocked || !unlockedIds.includes(a.id))
    .sort((a, b) => {
      const ua = unlockedIds.includes(a.id);
      const ub = unlockedIds.includes(b.id);
      if (ua !== ub) return ua ? -1 : 1;
      const order = ['common','uncommon','rare','epic','legendary','mythic','secret'];
      return order.indexOf(a.rarity) - order.indexOf(b.rarity);
    });

  const openModal = useCallback((a) => {
    setSelectedAch(a);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedAch(null), 300);
  }, []);

  // Renderuj kartę (FlatList)
  const renderCard = useCallback(({ item, index }) => (
    <View style={index % 2 === 0 ? { marginRight: 10 } : {}}>
      <AchievCard
        achievement={item}
        unlocked={unlockedIds.includes(item.id)}
        progress={progressMap[item.id]}
        onPress={openModal}
      />
    </View>
  ), [unlockedIds, progressMap, openModal]);

  const pct = Math.round((stats.unlocked / stats.total) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievementy</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={visibleAch}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {/* STATS BAR */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: C.red }]}>{stats.unlocked}/{stats.total}</Text>
                <Text style={styles.statLbl}>Odblokowane</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: C.red }]}>{fmtXP(stats.xp)} XP</Text>
                <Text style={styles.statLbl}>Zdobyte XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: C.red }]}>{pct}%</Text>
                <Text style={styles.statLbl}>Ukończenie</Text>
              </View>
            </View>

            {/* OVERALL PROGRESS BAR */}
            <View style={styles.overallBarWrap}>
              <View style={styles.overallBarBg}>
                <View style={[styles.overallBarFill, { width: `${pct}%` }]} />
              </View>
            </View>

            {/* RARITY BREAKDOWN */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rarityScroll}
              contentContainerStyle={styles.rarityRow}
            >
              {Object.entries(RARITY).map(([key, r]) => {
                const got   = stats.byRarity[key]?.unlocked ?? 0;
                const total = stats.byRarity[key]?.total ?? 0;
                return (
                  <View key={key} style={[styles.rarityChip, { borderColor: r.color + '44' }]}>
                    <Text style={[styles.rarityChipLabel, { color: r.color }]}>{r.label}</Text>
                    <Text style={styles.rarityChipCount}>{got}/{total}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* CATEGORY TABS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabScroll}
              contentContainerStyle={styles.tabRow}
            >
              {[{ id: 'all', label: 'WSZYSTKIE', icon: '✦' }, ...CATEGORIES].map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id)}
                  style={[
                    styles.tab,
                    selectedCat === cat.id && styles.tabActive,
                  ]}
                >
                  <Text style={[styles.tabText, selectedCat === cat.id && { color: C.red }]}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* FILTER ROW */}
            <View style={styles.filterRow}>
              <Text style={styles.filterCount}>{visibleAch.length} achievementów</Text>
              <TouchableOpacity
                onPress={() => setShowLocked(l => !l)}
                style={[styles.filterBtn, showLocked && styles.filterBtnActive]}
              >
                <Text style={[styles.filterBtnText, showLocked && { color: C.red }]}>
                  {showLocked ? '✓ ' : ''}Do zdobycia
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={renderCard}
      />

      {/* MODAL */}
      <DetailModal
        achievement={selectedAch}
        unlocked={selectedAch ? unlockedIds.includes(selectedAch.id) : false}
        progress={selectedAch ? progressMap[selectedAch.id] : null}
        visible={modalVisible}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
}

// ─── STYLE ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.3 },

  // List
  listContent:   { padding: 16, paddingBottom: 60 },
  columnWrapper: { justifyContent: 'flex-start', marginBottom: 10 },

  // Stats bar
  statsBar: {
    flexDirection: 'row', backgroundColor: C.card,
    borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLbl:     { fontSize: 8, color: C.muted2, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // Overall bar
  overallBarWrap: { marginBottom: 14 },
  overallBarBg:   { height: 3, backgroundColor: C.border, borderRadius: 2 },
  overallBarFill: { height: '100%', backgroundColor: C.red, borderRadius: 2 },

  // Rarity chips
  rarityScroll:  { marginBottom: 14 },
  rarityRow:     { gap: 6, paddingHorizontal: 0 },
  rarityChip:    {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', backgroundColor: C.card,
  },
  rarityChipLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rarityChipCount: { fontSize: 10, color: C.muted, marginTop: 1 },

  // Tabs
  tabScroll: { marginBottom: 10 },
  tabRow:    { gap: 4 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:  { borderBottomColor: C.red },
  tabText:    { fontSize: 9, fontWeight: '700', color: C.muted2, letterSpacing: 0.8 },

  // Filter
  filterRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  filterCount:       { fontSize: 10, color: C.muted2 },
  filterBtn:         { borderWidth: 1, borderColor: C.border2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filterBtnActive:   { borderColor: C.red + '66', backgroundColor: C.red + '18' },
  filterBtnText:     { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 13, position: 'relative', overflow: 'hidden', marginBottom: 0,
  },
  cardGlowStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.8 },
  cardCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon:       { fontSize: 26, marginBottom: 8 },
  cardIconLocked: { opacity: 0.2 },
  cardName: {
    fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 0.3, marginBottom: 4, minHeight: 30,
  },
  cardDesc:    { fontSize: 10, color: C.muted, lineHeight: 14, marginBottom: 8, minHeight: 28 },
  barWrap:     { marginBottom: 8 },
  barBg:       { height: 2, backgroundColor: C.border, borderRadius: 2, marginBottom: 3 },
  barFill:     { height: '100%', borderRadius: 2 },
  barPct:      { fontSize: 8, fontWeight: '700', textAlign: 'right' },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rarityBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  rarityText:  { fontSize: 7, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  xpText:      { fontSize: 9 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#000000bb',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 44,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border,
    alignItems: 'center', position: 'relative',
  },
  modalGlow:    { position: 'absolute', top: 0, left: 40, right: 40, height: 2, borderRadius: 2, opacity: 0.9 },
  modalClose:   { position: 'absolute', top: 16, right: 16, padding: 6 },
  modalIcon:    { fontSize: 56, marginBottom: 14 },
  modalRarityBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  modalRarityText:  { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  modalName:    { fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' },
  modalDesc:    { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  modalFlavor:  {
    borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 8,
    marginBottom: 16, alignSelf: 'stretch',
    backgroundColor: '#0a0c14', borderRadius: 4,
  },
  modalFlavorText: { fontSize: 11, color: '#445566', fontStyle: 'italic', lineHeight: 17 },
  modalProgressWrap:   { alignSelf: 'stretch', marginBottom: 20 },
  modalProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modalProgressLabel:  { fontSize: 10, color: C.muted2 },
  modalProgressValue:  { fontSize: 10, fontWeight: '700' },
  modalBarBg:   { height: 4, backgroundColor: C.border, borderRadius: 4 },
  modalBarFill: { height: '100%', borderRadius: 4 },
  modalStats:   { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  modalStat:    { flex: 1, alignItems: 'center' },
  modalStatVal: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalStatLabel: { fontSize: 8, color: C.muted2, textTransform: 'uppercase', letterSpacing: 1 },
  modalStatDivider: { width: 1, height: 36, backgroundColor: C.border },
});
