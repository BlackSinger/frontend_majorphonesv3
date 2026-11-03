// Data layer of the MajorStealth Metrics admin page: the getDesktopUsageReport and getDesktopUsageStats contracts
// (majorphonesv3-backend/functions/src/desktopUsage), pagination, totals, trends and CSV.
// Totals always add numerators and denominators across accounts; rates and averages are computed at the end.

// A local test backend can replace the deployed functions only in `npm start`
const DEFAULT_API = 'https://us-central1-majorphonesv3.cloudfunctions.net';
export const USAGE_API = (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DESKTOP_USAGE_API) || DEFAULT_API;

export const USAGE_TIMEZONE = 'America/Caracas';
export const PAGE_SIZE = 200;
const MAX_PAGES = 500;

export const FAILURE_REASONS = ['proxy', 'connection', 'configuration', 'browser', 'unknown'] as const;
export const CLICK_TARGETS = ['virtualNumbers', 'hydraproxy', 'weproxy', 'catproxies'] as const;
export const CRASH_REASONS = ['renderer', 'gpu', 'utility', 'other'] as const;
export type FailureReason = typeof FAILURE_REASONS[number];
export type ClickTarget = typeof CLICK_TARGETS[number];
export type CrashReason = typeof CRASH_REASONS[number];

export const FAILURE_LABELS: { [key in FailureReason]: string } = {
  proxy: 'Proxy', connection: 'Connection', configuration: 'Configuration', browser: 'Browser', unknown: 'Unknown'
};
export const CLICK_LABELS: { [key in ClickTarget]: string } = {
  virtualNumbers: 'Virtual Numbers', hydraproxy: 'HydraProxy', weproxy: 'WeProxy', catproxies: 'CatProxies'
};
export const CRASH_LABELS: { [key in CrashReason]: string } = { renderer: 'Renderer', gpu: 'GPU', utility: 'Utility', other: 'Other' };
// Upper limits of launchDurationBuckets in metrics.js; the last bucket has none
export const LAUNCH_BUCKET_LABELS = ['< 1 s', '1–3 s', '3–10 s', '10–30 s', '30–60 s', '1–2 min', '2–5 min', '> 5 min'];

const COUNTERS = ['sessionStarts', 'sessionCompletions', 'completedSessionOpenMs', 'uncleanAppClosures',
  'launchAttempts', 'launchSucceeded', 'launchFailed', 'launchCancelled', 'launchDurationMs', 'launchDurationCount',
  'appProcessCrashes', 'browserCrashes', 'runtimeErrors', 'sessionsWithErrors', 'externalOpenFailures'] as const;
type Counter = typeof COUNTERS[number];

export type Counters = { [key in Counter]: number } & {
  launchDurationBuckets: number[];
  failures: { [key in FailureReason]: number };
  clicks: { [key in ClickTarget]: number };
  crashes: { [key in CrashReason]: number };
};

export interface DayAnalytics extends Counters {
  profilesCreated: number;
  profilesUsed: number;
  currentRunningProfiles: number;
  peakRunningProfiles: number;
}

export interface LifetimeAnalytics extends Counters {
  peakRunningProfiles: number;
  sessionDaysWithErrors: number;
}

export interface VersionStats {
  sessions: number;
  openMs: number;
  activeMs: number;
  launchSucceeded: number;
  launchFailed: number;
  crashes: number;
  launchDurationMs: number;
  launchDurationCount: number;
  uncleanAppClosures: number;
  runtimeErrors: number;
}

export interface ReportRow {
  uid: string;
  email: string;
  openMs: number;
  activeMs: number;
  lastSeenAt: number | null;
  version: string;
  sessionCount: number;
  analytics: DayAnalytics;
  versions: { [version: string]: VersionStats };
  // Sessions of the day that sent extended metrics; 0 means the analytics are unavailable, not zero
  metricSessionCount: number;
  hasLegacyClients: boolean;
  online: boolean;
}

export interface StatsRow {
  uid: string;
  email: string;
  firstSeenDay: string | null;
  firstActiveDay: string | null;
  lastActiveDay: string | null;
  lastSeenAt: number | null;
  version: string;
  activeToday: boolean;
  activeDays7: number;
  activeDays30: number;
  newToday: boolean;
  newIn7Days: boolean;
  newIn30Days: boolean;
  // Everything instrumented so far, whatever the selected day
  lifetimeAnalytics: LifetimeAnalytics;
}

