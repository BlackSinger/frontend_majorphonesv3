// Test data shaped like getDesktopUsageReport / getDesktopUsageStats responses (never written to Firestore)

export const analytics = (overrides: any = {}) => ({
  sessionStarts: 0, sessionCompletions: 0, completedSessionOpenMs: 0, uncleanAppClosures: 0,
  launchAttempts: 0, launchSucceeded: 0, launchFailed: 0, launchCancelled: 0, launchDurationMs: 0, launchDurationCount: 0,
  appProcessCrashes: 0, browserCrashes: 0, runtimeErrors: 0, sessionsWithErrors: 0, externalOpenFailures: 0,
  currentRunningProfiles: 0, peakRunningProfiles: 0, launchDurationBuckets: [0, 0, 0, 0, 0, 0, 0, 0],
  failures: { proxy: 0, connection: 0, configuration: 0, browser: 0, unknown: 0 },
  clicks: { virtualNumbers: 0, hydraproxy: 0, weproxy: 0, catproxies: 0 },
  crashes: { renderer: 0, gpu: 0, utility: 0, other: 0 },
  profilesCreated: 0, profilesUsed: 0, launchSuccessRate: null, averageLaunchMs: null, averageCompletedSessionMs: null,
  ...overrides
});

export const reportRow = (uid: string, overrides: any = {}) => ({
  uid, email: `${uid}@example.com`, openMs: 3600000, activeMs: 1800000, lastSeenAt: Date.parse('2026-11-02T14:00:00Z'),
  version: '1.1.0', sessionCount: 1, analytics: analytics(), versions: {}, metricSessionCount: 1, hasLegacyClients: false,
  sessionsWithErrorsRate: 0, online: false, ...overrides
});

export const statsRow = (uid: string, overrides: any = {}) => ({
  uid, email: `${uid}@example.com`, firstSeenDay: '2026-11-01', firstActiveDay: '2026-11-01', lastActiveDay: '2026-11-02',
  lastSeenAt: Date.parse('2026-11-02T14:00:00Z'), version: '1.1.0', activeToday: true, activeDays7: 2, activeDays30: 2,
  newToday: false, newIn7Days: true, newIn30Days: true, lifetimeAnalytics: { ...analytics(), sessionDaysWithErrors: 0 }, ...overrides
});

// Recomputes the backend's page summary for a list of stats rows
export const statsSummary = (rows: any[]) => {
  const count = (predicate: (row: any) => boolean) => rows.filter(predicate).length;
  return {
    scope: 'page', accounts: rows.length, dailyActiveUsers: count(r => r.activeToday),
    weeklyActiveUsers: count(r => r.activeDays7 > 0), monthlyActiveUsers: count(r => r.activeDays30 > 0),
    newUsersToday: count(r => r.newToday), returningUsersToday: count(r => r.activeToday && !r.newToday),
    newUsers7Days: count(r => r.newIn7Days), returningUsers7Days: count(r => r.activeDays7 > 0 && !r.newIn7Days),
    newUsers30Days: count(r => r.newIn30Days), returningUsers30Days: count(r => r.activeDays30 > 0 && !r.newIn30Days),
    repeatUsers7Days: count(r => r.activeDays7 >= 2), repeatUsers30Days: count(r => r.activeDays30 >= 2)
  };
};

type Reply = { status: number; json: unknown } | Promise<{ status: number; json: unknown }>;

// Serves `pages[endpoint][day]` in pages of 200 with cursors like the backend; `override` can answer a call itself
export const mockUsageApi = (
  data: { report: { [day: string]: any[] }; stats: { [day: string]: any[] } },
  override?: (endpoint: string, day: string, cursor: string) => Reply | undefined
) => {
  let active = 0;
  const state = { maxActive: 0 };
  const fetchMock = jest.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const endpoint = url.pathname.slice(1);
    const day = url.searchParams.get('day') || '';
    const cursor = url.searchParams.get('cursor') || '';
    active++;
    state.maxActive = Math.max(state.maxActive, active);
    try {
      let reply = await override?.(endpoint, day, cursor);
      if (!reply) {
        if (!(init?.headers as any)?.Authorization?.startsWith('Bearer ')) reply = { status: 401, json: { error: 'Sign in to MajorPhones' } };
        else {
          const rows = (endpoint === 'getDesktopUsageReport' ? data.report : data.stats)[day] ?? [];
          const sorted = [...rows].sort((a, b) => (a.uid < b.uid ? -1 : 1));
          const start = cursor ? sorted.findIndex(row => row.uid === cursor) + 1 : 0;
          const page = sorted.slice(start, start + 200);
          const nextCursor = start + 200 < sorted.length ? page[page.length - 1].uid : null;
          reply = { status: 200, json: { day, timezone: 'America/Caracas', generatedAt: Date.parse('2026-11-02T15:00:00Z'), rows: page, nextCursor,
            ...(endpoint === 'getDesktopUsageStats' ? { summary: statsSummary(page) } : {}) } };
        }
      }
      const { status, json } = await reply;
      return { ok: status >= 200 && status < 300, status, json: async () => json };
    } finally {
      active--;
    }
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, state };
};

export const callsTo = (fetchMock: jest.Mock, endpoint: string) => fetchMock.mock.calls
  .map(([input]) => new URL(input))
  .filter(url => url.pathname === `/${endpoint}`)
  .map(url => ({ day: url.searchParams.get('day'), cursor: url.searchParams.get('cursor') }));
