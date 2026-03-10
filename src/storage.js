import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Schema version ────────────────────────────────────────────────────────────
// Bump when the stored data shape changes — triggers migration on next load.
const SCHEMA_VERSION = 2;

// ── Storage keys ──────────────────────────────────────────────────────────────
// All keys use the "pulse_" prefix. Legacy "sila_" keys are read during
// migration and then removed.
export const KEYS = {
  schemaVersion: 'pulse_schema_version',
  exercises:     'pulse_exercises',
  records:       'pulse_records',
  lastEx:        'pulse_last_ex',
  bodyWeight:    'pulse_body_weight_kg',
  bwHistory:     'pulse_body_weight_history',
  bwEx:          'pulse_bw_exercises',
  myGym:         'pulse_my_gym',
  profile:       'pulse_profile',
};

// Legacy keys (sila app) — only used in migration
const LEGACY_KEYS = {
  exercises:  'sila_exercises',
  records:    'sila_records',
  lastEx:     'sila_last_ex',
  bodyWeight: 'sila_body_weight_kg',
  bwHistory:  'sila_body_weight_history',
  bwEx:       'sila_bw_exercises',
};

// ── ID generation ─────────────────────────────────────────────────────────────
// Simple UUID v4 — drop-in replacement for Date.now() IDs.
// Backend can accept this format or replace with server-generated UUIDs.
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Keep generateId as alias for compatibility with existing screens
export { generateUUID as generateId };

// ── Date helpers ──────────────────────────────────────────────────────────────
// ISO date string: "2026-03-09" — safe for sorting, backend-compatible
export function isoDate(ts = Date.now()) {
  return new Date(ts).toISOString().split('T')[0];
}

// Human-readable Polish date — display only, never stored as primary date
export function displayDate(isoDateStr) {
  if (!isoDateStr) return '—';
  const [y, m, d] = isoDateStr.split('-');
  return `${d}.${m}.${y}`;
}

// ── Default data ──────────────────────────────────────────────────────────────
export const DEFAULT_EXERCISES = [
  '1-arm dumbbell row','Allah (Cable crunch)','Barbbell preacher curl','Barbell back squat',
  'Barbell curl','Barbell row','Bench press','Cable crossovers','Cable lat pull-over',
  'Cable lateral raise','Cable row','Chest-supported row','Chin Up','Deadlift','Dips',
  'Dumbbell flye','Dumbbell Overhead press','Face away bayesian Cable curl','Glute press',
  'Incline bench press','Incline curl','Incline dumbbell press','Leg curl','Leg extension',
  'Maschine shoulder press','Neutral Grip Pull Up','Neutral-grip lat pulldown',
  'Overhead Cable triceps extension','Overhead press','Pec dec','Pull Up','Seated calf raise',
  'Seated row','Skullcrusher','Standing dumbbell lateral raise','Triceps pressdown (bar)',
  'Wide-grip lat pulldown',
];

export const DEFAULT_BW_EX = ['Pull Up','Neutral Grip Pull Up','Chin Up','Dips'];

// ── Record schema (v2) ────────────────────────────────────────────────────────
//
// {
//   id:           string   — UUID v4
//   workoutId:    string   — UUID v4, same for all sets in one session
//   exercise:     string   — exercise name
//   weight:       number   — additional weight in kg (0 for bodyweight-only)
//   reps:         number
//   isoDate:      string   — "2026-03-09" (ISO 8601, primary date field)
//   date:         string   — "09.03.2026" (display only, kept for compat)
//   timestamp:    number   — Unix ms, for ordering within a workout
//   bodyWeightKg: number   — user's bodyweight at time of set
//   gymId:        string|null — gym identifier (null if no check-in)
//   gymName:      string|null — gym name (denormalized for offline use)
// }
//
// Fields added by backend later (not stored locally):
//   userId, createdAt (server), updatedAt (server), syncedAt

// ── Migration ─────────────────────────────────────────────────────────────────