export const STATS_SUMMARY_KEYS = ['accounts', 'dailyActiveUsers', 'weeklyActiveUsers', 'monthlyActiveUsers',
  'newUsersToday', 'returningUsersToday', 'newUsers7Days', 'returningUsers7Days', 'newUsers30Days', 'returningUsers30Days',
  'repeatUsers7Days', 'repeatUsers30Days'] as const;
export type StatsSummary = { [key in typeof STATS_SUMMARY_KEYS[number]]: number };

// ---------- Normalizing the responses ----------

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const day = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
const time = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
const pick = <K extends string>(keys: readonly K[], value: any) =>
  Object.fromEntries(keys.map(key => [key, num(value?.[key])])) as { [key in K]: number };

const toCounters = (value: any): Counters => ({
  ...pick(COUNTERS, value),
  launchDurationBuckets: LAUNCH_BUCKET_LABELS.map((_, i) => num(Array.isArray(value?.launchDurationBuckets) ? value.launchDurationBuckets[i] : 0)),
  failures: pick(FAILURE_REASONS, value?.failures),
  clicks: pick(CLICK_TARGETS, value?.clicks),
  crashes: pick(CRASH_REASONS, value?.crashes)
});

const VERSION_KEYS = ['sessions', 'openMs', 'activeMs', 'launchSucceeded', 'launchFailed', 'crashes',
  'launchDurationMs', 'launchDurationCount', 'uncleanAppClosures', 'runtimeErrors'] as const;

export const toReportRow = (value: any): ReportRow => ({
  uid: str(value?.uid),
  email: str(value?.email),
  openMs: num(value?.openMs),
  activeMs: num(value?.activeMs),
  lastSeenAt: time(value?.lastSeenAt),
  version: str(value?.version),
  sessionCount: num(value?.sessionCount),
  analytics: {
    ...toCounters(value?.analytics),
    ...pick(['profilesCreated', 'profilesUsed', 'currentRunningProfiles', 'peakRunningProfiles'] as const, value?.analytics)
  },
  versions: Object.fromEntries(Object.entries(value?.versions && typeof value.versions === 'object' ? value.versions : {})
    .map(([version, stats]) => [version, pick(VERSION_KEYS, stats)])),
  metricSessionCount: num(value?.metricSessionCount),
  hasLegacyClients: value?.hasLegacyClients === true,
  online: value?.online === true
});

export const toStatsRow = (value: any): StatsRow => ({
  uid: str(value?.uid),
  email: str(value?.email),
  firstSeenDay: day(value?.firstSeenDay),
  firstActiveDay: day(value?.firstActiveDay),
  lastActiveDay: day(value?.lastActiveDay),
  lastSeenAt: time(value?.lastSeenAt),
  version: str(value?.version),
  activeToday: value?.activeToday === true,
  activeDays7: num(value?.activeDays7),
  activeDays30: num(value?.activeDays30),
  newToday: value?.newToday === true,
  newIn7Days: value?.newIn7Days === true,
  newIn30Days: value?.newIn30Days === true,
  lifetimeAnalytics: {
    ...toCounters(value?.lifetimeAnalytics),
    ...pick(['peakRunningProfiles', 'sessionDaysWithErrors'] as const, value?.lifetimeAnalytics)
  }
});

// ---------- Requests ----------

export class UsageApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface PagedResult<T> {
  rows: T[];
  summaries: any[];
  pages: number;
  generatedAt: number | null;
}

