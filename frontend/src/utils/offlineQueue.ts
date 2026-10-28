import { api } from '../api/client';

export interface QueuedAction {
  id: string;
  type: string;
  url: string;
  method: 'POST' | 'PATCH' | 'PUT';
  data: any;
  timestamp: number;
}

const STORAGE_KEY = 'childsafe_offline_sync_queue';

export function getQueuedActions(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueuedActions(actions: QueuedAction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch (err) {
    console.error('Failed to save offline actions:', err);
  }
}

export function queueAction(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
  const list = getQueuedActions();
  list.push({
    ...action,
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  saveQueuedActions(list);
}

export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  const actions = getQueuedActions();
  if (actions.length === 0) return { synced: 0, remaining: 0 };

  const remaining: QueuedAction[] = [];
  let synced = 0;

  for (const act of actions) {
    try {
      if (act.method === 'POST') {
        await api.post(act.url, act.data);
      } else if (act.method === 'PATCH') {
        await api.patch(act.url, act.data);
      } else if (act.method === 'PUT') {
        await api.put(act.url, act.data);
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync queued action ${act.id}:`, err);
      remaining.push(act);
    }
  }

  saveQueuedActions(remaining);
  return { synced, remaining: remaining.length };
}
