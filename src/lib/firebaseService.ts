import { database } from './firebase';
import { ref, set, get, onValue, off, push, update, remove, DataSnapshot } from 'firebase/database';

// Temporary localStorage-based service until Firebase is properly installed
export interface Team {
  id: number;
  leader: string;
  members: string[];
}

export interface SwapRequest {
  id: number;
  fromTeamId: number;
  toTeamId: number;
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface WorshipScheduleData {
  teams: Team[];
  swapRequests: SwapRequest[];
  manualOverrides: { [date: string]: number };
}

const TEAMS_PATH = 'teams';
const SWAPS_PATH = 'swapRequests';
const MANUAL_OVERRIDES_PATH = 'manualOverrides';

// Helper: fallback to localStorage if Firebase fails
const useLocalStorageFallback = (fn: Function) => async (...args: any[]) => {
  try {
    return await fn(...args);
  } catch (error) {
    // fallback logic (localStorage)
    if (fn.name.startsWith('saveTeams')) {
      localStorage.setItem('worship-teams', JSON.stringify(args[0]));
      return true;
    }
    if (fn.name.startsWith('getTeams')) {
      const saved = localStorage.getItem('worship-teams');
      return saved ? JSON.parse(saved) : [];
    }
    if (fn.name.startsWith('saveSwapRequests')) {
      localStorage.setItem('swap-requests', JSON.stringify(args[0]));
      return true;
    }
    if (fn.name.startsWith('getSwapRequests')) {
      const saved = localStorage.getItem('swap-requests');
      return saved ? JSON.parse(saved) : [];
    }
    if (fn.name.startsWith('saveManualOverrides')) {
      localStorage.setItem('manual-overrides', JSON.stringify(args[0]));
      return true;
    }
    if (fn.name.startsWith('getManualOverrides')) {
      const saved = localStorage.getItem('manual-overrides');
      return saved ? JSON.parse(saved) : {};
    }
    return null;
  }
};

// Teams operations
export const saveTeams = useLocalStorageFallback(async (teams: Team[]) => {
  await set(ref(database, TEAMS_PATH), teams);
  return true;
});

export const getTeams = useLocalStorageFallback(async (): Promise<Team[]> => {
  const snapshot = await get(ref(database, TEAMS_PATH));
  return snapshot.exists() ? snapshot.val() : [];
});

// Swap requests operations
export const saveSwapRequests = useLocalStorageFallback(async (swapRequests: SwapRequest[]) => {
  await set(ref(database, SWAPS_PATH), swapRequests);
  return true;
});

export const getSwapRequests = useLocalStorageFallback(async (): Promise<SwapRequest[]> => {
  const snapshot = await get(ref(database, SWAPS_PATH));
  return snapshot.exists() ? snapshot.val() : [];
});

export const addSwapRequest = useLocalStorageFallback(async (swapRequest: SwapRequest) => {
  // Get current swap requests
  const current = await getSwapRequests();
  const newRequests = [...current, { ...swapRequest, id: Date.now() }];
  await saveSwapRequests(newRequests);
  return true;
});

export const updateSwapRequestStatus = useLocalStorageFallback(async (swapId: number, status: 'approved' | 'rejected') => {
  const current = await getSwapRequests();
  const updated = current.map((swap: SwapRequest) =>
    swap.id === swapId ? { ...swap, status } : swap
  );
  await saveSwapRequests(updated);
  return true;
});

// Manual overrides operations
export const saveManualOverrides = useLocalStorageFallback(async (manualOverrides: { [date: string]: number }) => {
  await set(ref(database, MANUAL_OVERRIDES_PATH), manualOverrides);
  return true;
});

export const getManualOverrides = useLocalStorageFallback(async (): Promise<{ [date: string]: number }> => {
  const snapshot = await get(ref(database, MANUAL_OVERRIDES_PATH));
  return snapshot.exists() ? snapshot.val() : {};
});

// Real-time listeners
export const subscribeToTeams = (callback: (teams: Team[]) => void) => {
  const dbRef = ref(database, TEAMS_PATH);
  const handler = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : []);
  };
  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
};

export const subscribeToSwapRequests = (callback: (swapRequests: SwapRequest[]) => void) => {
  const dbRef = ref(database, SWAPS_PATH);
  const handler = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : []);
  };
  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
};

export const subscribeToManualOverrides = (callback: (manualOverrides: { [date: string]: number }) => void) => {
  const dbRef = ref(database, MANUAL_OVERRIDES_PATH);
  const handler = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  };
  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
};

// Save all data at once
export const saveAllData = useLocalStorageFallback(async (data: WorshipScheduleData) => {
  await Promise.all([
    saveTeams(data.teams),
    saveSwapRequests(data.swapRequests),
    saveManualOverrides(data.manualOverrides)
  ]);
  return true;
});

// Get all data at once
export const getAllData = useLocalStorageFallback(async (): Promise<WorshipScheduleData> => {
  const [teams, swapRequests, manualOverrides] = await Promise.all([
    getTeams(),
    getSwapRequests(),
    getManualOverrides()
  ]);
  return {
    teams,
    swapRequests,
    manualOverrides
  };
});

export const getSongSchedule = async () => {
  const snapshot = await get(ref(database, 'songSchedule'));
  return snapshot.exists() ? snapshot.val() : {};
};

export const getUniqueSongs = async () => {
  const snapshot = await get(ref(database, 'uniqueSongs'));
  return snapshot.exists() ? snapshot.val() : {};
}; 