// Follows nextCursor until the last page; a repeated cursor or too many pages fail instead of looping
export const fetchAllPages = async <T>(
  endpoint: 'getDesktopUsageReport' | 'getDesktopUsageStats',
  dayKey: string,
  getToken: () => Promise<string>,
  toRow: (value: any) => T,
  signal?: AbortSignal,
  onPage?: (pages: number, rows: number) => void
): Promise<PagedResult<T>> => {
  const rows: T[] = [];
  const summaries: any[] = [];
  const seen: string[] = [];
  let cursor = '';
  let generatedAt: number | null = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ day: dayKey });
    if (cursor) params.set('cursor', cursor);
    const token = await getToken();
    const response = await fetch(`${USAGE_API}/${endpoint}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !Array.isArray(data.rows)) {
      throw new UsageApiError(response.ok ? 502 : response.status, (data && typeof data.error === 'string' && data.error) || 'Unexpected response');
    }
    if (data.day && data.day !== dayKey) throw new UsageApiError(502, 'The response is for another day');
    data.rows.forEach((row: any) => rows.push(toRow(row)));
    if (data.summary) summaries.push(data.summary);
    generatedAt = time(data.generatedAt) ?? generatedAt;
    onPage?.(page, rows.length);
    const next = typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null;
    if (!next) return { rows, summaries, pages: page, generatedAt };
    if (seen.includes(next)) throw new UsageApiError(502, 'The pagination cursor repeated');
    seen.push(next);
    cursor = next;
  }
  throw new UsageApiError(502, 'Too many pages');
};

// Runs tasks with at most `limit` at a time; stops starting new ones once the signal aborts
export const runLimited = async <T>(tasks: (() => Promise<T>)[], limit: number, signal?: AbortSignal): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const index = next++;
      results[index] = await tasks[index]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

// ---------- Dates (America/Caracas) ----------

const caracasDay = new Intl.DateTimeFormat('en-CA', { timeZone: USAGE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayInCaracas = (ms: number) => caracasDay.format(new Date(ms));
export const addDays = (dayKey: string, days: number) => new Date(Date.parse(`${dayKey}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
// The `days` days ending on dayKey, oldest first
export const dayRange = (dayKey: string, days: number) => Array.from({ length: days }, (_, i) => addDays(dayKey, i - days + 1));

const caracasDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: USAGE_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
});
export const formatCaracasTime = (ms: number | null) => (ms ? caracasDateTime.format(new Date(ms)) : '—');
export const formatDay = (dayKey: string | null, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  dayKey ? new Date(`${dayKey}T12:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' }) : '—';

// ---------- Formatting ----------

export const formatDuration = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined) return '—';
  if (ms >= 3600000) return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  if (ms >= 60000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
};
export const formatRate = (rate: number | null | undefined) => (rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(1)}%`);
export const formatCount = (value: number | null | undefined) => (value === null || value === undefined ? '—' : value.toLocaleString('en-US'));
export const ratio = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : null);

// ---------- Totals ----------

export const emptyCounters = (): Counters => toCounters({});

export const addCounters = (total: Counters, value: Counters) => {
  COUNTERS.forEach(key => { total[key] += value[key]; });
  value.launchDurationBuckets.forEach((n, i) => { total.launchDurationBuckets[i] += n; });
  FAILURE_REASONS.forEach(key => { total.failures[key] += value.failures[key]; });
  CLICK_TARGETS.forEach(key => { total.clicks[key] += value.clicks[key]; });
  CRASH_REASONS.forEach(key => { total.crashes[key] += value.crashes[key]; });
  return total;
};

export const derived = (c: Counters) => ({
  // Cancelled and pending launches stay out of the success rate, as in the backend
  launchSuccessRate: ratio(c.launchSucceeded, c.launchSucceeded + c.launchFailed),
  averageLaunchMs: ratio(c.launchDurationMs, c.launchDurationCount),
  averageCompletedSessionMs: ratio(c.completedSessionOpenMs, c.sessionCompletions),
  totalClicks: CLICK_TARGETS.reduce((sum, key) => sum + c.clicks[key], 0)
});

export interface VersionTotal extends VersionStats {
  version: string;
  accounts: number;
}

export interface DayTotals {
  accounts: number;
  activeAccounts: number;
  onlineAccounts: number;
  lastReceivedAt: number | null;
  openMs: number;
  activeMs: number;
  sessionCount: number;
  metricSessionCount: number;
  metricAccounts: number;
  hasLegacyClients: boolean;
  // Extended metrics exist only when at least one session sent them
  hasMetrics: boolean;
  analytics: Counters;
  profilesCreated: number;
  profilesUsed: number;
  // Sum of what online apps report right now; only meaningful for today
  currentRunningProfiles: number;
  // Highest peak of a single account; the backend has no simultaneous peak across accounts
  maxAccountPeak: number;
  sessionsWithErrorsRate: number | null;
  versions: VersionTotal[];
}

