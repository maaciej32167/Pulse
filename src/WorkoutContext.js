import { createContext, useContext, useState } from 'react';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [activeWorkout, setActiveWorkout] = useState(null);
  // activeWorkout: { startTime, pausedAt, gym, sets: [], records: [] } | null
  const [workoutScreenVisible, setWorkoutScreenVisible] = useState(false);

  function startWorkout(gym, checkInTime) {
    setActiveWorkout({ startTime: checkInTime, pausedAt: null, gym, sets: [], records: [] });
  }

  function updateSets(sets, records) {
    setActiveWorkout(prev => prev ? { ...prev, sets, records } : prev);
  }

  function pauseWorkout() {
    setActiveWorkout(prev => prev ? { ...prev, pausedAt: Date.now() } : prev);
  }

  function resumeWorkout(explicitPausedAt) {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const pa = explicitPausedAt ?? prev.pausedAt;
      if (!pa) return prev;
      const pauseDuration = Date.now() - pa;
      return { ...prev, startTime: prev.startTime + pauseDuration, pausedAt: null };
    });
  }

  function clearWorkout() {
    setActiveWorkout(null);
  }

  return (
    <WorkoutContext.Provider value={{ activeWorkout, workoutScreenVisible, setWorkoutScreenVisible, startWorkout, updateSets, pauseWorkout, resumeWorkout, clearWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  return useContext(WorkoutContext);
}
