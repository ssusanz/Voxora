import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEET_FUTURE_STORAGE_KEY = 'voxora_meet_future_plans_v1';

export type FuturePlanKind = 'trip' | 'birthday' | 'party' | 'gathering';

export type FuturePlanEntry = {
  id: string;
  authorLabel: string;
  text: string;
  createdAt: string;
  source: 'text' | 'voice';
};

export type FuturePlan = {
  id: string;
  kind: FuturePlanKind;
  title: string;
  dateLabel: string;
  status: 'brainstorm' | 'locked';
  entries?: FuturePlanEntry[];
  summary?: string;
  summaryUpdatedAt?: string;
};

export async function loadFuturePlans(): Promise<FuturePlan[]> {
  try {
    const raw = await AsyncStorage.getItem(MEET_FUTURE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is FuturePlan => typeof x === 'object' && x !== null && typeof (x as FuturePlan).id === 'string');
  } catch {
    return [];
  }
}

export async function saveFuturePlans(plans: FuturePlan[]): Promise<void> {
  await AsyncStorage.setItem(MEET_FUTURE_STORAGE_KEY, JSON.stringify(plans));
}

export async function getFuturePlanById(id: string): Promise<FuturePlan | null> {
  const plans = await loadFuturePlans();
  return plans.find((p) => p.id === id) ?? null;
}

export async function updateFuturePlan(id: string, updater: (prev: FuturePlan) => FuturePlan): Promise<void> {
  const plans = await loadFuturePlans();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx < 0) return;
  plans[idx] = updater(plans[idx]);
  await saveFuturePlans(plans);
}