export const summarizeReport = (rows: ReportRow[]): DayTotals => {
  const analytics = emptyCounters();
  const versions: { [version: string]: VersionTotal } = {};
  const versionEntry = (version: string) => versions[version] || (versions[version] = {
    version, accounts: 0, ...pick(VERSION_KEYS, {})
  });
  const totals = {
    accounts: rows.length, activeAccounts: 0, onlineAccounts: 0, lastReceivedAt: null as number | null,
    openMs: 0, activeMs: 0, sessionCount: 0, metricSessionCount: 0, metricAccounts: 0, hasLegacyClients: false,
    profilesCreated: 0, profilesUsed: 0, currentRunningProfiles: 0, maxAccountPeak: 0
  };
  rows.forEach(row => {
    if (row.activeMs > 0) totals.activeAccounts++;
    if (row.online) {
      totals.onlineAccounts++;
      totals.currentRunningProfiles += row.analytics.currentRunningProfiles;
    }
    if (row.lastSeenAt && (!totals.lastReceivedAt || row.lastSeenAt > totals.lastReceivedAt)) totals.lastReceivedAt = row.lastSeenAt;
    totals.openMs += row.openMs;
    totals.activeMs += row.activeMs;
    totals.sessionCount += row.sessionCount;
    totals.metricSessionCount += row.metricSessionCount;
    if (row.hasLegacyClients) totals.hasLegacyClients = true;
    if (row.metricSessionCount > 0) {
      totals.metricAccounts++;
      addCounters(analytics, row.analytics);
      totals.profilesCreated += row.analytics.profilesCreated;
      totals.profilesUsed += row.analytics.profilesUsed;
      totals.maxAccountPeak = Math.max(totals.maxAccountPeak, row.analytics.peakRunningProfiles);
    }
    if (row.version) versionEntry(row.version).accounts++;
    Object.entries(row.versions).forEach(([version, stats]) => {
      const entry = versionEntry(version);
      VERSION_KEYS.forEach(key => { entry[key] += stats[key]; });
    });
  });
  return {
    ...totals,
    hasMetrics: totals.metricSessionCount > 0,
    analytics,
    sessionsWithErrorsRate: ratio(analytics.sessionsWithErrors, totals.metricSessionCount),
    versions: Object.values(versions).sort((a, b) => compareVersions(b.version, a.version))
  };
};

export const compareVersions = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return a.localeCompare(b);
};

// Page summaries count disjoint sets of accounts, so their sum is the global total
export const sumStatsSummaries = (summaries: any[]): StatsSummary =>
  Object.fromEntries(STATS_SUMMARY_KEYS.map(key => [key, summaries.reduce((sum, summary) => sum + num(summary?.[key]), 0)])) as StatsSummary;

export const summarizeLifetime = (rows: StatsRow[]) => {
  const totals = emptyCounters();
  let sessionDaysWithErrors = 0;
  let maxAccountPeak = 0;
  rows.forEach(row => {
    addCounters(totals, row.lifetimeAnalytics);
    sessionDaysWithErrors += row.lifetimeAnalytics.sessionDaysWithErrors;
    maxAccountPeak = Math.max(maxAccountPeak, row.lifetimeAnalytics.peakRunningProfiles);
  });
  return { counters: totals, sessionDaysWithErrors, maxAccountPeak };
};

// ---------- Trends ----------

export interface TrendPoint {
  day: string;
  // Before the first day any account was seen there is no data, which is not the same as zero
  available: boolean;
  dailyActiveUsers: number;
  accounts: number;
  activeMs: number;
  openMs: number;
  sessionCount: number;
  launchSucceeded: number;
  launchFailed: number;
  launchCancelled: number;
  newUsers: number;
  hasMetrics: boolean;
  hasLegacyClients: boolean;
}

export const trendPoint = (dayKey: string, totals: DayTotals | undefined, newUsers: number, firstDataDay: string | null): TrendPoint => ({
  day: dayKey,
  available: !!totals && !!firstDataDay && dayKey >= firstDataDay,
  dailyActiveUsers: totals?.activeAccounts ?? 0,
  accounts: totals?.accounts ?? 0,
  activeMs: totals?.activeMs ?? 0,
  openMs: totals?.openMs ?? 0,
  sessionCount: totals?.sessionCount ?? 0,
  launchSucceeded: totals?.analytics.launchSucceeded ?? 0,
  launchFailed: totals?.analytics.launchFailed ?? 0,
  launchCancelled: totals?.analytics.launchCancelled ?? 0,
  newUsers,
  hasMetrics: totals?.hasMetrics ?? false,
  hasLegacyClients: totals?.hasLegacyClients ?? false
});

