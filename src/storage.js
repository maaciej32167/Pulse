import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  exercises: 'sila_exercises',
  records:   'sila_records',
  lastEx:    'sila_last_ex',
  bodyWeight:'sila_body_weight_kg',
  bwHistory: 'sila_body_weight_history',
  bwEx:      'sila_bw_exercises',
  myGym:     'pulse_my_gym',
  profile:   'pulse_profile',
};

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

export async function loadExercises() {
  const stored = await AsyncStorage.getItem(KEYS.exercises);
  if (!stored) {
    await AsyncStorage.setItem(KEYS.exercises, JSON.stringify(DEFAULT_EXERCISES));
    return DEFAULT_EXERCISES;
  }
  return JSON.parse(stored);
}

export async function loadRecords() {
  const stored = await AsyncStorage.getItem(KEYS.records);
  return stored ? JSON.parse(stored) : [];
}

export async function saveRecords(records) {
  await AsyncStorage.setItem(KEYS.records, JSON.stringify(records));
}

export async function loadBodyWeight() {
  const stored = await AsyncStorage.getItem(KEYS.bodyWeight);
  return stored ? parseFloat(stored) : 80;
}

export async function loadBWExercises() {
  const stored = await AsyncStorage.getItem(KEYS.bwEx);
  return stored ? new Set(JSON.parse(stored)) : new Set(DEFAULT_BW_EX);
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
  return stored ? JSON.parse(stored) : { name: '', gym: '', location: '', photo: null };
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}
