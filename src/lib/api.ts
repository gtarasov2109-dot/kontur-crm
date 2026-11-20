import { BeautyClientRow, BeautyMasterRow, SpecializationId } from '../types/crm';
import { FREE_CLIENTS_LIMIT } from '../data/specializations';
import { ensureISODateYYYYMMDD } from '../utils/formatters';

export const SUPABASE_BASE_URL = 'https://sufurbgmbllxjlqdnybn.supabase.co';
const SUPABASE_API_KEY = 'sb_publishable_DPMIU24eWSc9RLhxAcGAXw_41_vhzqw';

export interface SyncStatusInfo {
  ok: boolean;
  endpoint: '/rest/v1/beauty_masters' | '/rest/v1/beauty_clients';
  status: number | null;
  message: string;
  updatedAt: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  master?: BeautyMasterRow;
}

interface LocalAccountRecord {
  id: string; // persistent studioUuid
  email: string;
  password: string;
  studio_name: string;
  specialization: SpecializationId;
  is_pro: boolean;
  created_at: string;
  remote_synced?: boolean;
}

interface LocalClientRecord extends BeautyClientRow {
  _pendingSync?: boolean;
}

const ACCOUNTS_KEY = 'kontur_accounts';
const ACTIVE_SESSION_KEY = 'kontur_active_session';
const STUDIO_UUID_KEY_PREFIX = 'kontur_studio_uuid_';
const CLIENTS_KEY_PREFIX = 'kontur_clients_';
const DELETED_CLIENTS_KEY_PREFIX = 'kontur_deleted_clients_';
const SYNC_STATUS_KEY_PREFIX = 'kontur_sync_status_';
const SYNC_TIMEOUT_MS = 5000;

let memoryActiveSession: string | null = null;
const memoryStore = new Map<string, string>();
const syncListeners = new Set<(status: SyncStatusInfo | null) => void>();

function syncStatusStorageKey(email: string): string {
  return `${SYNC_STATUS_KEY_PREFIX}${normalizeEmail(email)}`;
}

export function getLastSyncStatus(): SyncStatusInfo | null {
  const session = getStoredSession();
  if (!session?.user?.email) return null;
  try {
    const raw = readStorage(syncStatusStorageKey(session.user.email));
    if (!raw) return null;
    return JSON.parse(raw) as SyncStatusInfo;
  } catch {
    return null;
  }
}

export function subscribeSyncStatus(
  listener: (status: SyncStatusInfo | null) => void
): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function recordSyncStatus(email: string, info: SyncStatusInfo): void {
  writeStorage(syncStatusStorageKey(email), JSON.stringify(info));
  const current = getStoredSession();
  if (current && normalizeEmail(current.user.email) === normalizeEmail(email)) {
    syncListeners.forEach((fn) => fn(info));
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, value);
      window.localStorage.setItem(key, value);
    }
  } catch {
    if (value === null) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, value);
    }
  }
}

function getOrCreatePersistentStudioUuid(email: string, preferredId?: string): string {
  const key = `${STUDIO_UUID_KEY_PREFIX}${normalizeEmail(email)}`;
  const stored = readStorage(key);
  if (stored && stored.trim()) {
    return stored.trim();
  }
  const nextUuid = preferredId && preferredId.trim() ? preferredId.trim() : generateUuid();
  writeStorage(key, nextUuid);
  return nextUuid;
}

function persistStudioUuid(email: string, uuid: string): void {
  const key = `${STUDIO_UUID_KEY_PREFIX}${normalizeEmail(email)}`;
  writeStorage(key, uuid);
}