// New users per day come from each account's first active day, so one stats load covers the whole range
export const newUsersByDay = (rows: StatsRow[]) => {
  const counts: { [day: string]: number } = {};
  rows.forEach(row => { if (row.firstActiveDay) counts[row.firstActiveDay] = (counts[row.firstActiveDay] || 0) + 1; });
  return counts;
};

export const firstDataDay = (rows: StatsRow[]) =>
  rows.reduce<string | null>((first, row) => (row.firstSeenDay && (!first || row.firstSeenDay < first) ? row.firstSeenDay : first), null);

// ---------- Accounts table ----------

export interface AccountRow {
  uid: string;
  email: string;
  report: ReportRow | null;
  stats: StatsRow | null;
  online: boolean;
  version: string;
  openMs: number;
  activeMs: number;
  sessions: number;
  hasMetrics: boolean;
  launchSucceeded: number | null;
  launchFailed: number | null;
  launchSuccessRate: number | null;
  profilesUsed: number | null;
  crashes: number | null;
  clicks: number | null;
  activeDays7: number | null;
  activeDays30: number | null;
  firstActiveDay: string | null;
  lastSeenAt: number | null;
}

export const mergeAccounts = (reportRows: ReportRow[], statsRows: StatsRow[]): AccountRow[] => {
  const byUid: { [uid: string]: { report: ReportRow | null; stats: StatsRow | null } } = {};
  reportRows.forEach(report => { byUid[report.uid] = { report, stats: null }; });
  statsRows.forEach(stats => { byUid[stats.uid] = { report: byUid[stats.uid]?.report ?? null, stats }; });
  return Object.keys(byUid).map(uid => {
    const { report, stats } = byUid[uid];
    const hasMetrics = !!report && report.metricSessionCount > 0;
    const a = report?.analytics;
    return {
      uid,
      email: report?.email || stats?.email || '',
      report,
      stats,
      online: report?.online ?? false,
      version: report?.version || stats?.version || '',
      openMs: report?.openMs ?? 0,
      activeMs: report?.activeMs ?? 0,
      sessions: report?.sessionCount ?? 0,
      hasMetrics,
      launchSucceeded: hasMetrics && a ? a.launchSucceeded : null,
      launchFailed: hasMetrics && a ? a.launchFailed : null,
      launchSuccessRate: hasMetrics && a ? ratio(a.launchSucceeded, a.launchSucceeded + a.launchFailed) : null,
      profilesUsed: hasMetrics && a ? a.profilesUsed : null,
      crashes: hasMetrics && a ? a.appProcessCrashes + a.browserCrashes : null,
      clicks: hasMetrics && a ? derived(a).totalClicks : null,
      activeDays7: stats ? stats.activeDays7 : null,
      activeDays30: stats ? stats.activeDays30 : null,
      firstActiveDay: stats?.firstActiveDay ?? null,
      // The report's lastSeenAt is for the day; the account's is the latest reception overall
      lastSeenAt: stats?.lastSeenAt ?? report?.lastSeenAt ?? null
    };
  });
};

export type Scope = 'day' | 'active30' | 'all';
export type OnlineFilter = 'all' | 'online' | 'offline';
export type SortKey = 'email' | 'online' | 'version' | 'openMs' | 'activeMs' | 'sessions' | 'launchSucceeded' | 'launchFailed'
  | 'launchSuccessRate' | 'profilesUsed' | 'crashes' | 'clicks' | 'activeDays7' | 'activeDays30' | 'firstActiveDay' | 'lastSeenAt';

export interface AccountFilters {
  search: string;
  scope: Scope;
  online: OnlineFilter;
  version: string;
}

export const filterAccounts = (rows: AccountRow[], filters: AccountFilters) => {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(row =>
    (filters.scope === 'all' || (filters.scope === 'day' ? !!row.report : (row.activeDays30 ?? 0) > 0))
    && (!search || row.email.toLowerCase().includes(search) || row.uid.toLowerCase() === search)
    && (filters.online === 'all' || row.online === (filters.online === 'online'))
    && (!filters.version || row.version === filters.version));
};