function migrateRecord(r) {
  // Ensure UUID id
  const id = (typeof r.id === 'string' && r.id.includes('-'))
    ? r.id
    : generateUUID();

  // Derive isoDate from timestamp or legacy date string
  let iso = r.isoDate;
  if (!iso) {
    if (r.timestamp) {
      iso = isoDate(r.timestamp);
    } else if (r.date && r.date.includes('.')) {
      // "09.03.2026" → "2026-03-09"
      const [d, m, y] = r.date.split('.');
      iso = `${y}-${m}-${d}`;
    } else {
      iso = isoDate();
    }
  }

  return {
    id,
    workoutId:    r.workoutId    || null,   // null for pre-v2 records
    exercise:     r.exercise     || '',
    weight:       Number(r.weight) || 0,
    reps:         Number(r.reps)   || 0,
    isoDate:      iso,
    date:         displayDate(iso),          // regenerate from isoDate
    timestamp:    r.timestamp    || 0,
    bodyWeightKg: r.bodyWeightKg || 80,
    gymId:        r.gymId        || null,
    gymName:      r.gymName      || null,
  };
}

async function migrate() {
  const versionStr = await AsyncStorage.getItem(KEYS.schemaVersion);
  const version = versionStr ? parseInt(versionStr) : 0;
  if (version >= SCHEMA_VERSION) return;

  // v1 → v2: copy legacy sila_ keys → pulse_ keys, migrate record shape
  if (version < 2) {
    // Exercises
    const legacyEx = await AsyncStorage.getItem(LEGACY_KEYS.exercises);
    if (legacyEx && !await AsyncStorage.getItem(KEYS.exercises)) {
      await AsyncStorage.setItem(KEYS.exercises, legacyEx);
    }
    // BW exercises
    const legacyBwEx = await AsyncStorage.getItem(LEGACY_KEYS.bwEx);
    if (legacyBwEx && !await AsyncStorage.getItem(KEYS.bwEx)) {
      await AsyncStorage.setItem(KEYS.bwEx, legacyBwEx);
    }
    // Body weight
    const legacyBw = await AsyncStorage.getItem(LEGACY_KEYS.bodyWeight);
    if (legacyBw && !await AsyncStorage.getItem(KEYS.bodyWeight)) {
      await AsyncStorage.setItem(KEYS.bodyWeight, legacyBw);
    }
    // Records — migrate shape
    const legacyRec = await AsyncStorage.getItem(LEGACY_KEYS.records);
    const existingRec = await AsyncStorage.getItem(KEYS.records);
    const source = existingRec || legacyRec;
    if (source) {
      const parsed = JSON.parse(source);
      const migrated = parsed.map(migrateRecord);
      await AsyncStorage.setItem(KEYS.records, JSON.stringify(migrated));
    }
  }

  await AsyncStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION));
}

// ── Public API ────────────────────────────────────────────────────────────────

let migrationDone = false;

async function ensureMigrated() {
  if (!migrationDone) {
    await migrate();
    migrationDone = true;
  }
}

export async function loadExercises() {
  await ensureMigrated();
  const stored = await AsyncStorage.getItem(KEYS.exercises);
  if (!stored) {
    await AsyncStorage.setItem(KEYS.exercises, JSON.stringify(DEFAULT_EXERCISES));
    return DEFAULT_EXERCISES;
  }
  return JSON.parse(stored);
}

export async function loadRecords() {
  await ensureMigrated();
  const stored = await AsyncStorage.getItem(KEYS.records);
  return stored ? JSON.parse(stored) : [];
}

export async function saveRecords(records) {
  await AsyncStorage.setItem(KEYS.records, JSON.stringify(records));
}

export async function loadBodyWeight() {
  await ensureMigrated();
  const stored = await AsyncStorage.getItem(KEYS.bodyWeight);
  return stored ? parseFloat(stored) : 80;
}

export async function saveBodyWeight(kg) {
  await AsyncStorage.setItem(KEYS.bodyWeight, String(kg));
}

export async function loadBWExercises() {
  await ensureMigrated();
  const stored = await AsyncStorage.getItem(KEYS.bwEx);
  return stored ? new Set(JSON.parse(stored)) : new Set(DEFAULT_BW_EX);
}

export async function saveBWExercises(set) {
  await AsyncStorage.setItem(KEYS.bwEx, JSON.stringify([...set]));
}

export async function loadMyGym() {
  const stored = await AsyncStorage.getItem(KEYS.myGym);
  return stored ? JSON.parse(stored) : null;
}

export async function saveMyGym(gym) {
  await AsyncStorage.setItem(KEYS.myGym, JSON.stringify(gym));
}

export async function loadProfile() {
  const stored = await AsyncStorage.getItem(KEYS.profile);
  return stored ? JSON.parse(stored) : {
    // userId will be assigned by backend on first sync
    userId:   null,
    name:     '',
    gym:      '',
    location: '',
    photo:    null,
    weight:   null,   // kg
    age:      null,
    bio:      '',
    link:     '',
  };
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}