function loadAccountsMap(): Record<string, LocalAccountRecord> {
  try {
    const raw = readStorage(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, LocalAccountRecord>;
  } catch {
    return {};
  }
}

function saveAccountsMap(map: Record<string, LocalAccountRecord>): void {
  writeStorage(ACCOUNTS_KEY, JSON.stringify(map));
}

function getAccountByEmail(email: string): LocalAccountRecord | null {
  const key = normalizeEmail(email);
  if (!key) return null;
  const map = loadAccountsMap();
  return map[key] || null;
}

function upsertAccountRecord(record: LocalAccountRecord): void {
  const key = normalizeEmail(record.email);
  if (!key) return;
  persistStudioUuid(key, record.id);
  const map = loadAccountsMap();
  map[key] = { ...record, email: key };
  saveAccountsMap(map);
}

function accountToMaster(account: LocalAccountRecord): BeautyMasterRow {
  return {
    id: account.id,
    email: account.email,
    studio_name: account.studio_name,
    specialization: account.specialization,
    is_pro: Boolean(account.is_pro),
    created_at: account.created_at,
  };
}

function accountToSession(account: LocalAccountRecord): AuthSession {
  return {
    access_token: `local_${account.id}`,
    refresh_token: '',
    user: {
      id: account.id,
      email: account.email,
    },
    master: accountToMaster(account),
  };
}

function clientsStorageKey(email: string): string {
  return `${CLIENTS_KEY_PREFIX}${normalizeEmail(email)}`;
}

function deletedClientsStorageKey(email: string): string {
  return `${DELETED_CLIENTS_KEY_PREFIX}${normalizeEmail(email)}`;
}

function loadLocalClients(email: string): LocalClientRecord[] {
  try {
    const raw = readStorage(clientsStorageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalClientRecord[];
  } catch {
    return [];
  }
}

function saveLocalClients(email: string, clients: LocalClientRecord[]): void {
  const sorted = [...clients].sort((a, b) =>
    (a.next_visit_date || '').localeCompare(b.next_visit_date || '')
  );
  writeStorage(clientsStorageKey(email), JSON.stringify(sorted));
}

function loadDeletedClientIds(email: string): string[] {
  try {
    const raw = readStorage(deletedClientsStorageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveDeletedClientIds(email: string, ids: string[]): void {
  writeStorage(
    deletedClientsStorageKey(email),
    JSON.stringify(Array.from(new Set(ids)))
  );
}

function stripLocalFlags(client: LocalClientRecord): BeautyClientRow {
  const { _pendingSync: _, ...rest } = client;
  return rest;
}

export function getStoredSession(): AuthSession | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    raw = memoryActiveSession;
  }
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user?.id || !parsed?.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession | null): void {
  if (!session) {
    memoryActiveSession = null;
    writeStorage(ACTIVE_SESSION_KEY, null);
    writeStorage('kontur_current_user', null);
    writeStorage('kontur_api_session_v1', null);
    return;
  }
  const serialized = JSON.stringify(session);
  memoryActiveSession = serialized;
  writeStorage(ACTIVE_SESSION_KEY, serialized);
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function buildSupabaseHeaders(includePreferUpsert = false): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_API_KEY,
    Authorization: `Bearer ${SUPABASE_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (includePreferUpsert) {
    headers.Prefer = 'return=representation,resolution=merge-duplicates';
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = SYNC_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getCurrentAccountOrThrow(): LocalAccountRecord {
  const session = getStoredSession();
  if (!session?.user?.email) {
    throw new ApiError('Требуется авторизация', 401);
  }

  const email = normalizeEmail(session.user.email);
  const existing = getAccountByEmail(email);
  if (existing) {
    persistStudioUuid(email, existing.id);
    return existing;
  }

  const studioUuid = getOrCreatePersistentStudioUuid(email, session.user.id);
  const fallback: LocalAccountRecord = {
    id: studioUuid,
    email,
    password: '',
    studio_name: session.master?.studio_name || 'Моя студия',
    specialization: session.master?.specialization || 'nails',
    is_pro: Boolean(session.master?.is_pro),
    created_at: session.master?.created_at || new Date().toISOString(),
  };
  upsertAccountRecord(fallback);
  return fallback;
}

function refreshStoredSessionFromAccount(account: LocalAccountRecord): void {
  const current = getStoredSession();
  if (current && normalizeEmail(current.user.email) === normalizeEmail(account.email)) {
    saveStoredSession(accountToSession(account));
  }
}

// ============================================================================
// DIRECT SUPABASE REST API SYNC (NO /auth/v1/signup WAIT, NEVER THROWS TO UI)
// ============================================================================

async function extractRestErrorText(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw) return `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const parts = [
        parsed.code ? `[${parsed.code}]` : '',
        typeof parsed.error === 'string' ? parsed.error : '',
        typeof parsed.message === 'string' ? parsed.message : '',
        typeof parsed.details === 'string' ? parsed.details : '',
        typeof parsed.hint === 'string' ? `(${parsed.hint})` : '',
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : raw;
    } catch {
      return raw;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function syncMasterToSupabase(
  account: LocalAccountRecord
): Promise<{ account: LocalAccountRecord; ok: boolean }> {
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const endpoint = '/rest/v1/beauty_masters' as const;

  try {
    const res = await fetch(`${SUPABASE_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: buildSupabaseHeaders(true),
      body: JSON.stringify({
        id: studioUuid,
        email: account.email,
        studio_name: account.studio_name,
        specialization: account.specialization,
        is_pro: Boolean(account.is_pro),
      }),
    });

    if (res.ok) {
      const updated: LocalAccountRecord = {
        ...account,
        id: studioUuid,
        remote_synced: true,
      };
      upsertAccountRecord(updated);
      refreshStoredSessionFromAccount(updated);
      recordSyncStatus(account.email, {
        ok: true,
        endpoint,
        status: res.status,
        message: 'SYNC OK',
        updatedAt: new Date().toISOString(),
      });
      return { account: updated, ok: true };
    }

    const detail = await extractRestErrorText(res);
    recordSyncStatus(account.email, {
      ok: false,
      endpoint,
      status: res.status,
      message: `HTTP ${res.status}: ${detail}`,
      updatedAt: new Date().toISOString(),
    });
    return { account, ok: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    recordSyncStatus(account.email, {
      ok: false,
      endpoint,
      status: null,
      message: errMsg || 'Network error',
      updatedAt: new Date().toISOString(),
    });
    return { account, ok: false };
  }
}

async function syncClientUpsertToSupabase(
  account: LocalAccountRecord,
  client: LocalClientRecord
): Promise<boolean> {
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const endpoint = '/rest/v1/beauty_clients' as const;

  try {
    const cleanClient = stripLocalFlags(client);
    const payload: BeautyClientRow = {
      id: cleanClient.id,
      master_id: studioUuid,
      name: cleanClient.name,
      phone: cleanClient.phone,
      last_service: cleanClient.last_service,
      formula_note: cleanClient.formula_note,
      price: cleanClient.price,
      return_days: cleanClient.return_days,
      last_visit_date: ensureISODateYYYYMMDD(cleanClient.last_visit_date),
      next_visit_date: ensureISODateYYYYMMDD(cleanClient.next_visit_date),
      status: cleanClient.status,
      total_spent: cleanClient.total_spent,
    };

    const res = await fetch(`${SUPABASE_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: buildSupabaseHeaders(true),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const localList = loadLocalClients(account.email);
      const nextList = localList.map((item) =>
        item.id === client.id
          ? {
              ...item,
              master_id: studioUuid,
              last_visit_date: payload.last_visit_date,
              next_visit_date: payload.next_visit_date,
              _pendingSync: false,
            }
          : item
      );
      saveLocalClients(account.email, nextList);
      recordSyncStatus(account.email, {
        ok: true,
        endpoint,
        status: res.status,
        message: 'SYNC OK',
        updatedAt: new Date().toISOString(),
      });
      return true;
    }

    const detail = await extractRestErrorText(res);
    recordSyncStatus(account.email, {
      ok: false,
      endpoint,
      status: res.status,
      message: `HTTP ${res.status}: ${detail}`,
      updatedAt: new Date().toISOString(),
    });
    return false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    recordSyncStatus(account.email, {
      ok: false,
      endpoint,
      status: null,
      message: errMsg || 'Network error',
      updatedAt: new Date().toISOString(),
    });
    return false;
  }
}

async function syncClientDeleteToSupabase(
  account: LocalAccountRecord,
  clientId: string
): Promise<void> {
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);

  try {
    const res = await fetch(
      `${SUPABASE_BASE_URL}/rest/v1/beauty_clients?id=eq.${encodeURIComponent(
        clientId
      )}&master_id=eq.${encodeURIComponent(studioUuid)}`,
      {
        method: 'DELETE',
        headers: buildSupabaseHeaders(),
      }
    );

    if (res.ok) {
      const remainingDeletes = loadDeletedClientIds(account.email).filter(
        (id) => id !== clientId
      );
      saveDeletedClientIds(account.email, remainingDeletes);
    }
  } catch {
    // silent background failure
  }
}

let inFlightSync: Promise<{
  master: BeautyMasterRow;
  clients: BeautyClientRow[];
} | null> | null = null;

export async function apiBackgroundSync(): Promise<{
  master: BeautyMasterRow;
  clients: BeautyClientRow[];
} | null> {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    const session = getStoredSession();
    if (!session?.user?.email) return null;

    try {
      let account = getCurrentAccountOrThrow();
      const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);

      // 1. Ensure master row exists in beauty_masters via direct REST POST
      const masterSync = await syncMasterToSupabase(account);
      account = masterSync.account;
      const masterOk = masterSync.ok;

      // Check latest remote master row (e.g. if is_pro was upgraded in Supabase)
      try {
        const masterRes = await fetch(
          `${SUPABASE_BASE_URL}/rest/v1/beauty_masters?id=eq.${encodeURIComponent(
            studioUuid
          )}&select=*`,
          {
            method: 'GET',
            headers: buildSupabaseHeaders(),
          }
        );
        if (masterRes.ok) {
          const rows = (await parseJsonSafe(masterRes)) as BeautyMasterRow[] | null;
          if (Array.isArray(rows) && rows[0]) {
            account = {
              ...account,
              is_pro: Boolean(rows[0].is_pro),
            };
            upsertAccountRecord(account);
            refreshStoredSessionFromAccount(account);
          }
        }
      } catch {
        // silent
      }

      // 2. Push pending deletions
      const deletedIds = loadDeletedClientIds(account.email);
      for (const delId of deletedIds) {
        await syncClientDeleteToSupabase(account, delId);
      }

      // 3. Push any locally unsynced clients directly to beauty_clients
      const localClients = loadLocalClients(account.email);
      let clientWriteFailed = false;
      for (const item of localClients) {
        if (item._pendingSync) {
          const ok = await syncClientUpsertToSupabase(account, item);
          if (!ok) clientWriteFailed = true;
        }
      }

      // 4. Pull remote clients by master_id = studioUuid directly from Supabase REST
      const listRes = await fetch(
        `${SUPABASE_BASE_URL}/rest/v1/beauty_clients?master_id=eq.${encodeURIComponent(
          studioUuid
        )}&select=*&order=next_visit_date.asc`,
        {
          method: 'GET',
          headers: buildSupabaseHeaders(),
        }
      );

      if (!listRes.ok) {
        if (masterOk && !clientWriteFailed) {
          const detail = await extractRestErrorText(listRes);
          recordSyncStatus(account.email, {
            ok: false,
            endpoint: '/rest/v1/beauty_clients',
            status: listRes.status,
            message: `HTTP ${listRes.status}: ${detail}`,
            updatedAt: new Date().toISOString(),
          });
        }
        return null;
      }

    const remoteClients = (await parseJsonSafe(listRes)) as BeautyClientRow[] | null;
    if (!Array.isArray(remoteClients)) {
      return null;
    }

    const latestLocal = loadLocalClients(account.email).filter(
      (c) => c.master_id === studioUuid
    );
    const pendingDeletesSet = new Set(loadDeletedClientIds(account.email));
    const localById = new Map(latestLocal.map((c) => [c.id, c]));
    const mergedMap = new Map<string, LocalClientRecord>();

    for (const remote of remoteClients) {
      if (remote.master_id !== studioUuid) continue;
      if (pendingDeletesSet.has(remote.id)) continue;
      const localVersion = localById.get(remote.id);
      if (localVersion && localVersion._pendingSync) {
        mergedMap.set(remote.id, localVersion);
      } else {
        mergedMap.set(remote.id, {
          ...remote,
          master_id: studioUuid,
          _pendingSync: false,
        });
      }
    }

    for (const local of latestLocal) {
      if (!mergedMap.has(local.id) && !pendingDeletesSet.has(local.id)) {
        mergedMap.set(local.id, { ...local, master_id: studioUuid });
      }
    }

    const mergedList = Array.from(mergedMap.values());
    saveLocalClients(account.email, mergedList);

    // Ensure session wasn't logged out while sync ran
    const activeAfterSync = getStoredSession();
    if (
      !activeAfterSync ||
      normalizeEmail(activeAfterSync.user.email) !== normalizeEmail(account.email)
    ) {
      return null;
    }

    return {
      master: accountToMaster(account),
      clients: mergedList.map(stripLocalFlags),
    };
  } catch {
    return null;
  } finally {
    inFlightSync = null;
  }
  })();

  return inFlightSync;
}

// ============================================================================
// PUBLIC LOCAL-FIRST API (INSTANT, DIRECT REST SYNC, NEVER BLOCKS UI)
// ============================================================================

export async function apiSignup(payload: {
  email: string;
  password: string;
  studio_name: string;
  specialization: SpecializationId;
}): Promise<{
  session: AuthSession;
  master: BeautyMasterRow;
  requiresEmailConfirmation: boolean;
}> {
  const email = normalizeEmail(payload.email);
  const existing = getAccountByEmail(email);

  if (existing) {
    if (existing.password === payload.password) {
      const studioUuid = getOrCreatePersistentStudioUuid(email, existing.id);
      const syncedAccount: LocalAccountRecord = { ...existing, id: studioUuid };
      upsertAccountRecord(syncedAccount);
      const session = accountToSession(syncedAccount);
      saveStoredSession(session);

      void apiBackgroundSync();

      return {
        session,
        master: accountToMaster(syncedAccount),
        requiresEmailConfirmation: false,
      };
    }
    throw new ApiError(
      'Студия с таким email уже создана. Выполните вход или проверьте пароль.',
      409
    );
  }

  const studioUuid = getOrCreatePersistentStudioUuid(email);
  const newAccount: LocalAccountRecord = {
    id: studioUuid,
    email,
    password: payload.password,
    studio_name: payload.studio_name.trim(),
    specialization: payload.specialization,
    is_pro: false,
    created_at: new Date().toISOString(),
    remote_synced: false,
  };

  upsertAccountRecord(newAccount);
  const session = accountToSession(newAccount);
  saveStoredSession(session);

  // Trigger sync attempt automatically on register
  void apiBackgroundSync();

  return {
    session,
    master: accountToMaster(newAccount),
    requiresEmailConfirmation: false,
  };
}

export async function apiLogin(payload: {
  email: string;
  password: string;
  pendingProfile?: { studioName: string; specialization: SpecializationId };
}): Promise<{
  session: AuthSession;
  master: BeautyMasterRow;
}> {
  const email = normalizeEmail(payload.email);
  const existing = getAccountByEmail(email);

  // 1. Instant local-first login when account exists in localStorage
  if (existing) {
    if (existing.password === payload.password || !existing.password) {
      const studioUuid = getOrCreatePersistentStudioUuid(email, existing.id);
      const account: LocalAccountRecord = {
        ...existing,
        id: studioUuid,
        password: existing.password || payload.password,
      };
      upsertAccountRecord(account);

      const session = accountToSession(account);
      saveStoredSession(session);

      // Trigger sync attempt automatically on login
      void apiBackgroundSync();

      return {
        session,
        master: accountToMaster(account),
      };
    }

    throw new ApiError(
      'Неверный email или пароль. Проверьте данные и попробуйте снова.',
      401
    );
  }

  // 2. Account not yet cached locally: check beauty_masters by email first (if reachable),
  // otherwise generate persistent studioUuid and upsert directly to beauty_masters
  let remoteMaster: BeautyMasterRow | null = null;
  try {
    const masterRes = await fetchWithTimeout(
      `${SUPABASE_BASE_URL}/rest/v1/beauty_masters?email=eq.${encodeURIComponent(
        email
      )}&select=*`,
      {
        method: 'GET',
        headers: buildSupabaseHeaders(),
      }
    );
    if (masterRes.ok) {
      const rows = (await parseJsonSafe(masterRes)) as BeautyMasterRow[] | null;
      if (Array.isArray(rows) && rows[0]) {
        remoteMaster = rows[0];
      }
    }
  } catch {
    // Network unreachable -> continue silently with local UUID generation
  }

  const studioUuid = getOrCreatePersistentStudioUuid(email, remoteMaster?.id);
  const account: LocalAccountRecord = {
    id: studioUuid,
    email,
    password: payload.password,
    studio_name:
      remoteMaster?.studio_name ||
      payload.pendingProfile?.studioName ||
      email.split('@')[0] ||
      'Моя студия',
    specialization:
      remoteMaster?.specialization ||
      payload.pendingProfile?.specialization ||
      'nails',
    is_pro: Boolean(remoteMaster?.is_pro),
    created_at: remoteMaster?.created_at || new Date().toISOString(),
    remote_synced: Boolean(remoteMaster),
  };

  upsertAccountRecord(account);
  const session = accountToSession(account);
  saveStoredSession(session);

  // Trigger sync attempt automatically on login
  void apiBackgroundSync();

  return {
    session,
    master: accountToMaster(account),
  };
}

export function apiLogout(): void {
  saveStoredSession(null);
  syncListeners.forEach((fn) => fn(null));
}

export async function apiGetProfile(): Promise<BeautyMasterRow> {
  const account = getCurrentAccountOrThrow();
  return accountToMaster(account);
}

export async function apiUpdateProfile(patch: {
  studio_name?: string;
  specialization?: SpecializationId;
}): Promise<BeautyMasterRow> {
  const account = getCurrentAccountOrThrow();
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const updated: LocalAccountRecord = {
    ...account,
    id: studioUuid,
    studio_name:
      patch.studio_name !== undefined ? patch.studio_name : account.studio_name,
    specialization:
      patch.specialization !== undefined
        ? patch.specialization
        : account.specialization,
    remote_synced: false,
  };

  upsertAccountRecord(updated);
  refreshStoredSessionFromAccount(updated);

  // Directly upsert updated master row to beauty_masters
  void syncMasterToSupabase(updated);

  return accountToMaster(updated);
}

export async function apiListClients(): Promise<BeautyClientRow[]> {
  const account = getCurrentAccountOrThrow();
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const local = loadLocalClients(account.email).filter(
    (c) => c.master_id === studioUuid
  );
  return local.map(stripLocalFlags);
}

export async function apiCreateClient(payload: {
  name: string;
  phone: string;
  last_service: string;
  formula_note: string | null;
  price: number;
  return_days: number;
  last_visit_date: string;
  next_visit_date: string;
  status: string;
  total_spent: number;
}): Promise<BeautyClientRow> {
  const account = getCurrentAccountOrThrow();
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const existingClients = loadLocalClients(account.email);

  if (!account.is_pro && existingClients.length >= FREE_CLIENTS_LIMIT) {
    throw new ApiError(
      'Достигнут лимит в 10 клиентов на тарифе БАЗОВЫЙ',
      402,
      'FREE_LIMIT_REACHED'
    );
  }

  const newRecord: LocalClientRecord = {
    id: generateUuid(),
    master_id: studioUuid,
    name: payload.name,
    phone: payload.phone,
    last_service: payload.last_service,
    formula_note: payload.formula_note,
    price: payload.price,
    return_days: payload.return_days,
    last_visit_date: ensureISODateYYYYMMDD(payload.last_visit_date),
    next_visit_date: ensureISODateYYYYMMDD(payload.next_visit_date),
    status: payload.status,
    total_spent: payload.total_spent,
    created_at: new Date().toISOString(),
    _pendingSync: true,
  };

  saveLocalClients(account.email, [newRecord, ...existingClients]);

  // Directly POST to /rest/v1/beauty_clients with master_id = studioUuid
  void syncClientUpsertToSupabase(account, newRecord);

  return stripLocalFlags(newRecord);
}

export async function apiUpdateClient(
  id: string,
  patch: Partial<Omit<BeautyClientRow, 'id' | 'master_id'>>
): Promise<BeautyClientRow> {
  const account = getCurrentAccountOrThrow();
  const studioUuid = getOrCreatePersistentStudioUuid(account.email, account.id);
  const existingClients = loadLocalClients(account.email);
  const idx = existingClients.findIndex((c) => c.id === id);

  if (idx === -1) {
    throw new ApiError('Клиент не найден', 404);
  }

  const normalizedPatch = {
    ...patch,
    ...(patch.last_visit_date !== undefined
      ? { last_visit_date: ensureISODateYYYYMMDD(patch.last_visit_date) }
      : {}),
    ...(patch.next_visit_date !== undefined
      ? { next_visit_date: ensureISODateYYYYMMDD(patch.next_visit_date) }
      : {}),
  };

  const updatedRecord: LocalClientRecord = {
    ...existingClients[idx],
    ...normalizedPatch,
    master_id: studioUuid,
    _pendingSync: true,
  };

  const nextList = [...existingClients];
  nextList[idx] = updatedRecord;
  saveLocalClients(account.email, nextList);

  // Directly POST (merge-duplicates) to /rest/v1/beauty_clients with master_id = studioUuid
  void syncClientUpsertToSupabase(account, updatedRecord);

  return stripLocalFlags(updatedRecord);
}

export async function apiDeleteClient(id: string): Promise<void> {
  const account = getCurrentAccountOrThrow();
  const existingClients = loadLocalClients(account.email);
  const nextList = existingClients.filter((c) => c.id !== id);
  saveLocalClients(account.email, nextList);

  const deletedIds = loadDeletedClientIds(account.email);
  saveDeletedClientIds(account.email, [...deletedIds, id]);

  // Direct background delete on public.beauty_clients
  void syncClientDeleteToSupabase(account, id);
}
