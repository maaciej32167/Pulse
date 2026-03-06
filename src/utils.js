export function estimate1RM(weight, reps) {
  weight = Number(weight); reps = Number(reps);
  if (weight <= 0 || reps <= 0) return null;
  if (reps >= 37) return null;
  return weight * (36 / (37 - reps));
}

export function round1(x) {
  return Math.round(x * 10) / 10;
}

export function effectiveWeight(record, bwExercises, bodyWeight) {
  if (bwExercises.has(record.exercise)) {
    return (record.bodyWeightKg || bodyWeight) + (Number(record.weight) || 0);
  }
  return Number(record.weight) || 0;
}

export function todayPL() {
  return new Date().toLocaleDateString('pl-PL');
}

export function generateId() {
  return Date.now();
}