// Missing values (no metrics, no stats) always go last
export const sortAccounts = (rows: AccountRow[], key: SortKey, direction: 'asc' | 'desc') => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key], vb = b[key];
    const missingA = va === null || va === '', missingB = vb === null || vb === '';
    if (missingA || missingB) return missingA === missingB ? a.email.localeCompare(b.email) : missingA ? 1 : -1;
    let diff: number;
    if (key === 'version') diff = compareVersions(String(va), String(vb));
    else if (typeof va === 'string' && typeof vb === 'string') diff = va.localeCompare(vb);
    else diff = Number(va) - Number(vb);
    return diff ? diff * sign : a.email.localeCompare(b.email);
  });
};

// ---------- CSV ----------

// Quotes every cell and neutralizes spreadsheet formulas (=, +, -, @ at the start)
export const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const caracasIso = (ms: number | null) => {
  if (!ms) return '';
  return `${new Date(ms - 4 * 3600000).toISOString().slice(0, 19).replace('T', ' ')} -04:00`;
};

export const CSV_COLUMNS: [string, (row: AccountRow, dayKey: string) => unknown][] = [
  ['day', (_, dayKey) => dayKey],
  ['email', row => row.email],
  ['uid', row => row.uid],
  ['reported_on_day', row => (row.report ? 'yes' : 'no')],
  ['online', row => (row.online ? 'yes' : 'no')],
  ['version', row => row.version],
  ['open_time_ms', row => row.openMs],
  ['active_time_ms', row => row.activeMs],
  ['sessions', row => row.sessions],
  ['sessions_with_extended_metrics', row => row.report?.metricSessionCount ?? 0],
  ['legacy_clients', row => (row.report?.hasLegacyClients ? 'yes' : 'no')],
  ...(([
    ['session_starts', a => a.sessionStarts],
    ['session_completions', a => a.sessionCompletions],
    ['avg_completed_session_ms', a => ratio(a.completedSessionOpenMs, a.sessionCompletions)],
    ['launch_attempts', a => a.launchAttempts],
    ['launch_succeeded', a => a.launchSucceeded],
    ['launch_failed', a => a.launchFailed],
    ['launch_cancelled', a => a.launchCancelled],
    ['launch_success_rate', a => ratio(a.launchSucceeded, a.launchSucceeded + a.launchFailed)],
    ['avg_launch_ms', a => ratio(a.launchDurationMs, a.launchDurationCount)],
    ...FAILURE_REASONS.map(reason => [`failures_${reason}`, (a: DayAnalytics) => a.failures[reason]]),
    ['profiles_created', a => a.profilesCreated],
    ['profiles_used', a => a.profilesUsed],
    ['profiles_open_now', a => a.currentRunningProfiles],
    ['peak_open_profiles', a => a.peakRunningProfiles],
    ['app_process_crashes', a => a.appProcessCrashes],
    ['browser_abnormal_exits', a => a.browserCrashes],
    ['runtime_errors', a => a.runtimeErrors],
    ['unclean_app_closures', a => a.uncleanAppClosures],
    ...CLICK_TARGETS.map(target => [`clicks_${target}`, (a: DayAnalytics) => a.clicks[target]]),
    ['link_open_failures', a => a.externalOpenFailures]
  ] as [string, (a: DayAnalytics) => unknown][]).map(([name, read]) =>
    [name, (row: AccountRow) => (row.hasMetrics && row.report ? read(row.report.analytics) : '')] as [string, (row: AccountRow) => unknown])),
  ['active_days_7', row => row.activeDays7 ?? ''],
  ['active_days_30', row => row.activeDays30 ?? ''],
  ['first_active_day', row => row.firstActiveDay ?? ''],
  ['last_active_day', row => row.stats?.lastActiveDay ?? ''],
  ['new_on_day', row => (row.stats ? (row.stats.newToday ? 'yes' : 'no') : '')],
  ['last_seen_caracas', row => caracasIso(row.lastSeenAt)]
];

export const accountsToCsv = (rows: AccountRow[], dayKey: string) =>
  [CSV_COLUMNS.map(([name]) => csvCell(name)).join(','),
    ...rows.map(row => CSV_COLUMNS.map(([, read]) => csvCell(read(row, dayKey))).join(','))].join('\r\n');
