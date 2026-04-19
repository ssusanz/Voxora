import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from '@/utils/backend';

export const MEET_FUTURE_STORAGE_KEY = 'voxora_meet_future_plans_v1';

export type FuturePlanKind = 'trip' | 'birthday' | 'party' | 'gathering';

export type FuturePlanEntry = {
  id: string;
  authorLabel: string;
  text: string;
  createdAt: string;
  source: 'text' | 'voice';
};

/** 从家人发言提炼的待办（可勾选完成） */
export type FuturePlanTodo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  /** 由哪条留言生成 */
  sourceEntryId?: string;
};

export type FuturePlan = {
  id: string;
  kind: FuturePlanKind;
  title: string;
  dateLabel: string;
  status: 'brainstorm' | 'locked';
  entries?: FuturePlanEntry[];
  todos?: FuturePlanTodo[];
  summary?: string;
  summaryUpdatedAt?: string;
};

const KIND_ORDER: FuturePlanKind[] = ['trip', 'birthday', 'party', 'gathering'];

function normalizePlanRow(x: FuturePlan): FuturePlan {
  return {
    ...x,
    kind: KIND_ORDER.includes(x.kind) ? x.kind : 'gathering',
    entries: Array.isArray(x.entries) ? x.entries : [],
    todos: Array.isArray(x.todos) ? x.todos : [],
  };
}

export function normalizeFuturePlans(list: FuturePlan[]): FuturePlan[] {
  return list.map(normalizePlanRow);
}

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

/** 将当前列表 PUT 到服务端（失败静默，仅离线使用本机数据） */
export async function pushFuturePlansToServer(plans: FuturePlan[]): Promise<boolean> {
  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/v1/future-plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 进入「遇见未来」时调用：优先拉取服务端；服务端为空且本机有数据时，自动把本机数据种到服务端。
 * 服务端有数据时写回本机 AsyncStorage，与多设备「以服务端为准」对齐（MVP：末次 PUT 覆盖）。
 */
export async function syncFuturePlansWithServer(): Promise<FuturePlan[]> {
  const local = normalizeFuturePlans(await loadFuturePlans());

  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/v1/future-plans`);
    if (!res.ok) {
      return local;
    }
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; plans?: unknown };
    if (!json.ok || !Array.isArray(json.plans)) {
      return local;
    }
    const remote = normalizeFuturePlans(json.plans as FuturePlan[]);

    if (remote.length > 0) {
      await AsyncStorage.setItem(MEET_FUTURE_STORAGE_KEY, JSON.stringify(remote));
      return remote;
    }
    if (local.length > 0) {
      await pushFuturePlansToServer(local);
    }
    return local;
  } catch {
    return local;
  }
}

export async function saveFuturePlans(plans: FuturePlan[]): Promise<void> {
  await AsyncStorage.setItem(MEET_FUTURE_STORAGE_KEY, JSON.stringify(plans));
  void pushFuturePlansToServer(plans).catch(() => {
    /* 离线或后端未开：仅本机保存 */
  });
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
