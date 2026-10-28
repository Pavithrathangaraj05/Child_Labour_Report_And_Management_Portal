import axios, { AxiosError } from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setSessionLostHandler = (fn: () => void) => { onSessionLost = fn; };

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

// On 401, refresh once (single in-flight request), then replay.
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (err: AxiosError) => {
  const cfg: any = err.config;
  const isAuthCall = cfg?.url?.startsWith('/auth/');
  if (err.response?.status === 401 && cfg && !cfg._retried && !isAuthCall && accessToken) {
    cfg._retried = true;
    try {
      refreshing ??= api.post('/auth/refresh').then((r) => r.data.accessToken as string).finally(() => { refreshing = null; });
      accessToken = await refreshing;
      cfg.headers.Authorization = `Bearer ${accessToken}`;
      return api(cfg);
    } catch { accessToken = null; onSessionLost?.(); }
  }
  throw err;
});

export function errorMessage(e: unknown): string {
  const ax = e as AxiosError<any>;
  if (ax?.response?.data?.error) {
    const { message, details } = ax.response.data.error;
    if (Array.isArray(details) && details.length) return `${message}: ${details.map((d: any) => d.message).join('; ')}`;
    return message;
  }
  if (ax?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}
export const errorStatus = (e: unknown) => (e as AxiosError)?.response?.status;
