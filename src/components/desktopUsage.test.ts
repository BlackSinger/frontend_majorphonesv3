import {
  UsageApiError, accountsToCsv, csvCell, dayRange, fetchAllPages, filterAccounts, mergeAccounts, runLimited, sortAccounts,
  sumStatsSummaries, summarizeLifetime, summarizeReport, toReportRow, toStatsRow, trendPoint, dayInCaracas, formatDuration, derived
} from './desktopUsage';
import { analytics, reportRow, statsRow, statsSummary, mockUsageApi, callsTo } from './desktopUsage.fixtures';

const DAY = '2026-11-02';
const many = (n: number, make: (uid: string, i: number) => any) =>
  Array.from({ length: n }, (_, i) => make(`u${String(i).padStart(4, '0')}`, i));

describe('fetchAllPages', () => {
  test('follows nextCursor over every page with the bearer token', async () => {
    const rows = many(405, uid => reportRow(uid));
    const { fetchMock } = mockUsageApi({ report: { [DAY]: rows }, stats: {} });
    const pages: number[] = [];
    const result = await fetchAllPages('getDesktopUsageReport', DAY, async () => 'token-1', toReportRow, undefined, page => pages.push(page));

    expect(result.rows).toHaveLength(405);
    expect(new Set(result.rows.map(row => row.uid)).size).toBe(405);
    expect(result.pages).toBe(3);
    expect(pages).toEqual([1, 2, 3]);
    expect(callsTo(fetchMock, 'getDesktopUsageReport')).toEqual([
      { day: DAY, cursor: null }, { day: DAY, cursor: 'u0199' }, { day: DAY, cursor: 'u0399' }
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://us-central1-majorphonesv3.cloudfunctions.net/getDesktopUsageReport?day=${DAY}`);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer token-1' });
  });

  test('a repeated cursor fails instead of looping', async () => {
    mockUsageApi({ report: {}, stats: {} }, () => ({ status: 200, json: { day: DAY, rows: [reportRow('a')], nextCursor: 'a' } }));
    await expect(fetchAllPages('getDesktopUsageReport', DAY, async () => 't', toReportRow)).rejects.toThrow('cursor repeated');
  });

  test('HTTP errors keep their status', async () => {
    mockUsageApi({ report: {}, stats: {} }, () => ({ status: 403, json: { error: 'Administrator access required' } }));
    const error = await fetchAllPages('getDesktopUsageStats', DAY, async () => 't', toStatsRow).catch(e => e);
    expect(error).toBeInstanceOf(UsageApiError);
    expect(error.status).toBe(403);
    expect(error.message).toBe('Administrator access required');
  });

  test('a response for another day is rejected', async () => {
    mockUsageApi({ report: {}, stats: {} }, () => ({ status: 200, json: { day: '2026-11-01', rows: [], nextCursor: null } }));
    await expect(fetchAllPages('getDesktopUsageReport', DAY, async () => 't', toReportRow)).rejects.toThrow('another day');
  });
});

describe('summarizeReport', () => {
  const a = toReportRow(reportRow('a', {
    openMs: 7200000, activeMs: 3600000, sessionCount: 2, metricSessionCount: 2, online: true,
    analytics: analytics({ launchSucceeded: 9, launchFailed: 1, launchCancelled: 3, launchDurationMs: 90000, launchDurationCount: 9,
      sessionCompletions: 1, completedSessionOpenMs: 3600000, currentRunningProfiles: 2, peakRunningProfiles: 4, profilesUsed: 5,
      sessionsWithErrors: 1, failures: { proxy: 1, connection: 0, configuration: 0, browser: 0, unknown: 0 } }),
    versions: { '1.1.0': { sessions: 2, openMs: 7200000, activeMs: 3600000, launchSucceeded: 9, launchFailed: 1, crashes: 0 } }
  }));
  const b = toReportRow(reportRow('b', {
    openMs: 600000, activeMs: 0, version: '1.0.9', metricSessionCount: 1, online: false,
    analytics: analytics({ launchSucceeded: 0, launchFailed: 1, launchDurationMs: 0, launchDurationCount: 0, currentRunningProfiles: 7,
      peakRunningProfiles: 3, sessionCompletions: 3, completedSessionOpenMs: 600000, failures: { proxy: 0, connection: 1, configuration: 0, browser: 0, unknown: 0 } }),
    versions: { '1.0.9': { sessions: 1, openMs: 600000, activeMs: 0, launchSucceeded: 0, launchFailed: 1, crashes: 2 } }
  }));
  const legacy = toReportRow(reportRow('c', {
    openMs: 1000, activeMs: 1000, metricSessionCount: 0, hasLegacyClients: true, version: '1.0.0',
    analytics: analytics({ launchFailed: 50 }), versions: { '1.0.0': { sessions: 1, openMs: 1000, activeMs: 1000, launchSucceeded: 0, launchFailed: 0, crashes: 0 } }
  }));
  const totals = summarizeReport([a, b, legacy]);

  test('rates and averages come from summed numerators and denominators', () => {
    // 9 / (9 + 2), not the mean of 90% and 0%
    expect(totals.analytics.launchSucceeded).toBe(9);
    expect(totals.analytics.launchFailed).toBe(2);
    expect(summarizeReport([a, b]).analytics.launchFailed).toBe(2);
    expect(derived(totals.analytics).launchSuccessRate).toBeCloseTo(9 / 11);
    expect(derived(totals.analytics).averageLaunchMs).toBe(10000);
    expect(derived(totals.analytics).averageCompletedSessionMs).toBe((3600000 + 600000) / 4);
    expect(totals.sessionsWithErrorsRate).toBeCloseTo(1 / 3);
  });

  test('time and sessions include legacy clients; extended metrics do not', () => {
    expect(totals.openMs).toBe(7200000 + 600000 + 1000);
    expect(totals.activeAccounts).toBe(2);
    expect(totals.sessionCount).toBe(4);
    expect(totals.metricSessionCount).toBe(3);
    expect(totals.metricAccounts).toBe(2);
    expect(totals.hasLegacyClients).toBe(true);
    expect(totals.analytics.failures).toEqual({ proxy: 1, connection: 1, configuration: 0, browser: 0, unknown: 0 });
  });

  test('peaks are never added up and open profiles only count connected apps', () => {
    expect(totals.maxAccountPeak).toBe(4);
    expect(totals.currentRunningProfiles).toBe(2);
    expect(totals.onlineAccounts).toBe(1);
  });

  test('versions merge per-version counters and count accounts by their version', () => {
    expect(totals.versions.map(v => [v.version, v.accounts, v.sessions, v.crashes])).toEqual([
      ['1.1.0', 1, 2, 0], ['1.0.9', 1, 1, 2], ['1.0.0', 1, 1, 0]
    ]);
  });

  test('only legacy clients means no extended metrics at all', () => {
    expect(summarizeReport([legacy]).hasMetrics).toBe(false);
    expect(summarizeReport([]).lastReceivedAt).toBeNull();
  });
});

test('page summaries add up to the global summary', () => {
  const rows = many(450, (uid, i) => statsRow(uid, { activeToday: i % 3 === 0, activeDays7: i % 4, activeDays30: i % 5, newToday: i % 7 === 0 }));
  const pages = [rows.slice(0, 200), rows.slice(200, 400), rows.slice(400)].map(statsSummary);
  const { scope, ...expected } = statsSummary(rows);
  expect(sumStatsSummaries(pages)).toEqual(expected);
});

test('lifetime totals add counters and keep the highest peak', () => {
  const rows = [
    statsRow('a', { lifetimeAnalytics: { ...analytics({ launchSucceeded: 3, peakRunningProfiles: 6 }), sessionDaysWithErrors: 1 } }),
    statsRow('b', { lifetimeAnalytics: { ...analytics({ launchSucceeded: 4, peakRunningProfiles: 2 }), sessionDaysWithErrors: 2 } })
  ].map(toStatsRow);
  const lifetime = summarizeLifetime(rows);
  expect(lifetime.counters.launchSucceeded).toBe(7);
  expect(lifetime.maxAccountPeak).toBe(6);
  expect(lifetime.sessionDaysWithErrors).toBe(3);
});

test('days before the first observed account have no data rather than zero', () => {
  const totals = summarizeReport([]);
  expect(trendPoint('2026-10-30', totals, 0, '2026-11-01').available).toBe(false);
  expect(trendPoint('2026-11-01', totals, 0, '2026-11-01').available).toBe(true);
  expect(trendPoint('2026-11-01', undefined, 0, '2026-11-01').available).toBe(false);
});

test('Caracas days and ranges', () => {
  // 03:30 UTC on Nov 3 is still Nov 2 in Caracas (UTC-4)
  expect(dayInCaracas(Date.parse('2026-11-03T03:30:00Z'))).toBe('2026-11-02');
  expect(dayInCaracas(Date.parse('2026-11-03T04:00:00Z'))).toBe('2026-11-03');
  expect(dayRange('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  expect(formatDuration(3723000)).toBe('1h 2m');
  expect(formatDuration(1500)).toBe('1.5 s');
});

describe('accounts table', () => {
  const reports = [
    reportRow('ana', { email: 'ana@example.com', online: true, activeMs: 50, version: '1.1.0' }),
    reportRow('bob', { email: 'bob@example.com', activeMs: 500, version: '1.0.9', metricSessionCount: 0, hasLegacyClients: true })
  ].map(toReportRow);
  const stats = [
    statsRow('ana', { email: 'ana@example.com', activeDays30: 3 }),
    statsRow('bob', { email: 'bob@example.com', activeDays30: 1 }),
    statsRow('cy', { email: 'cy@example.com', activeDays30: 0, activeDays7: 0, version: '1.0.9' })
  ].map(toStatsRow);
  const accounts = mergeAccounts(reports, stats);
  const base = { search: '', scope: 'all' as const, online: 'all' as const, version: '' };

  test('filters by scope, search, connection and version', () => {
    const emails = (filters: any) => filterAccounts(accounts, { ...base, ...filters }).map(row => row.email).sort();
    expect(emails({ scope: 'day' })).toEqual(['ana@example.com', 'bob@example.com']);
    expect(emails({ scope: 'active30' })).toEqual(['ana@example.com', 'bob@example.com']);
    expect(emails({})).toHaveLength(3);
    expect(emails({ search: 'BOB' })).toEqual(['bob@example.com']);
    expect(emails({ online: 'online' })).toEqual(['ana@example.com']);
    expect(emails({ online: 'offline' })).toEqual(['bob@example.com', 'cy@example.com']);
    expect(emails({ version: '1.0.9' })).toEqual(['bob@example.com', 'cy@example.com']);
  });

  test('sorts both ways and keeps missing values last', () => {
    expect(sortAccounts(accounts, 'activeMs', 'desc').map(r => r.uid)).toEqual(['bob', 'ana', 'cy']);
    expect(sortAccounts(accounts, 'activeMs', 'asc').map(r => r.uid)).toEqual(['cy', 'ana', 'bob']);
    // bob has no extended metrics and cy no report: both go last in either direction
    expect(sortAccounts(accounts, 'launchSucceeded', 'asc').map(r => r.uid)).toEqual(['ana', 'bob', 'cy']);
    expect(sortAccounts(accounts, 'launchSucceeded', 'desc').map(r => r.uid)).toEqual(['ana', 'bob', 'cy']);
  });

  test('CSV quotes cells, blocks formulas and leaves unavailable metrics empty', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell(null)).toBe('""');
    const [header, ana, bob] = accountsToCsv(sortAccounts(accounts, 'email', 'asc'), DAY).split('\r\n');
    const cols = header.split(',').map(cell => JSON.parse(cell));
    const value = (line: string, name: string) => JSON.parse(line.split(',')[cols.indexOf(name)]);
    expect(value(ana, 'email')).toBe('ana@example.com');
    expect(value(ana, 'launch_succeeded')).toBe('0');
    expect(value(bob, 'launch_succeeded')).toBe('');
    expect(value(bob, 'legacy_clients')).toBe('yes');
    expect(value(ana, 'last_seen_caracas')).toBe('2026-11-02 10:00:00 -04:00');
    expect(value(ana, 'day')).toBe(DAY);
  });
});

test('runLimited never runs more than the limit at once', async () => {
  let active = 0, max = 0;
  const tasks = Array.from({ length: 10 }, (_, i) => async () => {
    active++;
    max = Math.max(max, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return i;
  });
  expect(await runLimited(tasks, 3)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(max).toBe(3);
});
