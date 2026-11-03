import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canViewDesktopMetrics } from './adminAccess';
import {
  AccountRow, AccountFilters, CLICK_LABELS, CLICK_TARGETS, CRASH_LABELS, CRASH_REASONS, DayTotals, FAILURE_LABELS,
  FAILURE_REASONS, LAUNCH_BUCKET_LABELS, OnlineFilter, PagedResult, ReportRow, Scope, SortKey, StatsRow, StatsSummary,
  TrendPoint, UsageApiError, accountsToCsv, addDays, dayInCaracas, dayRange, derived, fetchAllPages, filterAccounts,
  firstDataDay, formatCaracasTime, formatCount, formatDay, formatDuration, formatRate, mergeAccounts, newUsersByDay,
  ratio, runLimited, sortAccounts, sumStatsSummaries, summarizeLifetime, summarizeReport, toReportRow, toStatsRow, trendPoint
} from './desktopUsage';

// Validated against the #1e293b surface (dataviz validate_palette, dark): emerald, blue, pink, amber
const SERIES = ['#059669', '#3b82f6', '#ec4899', '#d97706'];
const FAILED = '#ef4444';
const TREND_CONCURRENCY = 3;
const TABLE_STEP = 100;

type Status = 'loading' | 'ready' | 'error' | 'denied' | 'expired';

interface Loaded {
  day: string;
  refreshKey: number;
  report: PagedResult<ReportRow>;
  stats: PagedResult<StatsRow>;
  totals: DayTotals;
  summary: StatsSummary;
  accounts: AccountRow[];
  loadedAt: number;
}

const ICONS = {
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  close: 'M6 18L18 6M6 6l12 12',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  sort: 'M8 9l4-4 4 4m0 6l-4 4-4-4'
};

const Icon: React.FC<{ d: string; className?: string }> = ({ d, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const Panel: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, actions, children }) => (
  <section className="rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 text-left space-y-4" aria-label={title}>
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">{label}</p>
    <p className="mt-1 text-xl font-bold text-white break-words">{value}</p>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const StatGrid: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div role="group" aria-label={label} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{children}</div>
);

const Notice: React.FC<{ tone: 'info' | 'warning' | 'error'; children: React.ReactNode; action?: React.ReactNode }> = ({ tone, children, action }) => {
  const styles = {
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100'
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm text-left ${styles}`}>
      <Icon d={tone === 'info' ? ICONS.info : ICONS.warning} className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
};

// ---------- Charts ----------

interface BarPoint { label: string; values: number[]; available: boolean }

// Vertical bars, stacked when there are several series; days without data show a dashed stub instead of a zero bar.
// Day axes label the first, middle and last bar; category axes label every bar
const BarChart: React.FC<{
  title: string; points: BarPoint[]; series: { name: string; color: string }[]; format: (value: number) => string; categories?: boolean;
}> = ({ title, points, series, format, categories = false }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...points.map(point => point.values.reduce((a, b) => a + b, 0)));
  const ticks = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const hovered = hover === null ? null : points[hover];
  return (
    <figure className="relative rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 min-w-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-3 text-xs text-slate-300">
            {series.map(s => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.name}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <div className="relative">
        <div className="absolute left-0 top-0 text-[10px] text-slate-500">{max > 0 ? format(max) : ''}</div>
        <div className="h-36 pt-4 flex items-end gap-[2px] border-b border-slate-600/60" onMouseLeave={() => setHover(null)}>
          {points.map((point, index) => {
            const total = point.values.reduce((a, b) => a + b, 0);
            return (
              <div
                key={point.label}
                className={`flex-1 h-full flex flex-col justify-end rounded-t ${hover === index ? 'bg-slate-700/40' : ''}`}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${point.label}: ${point.available ? series.map((s, i) => `${s.name} ${format(point.values[i])}`).join(', ') : 'no data'}`}
              >
                {!point.available ? (
                  <div className="h-1 mx-px border-t border-dashed border-slate-500" />
                ) : (
                  <div className="flex flex-col-reverse gap-[2px]" style={{ height: `${max > 0 ? (total / max) * 100 : 0}%` }}>
                    {point.values.map((value, i) => value > 0 && (
                      <div
                        key={series[i].name}
                        className={i === point.values.length - 1 || point.values.slice(i + 1).every(v => v === 0) ? 'rounded-t' : ''}
                        style={{ height: `${(value / total) * 100}%`, backgroundColor: series[i].color, minHeight: 2 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {categories ? (
          <div className="flex gap-[2px] mt-1 text-[10px] leading-tight text-slate-500">
            {points.map(point => <span key={point.label} className="flex-1 min-w-0 text-center break-words">{point.label}</span>)}
          </div>
        ) : (
          <div className="relative h-4 mt-1 text-[10px] text-slate-500">
            {ticks.map(i => (
              <span key={i} className="absolute whitespace-nowrap"
                style={{ left: `${((i + 0.5) / points.length) * 100}%`, transform: `translateX(${i === 0 ? '-10%' : i === points.length - 1 ? '-90%' : '-50%'})` }}>
                {points[i].label}
              </span>
            ))}
          </div>
        )}
        {hovered && (
          <div role="tooltip" className="absolute top-0 right-0 z-10 rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl pointer-events-none">
            <p className="font-semibold text-white">{hovered.label}</p>
            {hovered.available
              ? series.map((s, i) => (
                <p key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />{s.name}: {format(hovered.values[i])}
                </p>
              ))
              : <p className="text-slate-400">No data for this day</p>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Day</th>{series.map(s => <th key={s.name}>{s.name}</th>)}</tr></thead>
        <tbody>
          {points.map(point => (
            <tr key={point.label}><td>{point.label}</td>{point.values.map((v, i) => <td key={i}>{point.available ? format(v) : 'No data'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

// Horizontal bars with the value always written next to them
const BarList: React.FC<{ title: string; items: { label: string; value: number | null; note?: string }[]; color?: string; format?: (v: number) => string }> = ({ title, items, color = SERIES[0], format = formatCount }) => {
  const max = Math.max(0, ...items.map(item => item.value ?? 0));
  return (
    <figure className="relative rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 min-w-0">
      <figcaption className="text-sm font-semibold text-white mb-3">{title}</figcaption>
      <ul className="space-y-2" aria-label={title}>
        {items.map(item => (
          <li key={item.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-xs">
            <span className="text-slate-300 truncate" title={item.label}>{item.label}</span>
            <span className="h-2.5 rounded-full bg-slate-700/50 overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${item.value && max ? Math.max(2, (item.value / max) * 100) : 0}%`, backgroundColor: color }} />
            </span>
            <span className="text-slate-100 font-semibold tabular-nums text-right">{item.value === null ? '—' : format(item.value)}{item.note && <span className="text-slate-400 font-normal"> {item.note}</span>}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
};

// ---------- Account detail ----------

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-slate-700/40 last:border-0">
    <dt className="text-slate-400">{label}</dt>
    <dd className="text-slate-100 font-medium text-right break-all">{value}</dd>
  </div>
);

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80 mb-2">{title}</h4>
    <dl className="text-sm">{children}</dl>
  </div>
);

const counterRows = (c: DayTotals['analytics'], extra?: { profilesCreated?: number; profilesUsed?: number; current?: number | null; peak: number }) => {
  const d = derived(c);
  return (
    <>
      <DetailSection title="Sessions">
        <DetailRow label="Started" value={formatCount(c.sessionStarts)} />
        <DetailRow label="Completed" value={formatCount(c.sessionCompletions)} />
        <DetailRow label="Average completed session" value={formatDuration(d.averageCompletedSessionMs)} />
      </DetailSection>
      <DetailSection title="Launches">
        <DetailRow label="Attempts" value={formatCount(c.launchAttempts)} />
        <DetailRow label="Succeeded" value={formatCount(c.launchSucceeded)} />
        <DetailRow label="Failed" value={formatCount(c.launchFailed)} />
        <DetailRow label="Cancelled" value={formatCount(c.launchCancelled)} />
        <DetailRow label="Success rate" value={formatRate(d.launchSuccessRate)} />
        <DetailRow label="Average launch" value={formatDuration(d.averageLaunchMs)} />
        {FAILURE_REASONS.map(reason => <DetailRow key={reason} label={`${FAILURE_LABELS[reason]} failures`} value={formatCount(c.failures[reason])} />)}
      </DetailSection>
      <DetailSection title="Profiles">
        {extra?.profilesCreated !== undefined && <DetailRow label="Created" value={formatCount(extra.profilesCreated)} />}
        {extra?.profilesUsed !== undefined && <DetailRow label="Used" value={formatCount(extra.profilesUsed)} />}
        {extra?.current !== undefined && <DetailRow label="Open now" value={extra.current === null ? '—' : formatCount(extra.current)} />}
        <DetailRow label="Peak open at once" value={formatCount(extra?.peak ?? 0)} />
      </DetailSection>
      <DetailSection title="Stability">
        <DetailRow label="App process crashes" value={formatCount(c.appProcessCrashes)} />
        {CRASH_REASONS.map(reason => <DetailRow key={reason} label={`· ${CRASH_LABELS[reason]}`} value={formatCount(c.crashes[reason])} />)}
        <DetailRow label="Abnormal browser exits" value={formatCount(c.browserCrashes)} />
        <DetailRow label="Runtime errors" value={formatCount(c.runtimeErrors)} />
        <DetailRow label="Unclean closures" value={formatCount(c.uncleanAppClosures)} />
      </DetailSection>
      <DetailSection title="Clicks (not purchases)">
        {CLICK_TARGETS.map(target => <DetailRow key={target} label={CLICK_LABELS[target]} value={formatCount(c.clicks[target])} />)}
        <DetailRow label="Link open failures" value={formatCount(c.externalOpenFailures)} />
      </DetailSection>
    </>
  );
};

const AccountDetail: React.FC<{ account: AccountRow; day: string; isToday: boolean; onClose: () => void }> = ({ account, day, isToday, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const { report, stats } = account;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" style={{ margin: 0 }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Account ${account.email}`}
        className="h-full w-full max-w-3xl overflow-y-auto border-l border-slate-600 p-4 sm:p-6 text-left space-y-4 shadow-2xl"
        style={{ backgroundColor: '#1e293b' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white break-all">{account.email || account.uid}</h3>
            <p className="text-xs text-slate-400 font-mono break-all">{account.uid}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close account detail"
            className="p-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-emerald-500/60">
            <Icon d={ICONS.close} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DetailSection title="Activity">
            <DetailRow label="Status" value={isToday ? (account.online ? 'Connected' : 'Not connected') : '— (only today)'} />
            <DetailRow label="Version" value={account.version || '—'} />
            <DetailRow label="First seen" value={formatDay(stats?.firstSeenDay ?? null)} />
            <DetailRow label="First active" value={formatDay(stats?.firstActiveDay ?? null)} />
            <DetailRow label="Last active (up to this day)" value={formatDay(stats?.lastActiveDay ?? null)} />
            <DetailRow label="Active days, last 7" value={formatCount(account.activeDays7)} />
            <DetailRow label="Active days, last 30" value={formatCount(account.activeDays30)} />
            <DetailRow label="New on this day" value={stats ? (stats.newToday ? 'Yes' : 'No') : '—'} />
            <DetailRow label="Last data received" value={formatCaracasTime(account.lastSeenAt)} />
          </DetailSection>
          <DetailSection title={`Time on ${formatDay(day)}`}>
            {report ? (
              <>
                <DetailRow label="Time open" value={formatDuration(report.openMs)} />
                <DetailRow label="Active time" value={formatDuration(report.activeMs)} />
                <DetailRow label="Sessions" value={formatCount(report.sessionCount)} />
                <DetailRow label="With extended metrics" value={`${formatCount(report.metricSessionCount)} of ${formatCount(report.sessionCount)}`} />
                <DetailRow label="Sessions with errors" value={formatRate(ratio(report.analytics.sessionsWithErrors, report.metricSessionCount))} />
              </>
            ) : <p className="text-slate-400 text-sm">This account sent no data on this day</p>}
          </DetailSection>
        </div>

        {report && !account.hasMetrics && (
          <Notice tone="warning">This account's sessions on this day came from a client without extended metrics, so only time is available.</Notice>
        )}
        {report && account.hasMetrics && report.hasLegacyClients && (
          <Notice tone="warning">Some sessions on this day came from a client without extended metrics; the counts below cover {report.metricSessionCount} of {report.sessionCount} sessions.</Notice>
        )}
        {report && account.hasMetrics && (
          <>
            <h4 className="text-white font-semibold">Day {formatDay(day)}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {counterRows(report.analytics, {
                profilesCreated: report.analytics.profilesCreated, profilesUsed: report.analytics.profilesUsed,
                current: isToday ? report.analytics.currentRunningProfiles : null, peak: report.analytics.peakRunningProfiles
              })}
            </div>
            {Object.keys(report.versions).length > 0 && (
              <DetailSection title="Versions used this day">
                {Object.entries(report.versions).map(([version, v]) => (
                  <DetailRow key={version} label={version} value={`${v.sessions} sessions · ${formatDuration(v.activeMs)} active`} />
                ))}
              </DetailSection>
            )}
          </>
        )}

        {stats && (
          <>
            <h4 className="text-white font-semibold">Lifetime</h4>
            <p className="text-xs text-slate-400 -mt-2">Everything instrumented for this account so far, whatever day is selected. Profiles are only counted per day.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {counterRows(stats.lifetimeAnalytics, { peak: stats.lifetimeAnalytics.peakRunningProfiles })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Page ----------

const SORT_COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'email', label: 'Email' },
  { key: 'online', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'openMs', label: 'Open', numeric: true },
  { key: 'activeMs', label: 'Active', numeric: true },
  { key: 'sessions', label: 'Sessions', numeric: true },
  { key: 'launchSucceeded', label: 'Launches OK', numeric: true },
  { key: 'launchFailed', label: 'Failed', numeric: true },
  { key: 'launchSuccessRate', label: 'Success', numeric: true },
  { key: 'profilesUsed', label: 'Profiles', numeric: true },
  { key: 'crashes', label: 'Crashes', numeric: true },
  { key: 'clicks', label: 'Clicks', numeric: true },
  { key: 'activeDays7', label: '7d', numeric: true },
  { key: 'activeDays30', label: '30d', numeric: true },
  { key: 'lastSeenAt', label: 'Last data', numeric: true }
];

const inputClass = 'px-3 py-2 bg-slate-800/50 border-2 border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 disabled:opacity-50';
const buttonClass = 'px-3 py-2 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 text-slate-200 text-sm font-semibold hover:border-emerald-500/50 hover:text-emerald-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const MajorDesktopMetricsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const today = dayInCaracas(Date.now());
  const minDay = addDays(today, -365);

  const [day, setDay] = useState(today);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [progress, setProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<Loaded | null>(null);

  const [range, setRange] = useState<7 | 30>(7);
  const [trend, setTrend] = useState<{ key: string; points: TrendPoint[] } | null>(null);
  const [trendStatus, setTrendStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [trendProgress, setTrendProgress] = useState('');
  // Day totals already fetched in this visit; Refresh empties it because packets can arrive up to 7 days late
  const dayCache = useRef<{ [day: string]: DayTotals }>({});

  const [filters, setFilters] = useState<AccountFilters>({ search: '', scope: 'day', online: 'all', version: '' });
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'activeMs', direction: 'desc' });
  const [selected, setSelected] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(TABLE_STEP);
  const [detailUid, setDetailUid] = useState<string | null>(null);
  const [showLifetime, setShowLifetime] = useState(false);

  const getToken = useRef<() => Promise<string>>(async () => '');
  getToken.current = async () => {
    if (!currentUser) throw new UsageApiError(401, 'Signed out');
    return currentUser.getIdToken();
  };

  const isToday = day === today;

  // Day report and account stats; a failed or superseded load never leaves older data on screen
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setData(null);
    setErrorMessage('');
    setSelected([]);
    setDetailUid(null);
    setVisibleCount(TABLE_STEP);
    setProgress('');
    const pages = { report: 0, stats: 0, rows: 0 };
    const onPage = (key: 'report' | 'stats') => (page: number) => {
      pages[key] = page;
      setProgress(`Day report page ${pages.report || '…'}, accounts page ${pages.stats || '…'}`);
    };
    const token = () => getToken.current();
    Promise.all([
      fetchAllPages('getDesktopUsageReport', day, token, toReportRow, controller.signal, onPage('report')),
      fetchAllPages('getDesktopUsageStats', day, token, toStatsRow, controller.signal, onPage('stats'))
    ]).then(([report, stats]) => {
      if (controller.signal.aborted) return;
      const totals = summarizeReport(report.rows);
      dayCache.current[day] = totals;
      setData({
        day, refreshKey, report, stats, totals,
        summary: sumStatsSummaries(stats.summaries),
        accounts: mergeAccounts(report.rows, stats.rows),
        loadedAt: Date.now()
      });
      setStatus('ready');
    }).catch(error => {
      if (controller.signal.aborted || isAbort(error)) return;
      if (error instanceof UsageApiError && error.status === 403) setStatus('denied');
      else if (error instanceof UsageApiError && error.status === 401) setStatus('expired');
      else {
        console.error('MajorStealth metrics error:', error);
        setErrorMessage(error instanceof UsageApiError && error.status === 400
          ? 'The backend rejected this day. Pick a day within the last year.'
          : 'The metrics could not be loaded. Check your connection and try again.');
        setStatus('error');
      }
    });
    return () => controller.abort();
  }, [day, refreshKey]);

  // Trends: one report per day, at most TREND_CONCURRENCY at a time, reusing days already fetched
  const trendKey = `${day}|${range}|${refreshKey}`;
  useEffect(() => {
    // Until the current load finishes, data is the previous day or refresh and must not start a trend
    if (!data || data.day !== day || data.refreshKey !== refreshKey) return;
    const controller = new AbortController();
    const days = dayRange(day, range);
    // No account was seen before the first day, so those days are not requested
    const first = firstDataDay(data.stats.rows);
    const missing = days.filter(d => !dayCache.current[d] && !!first && d >= first);
    const build = () => {
      const newUsers = newUsersByDay(data.stats.rows);
      setTrend({ key: trendKey, points: days.map(d => trendPoint(d, dayCache.current[d], newUsers[d] || 0, first)) });
      setTrendStatus('idle');
    };
    if (missing.length === 0) {
      build();
      return;
    }
    setTrend(null);
    setTrendStatus('loading');
    let done = 0;
    setTrendProgress(`0 of ${missing.length} days`);
    runLimited(missing.map(d => async () => {
      const result = await fetchAllPages('getDesktopUsageReport', d, () => getToken.current(), toReportRow, controller.signal);
      dayCache.current[d] = summarizeReport(result.rows);
      done++;
      if (!controller.signal.aborted) setTrendProgress(`${done} of ${missing.length} days`);
    }), TREND_CONCURRENCY, controller.signal).then(() => {
      if (!controller.signal.aborted) build();
    }).catch(error => {
      if (controller.signal.aborted || isAbort(error)) return;
      console.error('MajorStealth trend error:', error);
      if (error instanceof UsageApiError && error.status === 403) setStatus('denied');
      else if (error instanceof UsageApiError && error.status === 401) setStatus('expired');
      else setTrendStatus('error');
    });
    return () => controller.abort();
    // trendKey covers day and range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, trendKey, refreshKey]);

  const refresh = () => {
    dayCache.current = {};
    setTrend(null);
    setRefreshKey(key => key + 1);
  };

  const changeDay = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= minDay && value <= today) setDay(value);
  };

  const versionsInTable = useMemo(() => {
    const set: { [version: string]: true } = {};
    data?.accounts.forEach(account => { if (account.version) set[account.version] = true; });
    return Object.keys(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [data]);

  // Connection is only known for today, so the filter does not apply to other days
  const filtered = useMemo(() => (data
    ? sortAccounts(filterAccounts(data.accounts, isToday ? filters : { ...filters, online: 'all' }), sort.key, sort.direction)
    : []), [data, filters, sort, isToday]);
  const filteredUids = useMemo(() => filtered.map(row => row.uid), [filtered]);
  const selectedVisible = selected.filter(uid => filteredUids.includes(uid));
  const exportRows = selectedVisible.length ? filtered.filter(row => selectedVisible.includes(row.uid)) : filtered;
  const detail = data && detailUid ? data.accounts.find(account => account.uid === detailUid) ?? null : null;

  const setFilter = <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }));
    setVisibleCount(TABLE_STEP);
  };

  const toggleSort = (key: SortKey) => setSort(current => ({
    key, direction: current.key === key ? (current.direction === 'asc' ? 'desc' : 'asc') : key === 'email' || key === 'version' ? 'asc' : 'desc'
  }));

  const downloadCsv = () => {
    if (!data || exportRows.length === 0) return;
    const blob = new Blob(['﻿', accountsToCsv(exportRows, data.day)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `majorstealth-accounts-${data.day}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const signInAgain = async () => {
    await logout();
    navigate('/signin');
  };

  const header = (
    <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 text-left">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">MajorStealth Metrics</h1>
          <p className="text-slate-300 text-md">Usage reported by the MajorStealth desktop app, by day in Caracas time (UTC−4)</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Day
            <input type="date" value={day} min={minDay} max={today} onChange={event => changeDay(event.target.value)} className={`${inputClass} mt-1 normal-case`} aria-label="Day" />
          </label>
          <button type="button" className={buttonClass} disabled={isToday} onClick={() => setDay(today)}>Today</button>
          <button type="button" className={`${buttonClass} flex items-center gap-2`} onClick={refresh} disabled={status === 'loading' || trendStatus === 'loading'} aria-label="Refresh metrics">
            <Icon d={ICONS.refresh} className={`w-4 h-4 ${status === 'loading' ? 'animate-spin text-emerald-300' : ''}`} />Refresh
          </button>
        </div>
      </div>
      {data && (
        <p className="mt-3 text-xs text-slate-400">
          Loaded {formatCaracasTime(data.report.generatedAt ?? data.loadedAt)} (Caracas) · {formatCount(data.report.rows.length)} accounts reported on {formatDay(data.day)} ·{' '}
          {formatCount(data.stats.rows.length)} tracked accounts ({data.stats.pages} {data.stats.pages === 1 ? 'page' : 'pages'})
        </p>
      )}
    </div>
  );

  if (status === 'denied') {
    return (
      <div className="space-y-6">
        {header}
        <AccessDenied />
      </div>
    );
  }
  if (status === 'expired') {
    return (
      <div className="space-y-6">
        {header}
        <Notice tone="warning" action={<button type="button" onClick={signInAgain} className={buttonClass}>Sign in again</button>}>
          Your session has expired. Sign in again to see the metrics.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {status === 'loading' && (
        <div className="space-y-4" aria-busy="true">
          <Notice tone="info">Loading every page of the day report and the account stats… {progress}</Notice>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 rounded-2xl border border-slate-700/50 bg-slate-800/40 animate-pulse" />)}
          </div>
        </div>
      )}

      {status === 'error' && (
        <Notice tone="error" action={<button type="button" onClick={refresh} className={buttonClass}>Retry</button>}>{errorMessage}</Notice>
      )}

      {status === 'ready' && data && <Dashboard data={data} isToday={isToday} />}

      {status === 'ready' && data && (
        <Panel
          title="Trends"
          subtitle={`The ${range} days ending ${formatDay(day)}. Days before the first account was seen show no data.`}
          actions={
            <div role="group" aria-label="Trend range" className="inline-flex rounded-2xl border-2 border-slate-600/50 bg-slate-800/50 p-1">
              {([7, 30] as const).map(option => (
                <button key={option} type="button" aria-pressed={range === option} onClick={() => setRange(option)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold ${range === option ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                  {option} days
                </button>
              ))}
            </div>
          }
        >
          {trendStatus === 'loading' && <Notice tone="info">Loading daily reports… {trendProgress}</Notice>}
          {trendStatus === 'error' && (
            <Notice tone="error" action={<button type="button" onClick={refresh} className={buttonClass}>Retry</button>}>The daily reports for the trend could not be loaded.</Notice>
          )}
          {trend && trend.key === trendKey && trendStatus === 'idle' && <Trends points={trend.points} />}
        </Panel>
      )}

      {status === 'ready' && data && (
        <Panel title="Accounts" subtitle="Click an account for its detail. Time and launch columns are for the selected day; 7d / 30d are active days.">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-end">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wider text-emerald-300 flex-1 min-w-0">
              Search
              <input type="search" value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Email or user ID" className={`${inputClass} mt-1 normal-case font-normal`} />
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Accounts
              <select value={filters.scope} onChange={event => setFilter('scope', event.target.value as Scope)} className={`${inputClass} mt-1 normal-case font-normal`}>
                <option value="day">Reported this day</option>
                <option value="active30">Active in the last 30 days</option>
                <option value="all">All tracked accounts</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Connection
              <select value={filters.online} onChange={event => setFilter('online', event.target.value as OnlineFilter)} className={`${inputClass} mt-1 normal-case font-normal`} disabled={!isToday}
                title={isToday ? undefined : 'Connection is only known for today'}>
                <option value="all">All</option>
                <option value="online">Connected</option>
                <option value="offline">Not connected</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Version
              <select value={filters.version} onChange={event => setFilter('version', event.target.value)} className={`${inputClass} mt-1 normal-case font-normal`}>
                <option value="">All versions</option>
                {versionsInTable.map(version => <option key={version} value={version}>{version}</option>)}
              </select>
            </label>
            <button type="button" onClick={downloadCsv} disabled={exportRows.length === 0} className={`${buttonClass} flex items-center justify-center gap-2`}>
              <Icon d={ICONS.download} className="w-4 h-4" />
              Export CSV ({formatCount(exportRows.length)} {selectedVisible.length ? 'selected' : 'shown'})
            </button>
          </div>

          <p className="text-xs text-slate-400" aria-live="polite">
            {formatCount(filtered.length)} {filtered.length === 1 ? 'account' : 'accounts'}
            {selectedVisible.length > 0 && <> · {selectedVisible.length} selected · <button type="button" className="text-emerald-300 hover:underline" onClick={() => setSelected([])}>Clear selection</button></>}
          </p>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-slate-700/50 px-4 py-8 text-center text-sm text-slate-400">
              {data.accounts.length === 0 ? 'No account has sent MajorStealth usage yet.' : 'No account matches these filters.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/70 text-slate-300">
                  <tr>
                    <th className="px-3 py-2">
                      <input type="checkbox" aria-label="Select all shown accounts"
                        checked={filteredUids.length > 0 && selectedVisible.length === filteredUids.length}
                        onChange={event => setSelected(event.target.checked ? filteredUids : [])} />
                    </th>
                    {SORT_COLUMNS.map(column => (
                      <th key={column.key} scope="col" className={`px-3 py-2 font-semibold whitespace-nowrap ${column.numeric ? 'text-right' : 'text-left'}`}
                        aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-emerald-300">
                          {column.label}
                          <span className={sort.key === column.key ? 'text-emerald-300' : 'text-slate-500'} aria-hidden="true">
                            {sort.key === column.key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {filtered.slice(0, visibleCount).map(row => {
                    const na = !row.hasMetrics;
                    return (
                      <tr key={row.uid} className="hover:bg-slate-700/30 cursor-pointer" onClick={() => setDetailUid(row.uid)}>
                        <td className="px-3 py-2" onClick={event => event.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${row.email}`} checked={selected.includes(row.uid)}
                            onChange={event => setSelected(current => event.target.checked ? [...current, row.uid] : current.filter(uid => uid !== row.uid))} />
                        </td>
                        <td className="px-3 py-2 text-left max-w-[16rem]">
                          <button type="button" className="text-emerald-300 hover:underline truncate block max-w-full text-left" onClick={event => { event.stopPropagation(); setDetailUid(row.uid); }}>
                            {row.email || row.uid}
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isToday ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
                              <span className={`w-2 h-2 rounded-full ${row.online ? 'bg-green-400' : 'bg-slate-500'}`} />{row.online ? 'Connected' : 'Offline'}
                            </span>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-200">{row.version || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200 whitespace-nowrap">{row.report ? formatDuration(row.openMs) : '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200 whitespace-nowrap">{row.report ? formatDuration(row.activeMs) : '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{row.report ? formatCount(row.sessions) : '—'}</td>
                        {[row.launchSucceeded, row.launchFailed].map((value, i) => (
                          <td key={i} className="px-3 py-2 text-right tabular-nums text-slate-200">{na ? <NotAvailable reported={!!row.report} /> : formatCount(value)}</td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{na ? <NotAvailable reported={!!row.report} /> : formatRate(row.launchSuccessRate)}</td>
                        {[row.profilesUsed, row.crashes, row.clicks].map((value, i) => (
                          <td key={i} className="px-3 py-2 text-right tabular-nums text-slate-200">{na ? <NotAvailable reported={!!row.report} /> : formatCount(value)}</td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{formatCount(row.activeDays7)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{formatCount(row.activeDays30)}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-300 whitespace-nowrap">{formatCaracasTime(row.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > visibleCount && (
            <div className="text-center">
              <button type="button" className={buttonClass} onClick={() => setVisibleCount(count => count + TABLE_STEP)}>
                Show {Math.min(TABLE_STEP, filtered.length - visibleCount)} more of {formatCount(filtered.length - visibleCount)}
              </button>
            </div>
          )}
        </Panel>
      )}

      {status === 'ready' && data && (
        <Panel
          title="Lifetime totals"
          subtitle="Counters accumulated by every tracked account since the instrumentation started. They do not depend on the selected day."
          actions={<button type="button" className={buttonClass} aria-expanded={showLifetime} onClick={() => setShowLifetime(open => !open)}>{showLifetime ? 'Hide' : 'Show'}</button>}
        >
          {showLifetime && <Lifetime rows={data.stats.rows} />}
        </Panel>
      )}

      {detail && data && <AccountDetail account={detail} day={data.day} isToday={isToday} onClose={() => setDetailUid(null)} />}
    </div>
  );
};

const NotAvailable: React.FC<{ reported: boolean }> = ({ reported }) => (
  <span className="text-slate-500" title={reported ? 'Client without extended metrics' : 'No data on this day'}>{reported ? 'n/a' : '—'}</span>
);

const AccessDenied: React.FC = () => (
  <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-8 text-center">
    <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-4">
      <Icon d={ICONS.lock} className="w-8 h-8 text-slate-300" />
    </div>
    <h2 className="text-lg font-bold text-slate-200 mb-1">Access denied</h2>
    <p className="text-slate-400">Only Major Phones administrators with a verified email can see the MajorStealth metrics.</p>
  </div>
);

const Dashboard: React.FC<{ data: Loaded; isToday: boolean }> = ({ data, isToday }) => {
  const { totals, summary } = data;
  const a = totals.analytics;
  const d = derived(a);
  const m = (value: React.ReactNode) => (totals.hasMetrics ? value : 'n/a');
  const versionTotal = totals.versions.reduce((sum, v) => sum + v.sessions, 0);

  return (
    <>
      {totals.accounts === 0 && (
        <Notice tone="info">No account sent MajorStealth usage on {formatDay(data.day)}. Users and lifetime figures below still cover every tracked account.</Notice>
      )}
      {totals.accounts > 0 && !totals.hasMetrics && (
        <Notice tone="warning">No session on this day sent extended metrics (older clients only report time), so sessions, profiles, launches, stability and clicks are not available. They are shown as n/a, not zero.</Notice>
      )}
      {totals.hasMetrics && totals.hasLegacyClients && (
        <Notice tone="warning">
          Some sessions came from clients without extended metrics. Session, profile, launch, stability and click figures cover{' '}
          {formatCount(totals.metricSessionCount)} of {formatCount(totals.sessionCount)} sessions ({formatCount(totals.metricAccounts)} of {formatCount(totals.accounts)} accounts).
        </Notice>
      )}

      <Panel title="Users" subtitle="Active means some active time on a day. New users are counted from their first observed activity in MajorStealth, not from their Major Phones sign-up.">
        <StatGrid label="Active users">
          <Stat label="Daily active" value={formatCount(summary.dailyActiveUsers)} hint={formatDay(data.day)} />
          <Stat label="Weekly active" value={formatCount(summary.weeklyActiveUsers)} hint="Last 7 days" />
          <Stat label="Monthly active" value={formatCount(summary.monthlyActiveUsers)} hint="Last 30 days" />
          <Stat label="Tracked accounts" value={formatCount(summary.accounts)} hint="Ever seen" />
        </StatGrid>
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="min-w-full text-sm" aria-label="New, returning and repeat users">
            <thead className="bg-slate-800/70 text-slate-300">
              <tr><th className="px-3 py-2 text-left">Window</th><th className="px-3 py-2 text-right">New</th><th className="px-3 py-2 text-right">Returning</th><th className="px-3 py-2 text-right">Active on 2+ days</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-200 tabular-nums">
              <tr><td className="px-3 py-2">This day</td><td className="px-3 py-2 text-right">{formatCount(summary.newUsersToday)}</td><td className="px-3 py-2 text-right">{formatCount(summary.returningUsersToday)}</td><td className="px-3 py-2 text-right text-slate-500">—</td></tr>
              <tr><td className="px-3 py-2">Last 7 days</td><td className="px-3 py-2 text-right">{formatCount(summary.newUsers7Days)}</td><td className="px-3 py-2 text-right">{formatCount(summary.returningUsers7Days)}</td><td className="px-3 py-2 text-right">{formatCount(summary.repeatUsers7Days)}</td></tr>
              <tr><td className="px-3 py-2">Last 30 days</td><td className="px-3 py-2 text-right">{formatCount(summary.newUsers30Days)}</td><td className="px-3 py-2 text-right">{formatCount(summary.returningUsers30Days)}</td><td className="px-3 py-2 text-right">{formatCount(summary.repeatUsers30Days)}</td></tr>
            </tbody>
          </table>
        </div>
        <StatGrid label="Connection">
          <Stat label="Connected now" value={isToday ? formatCount(totals.onlineAccounts) : '—'} hint={isToday ? 'Reported in the last 90 s' : 'Only known for today'} />
          <Stat label="Last data received" value={<span className="text-base">{formatCaracasTime(totals.lastReceivedAt)}</span>} hint="Caracas time, for this day" />
          <Stat label="Accounts reporting" value={formatCount(totals.accounts)} hint={`${formatCount(totals.activeAccounts)} with active time`} />
        </StatGrid>
      </Panel>

      <Panel title="Time and sessions" subtitle="Time open counts the authenticated workspace, also in the background. Active time also needs the app or one of its browsers in front and recent input.">
        <StatGrid label="Time and sessions">
          <Stat label="Time open" value={formatDuration(totals.openMs)} />
          <Stat label="Active time" value={formatDuration(totals.activeMs)} hint={`${formatRate(ratio(totals.activeMs, totals.openMs))} of time open`} />
          <Stat label="Sessions this day" value={formatCount(totals.sessionCount)} hint="Sessions that reported on this day" />
          <Stat label="Sessions started" value={m(formatCount(a.sessionStarts))} />
          <Stat label="Sessions completed" value={m(formatCount(a.sessionCompletions))} hint="Closed cleanly" />
          <Stat label="Average session" value={m(formatDuration(d.averageCompletedSessionMs))} hint="Completed sessions only" />
        </StatGrid>
      </Panel>

      <Panel title="Profiles" subtitle="Profiles are counted per account; the backend does not record a simultaneous peak across all accounts.">
        <StatGrid label="Profiles">
          <Stat label="Created" value={m(formatCount(totals.profilesCreated))} />
          <Stat label="Used" value={m(formatCount(totals.profilesUsed))} />
          <Stat label="Open now" value={isToday ? m(formatCount(totals.currentRunningProfiles)) : '—'} hint={isToday ? 'Connected apps' : 'Only known for today'} />
          <Stat label="Highest account peak" value={m(formatCount(totals.maxAccountPeak))} hint="Most profiles one account had open at once" />
        </StatGrid>
      </Panel>

      <Panel title="Launches" subtitle="Success rate = succeeded ÷ (succeeded + failed); cancelled and pending launches are left out. Average duration covers successful launches.">
        <StatGrid label="Launches">
          <Stat label="Attempts" value={m(formatCount(a.launchAttempts))} />
          <Stat label="Succeeded" value={m(formatCount(a.launchSucceeded))} />
          <Stat label="Failed" value={m(formatCount(a.launchFailed))} />
          <Stat label="Cancelled" value={m(formatCount(a.launchCancelled))} />
          <Stat label="Success rate" value={m(formatRate(d.launchSuccessRate))} />
          <Stat label="Average launch" value={m(formatDuration(d.averageLaunchMs))} />
        </StatGrid>
        {totals.hasMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BarList title="Failures by cause" color={FAILED} items={FAILURE_REASONS.map(reason => ({ label: FAILURE_LABELS[reason], value: a.failures[reason] }))} />
            <BarChart title="Successful launch duration" series={[{ name: 'Launches', color: SERIES[1] }]} format={formatCount} categories
              points={LAUNCH_BUCKET_LABELS.map((label, i) => ({ label, values: [a.launchDurationBuckets[i]], available: true }))} />
          </div>
        )}
      </Panel>

      <Panel title="Stability" subtitle="Unclean closures are sessions found unclosed on the next start: they include power loss and forced quits, so they are not all crashes.">
        <StatGrid label="Stability">
          <Stat label="App process crashes" value={m(formatCount(a.appProcessCrashes))} />
          <Stat label="Abnormal browser exits" value={m(formatCount(a.browserCrashes))} />
          <Stat label="Runtime errors" value={m(formatCount(a.runtimeErrors))} />
          <Stat label="Unclean closures" value={m(formatCount(a.uncleanAppClosures))} hint="Not necessarily crashes" />
          <Stat label="Sessions with errors" value={m(formatRate(totals.sessionsWithErrorsRate))} hint="Of session-days with extended metrics" />
        </StatGrid>
        {totals.hasMetrics && (
          <BarList title="App process crashes by process" color={SERIES[2]} items={CRASH_REASONS.map(reason => ({ label: CRASH_LABELS[reason], value: a.crashes[reason] }))} />
        )}
      </Panel>

      <Panel title="Clicks" subtitle="Clicks on partner links inside the app. A click is counted even if Windows fails to open it; clicks are not purchases or conversions.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BarList title="Clicks by link" color={SERIES[3]} items={CLICK_TARGETS.map(target => ({ label: CLICK_LABELS[target], value: totals.hasMetrics ? a.clicks[target] : null }))} />
          <div role="group" aria-label="Click totals" className="grid grid-cols-2 gap-3 content-start">
            <Stat label="Total clicks" value={m(formatCount(d.totalClicks))} />
            <Stat label="Link open failures" value={m(formatCount(a.externalOpenFailures))} hint="Windows could not open the link" />
          </div>
        </div>
      </Panel>

      <Panel title="Versions" subtitle="Accounts by the version of their latest report this day; sessions, time and launches by the version that sent them.">
        {totals.versions.length === 0 ? (
          <p className="text-sm text-slate-400">No versions reported on this day.</p>
        ) : (
          <>
            <BarList title="Sessions by version" color={SERIES[1]} items={totals.versions.map(v => ({ label: v.version, value: v.sessions, note: versionTotal ? `(${formatRate(v.sessions / versionTotal)})` : undefined }))} />
            <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
              <table className="min-w-full text-sm" aria-label="Versions">
                <thead className="bg-slate-800/70 text-slate-300">
                  <tr>
                    {['Version', 'Accounts', 'Sessions', 'Open', 'Active', 'Launches OK', 'Failed', 'Success', 'Avg launch', 'Crashes', 'Runtime errors', 'Unclean closures'].map((label, i) => (
                      <th key={label} className={`px-3 py-2 whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-200 tabular-nums">
                  {totals.versions.map(v => (
                    <tr key={v.version}>
                      <td className="px-3 py-2 text-left">{v.version}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.accounts)}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.sessions)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatDuration(v.openMs)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatDuration(v.activeMs)}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.launchSucceeded)}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.launchFailed)}</td>
                      <td className="px-3 py-2 text-right">{formatRate(ratio(v.launchSucceeded, v.launchSucceeded + v.launchFailed))}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatDuration(ratio(v.launchDurationMs, v.launchDurationCount))}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.crashes)}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.runtimeErrors)}</td>
                      <td className="px-3 py-2 text-right">{formatCount(v.uncleanAppClosures)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
};

const Trends: React.FC<{ points: TrendPoint[] }> = ({ points }) => {
  const label = (dayKey: string) => formatDay(dayKey, { month: 'short', day: 'numeric' });
  const bars = (read: (p: TrendPoint) => number[]) => points.map(p => ({ label: label(p.day), values: read(p), available: p.available }));
  const hours = (ms: number) => `${(ms / 3600000).toFixed(ms < 36000000 ? 1 : 0)} h`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <BarChart title="Daily active users" series={[{ name: 'Active users', color: SERIES[0] }]} format={formatCount} points={bars(p => [p.dailyActiveUsers])} />
      <BarChart title="Active time" series={[{ name: 'Active time', color: SERIES[1] }]} format={hours} points={bars(p => [p.activeMs])} />
      <BarChart title="New users (first observed activity)" series={[{ name: 'New users', color: SERIES[2] }]} format={formatCount} points={bars(p => [p.newUsers])} />
      <BarChart title="Launches" series={[{ name: 'Succeeded', color: SERIES[0] }, { name: 'Failed', color: FAILED }]} format={formatCount}
        points={bars(p => [p.launchSucceeded, p.launchFailed])} />
    </div>
  );
};

const Lifetime: React.FC<{ rows: StatsRow[] }> = ({ rows }) => {
  const { counters: c, sessionDaysWithErrors, maxAccountPeak } = useMemo(() => summarizeLifetime(rows), [rows]);
  const d = derived(c);
  return (
    <StatGrid label="Lifetime">
      <Stat label="Sessions started" value={formatCount(c.sessionStarts)} />
      <Stat label="Average session" value={formatDuration(d.averageCompletedSessionMs)} hint="Completed sessions" />
      <Stat label="Launch attempts" value={formatCount(c.launchAttempts)} />
      <Stat label="Launch success rate" value={formatRate(d.launchSuccessRate)} />
      <Stat label="Average launch" value={formatDuration(d.averageLaunchMs)} />
      <Stat label="App process crashes" value={formatCount(c.appProcessCrashes)} />
      <Stat label="Abnormal browser exits" value={formatCount(c.browserCrashes)} />
      <Stat label="Runtime errors" value={formatCount(c.runtimeErrors)} />
      <Stat label="Unclean closures" value={formatCount(c.uncleanAppClosures)} hint="Not necessarily crashes" />
      <Stat label="Session-days with errors" value={formatCount(sessionDaysWithErrors)} />
      <Stat label="Highest account peak" value={formatCount(maxAccountPeak)} hint="Profiles open at once" />
      {CLICK_TARGETS.map(target => <Stat key={target} label={`${CLICK_LABELS[target]} clicks`} value={formatCount(c.clicks[target])} />)}
      <Stat label="Link open failures" value={formatCount(c.externalOpenFailures)} />
    </StatGrid>
  );
};

// The backend checks the admin again on every request; this only avoids calls that would be refused
const MajorDesktopMetrics: React.FC = () => {
  const { currentUser } = useAuth();
  if (!canViewDesktopMetrics(currentUser)) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 text-left">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">MajorStealth Metrics</h1>
        </div>
        <AccessDenied />
      </div>
    );
  }
  return <MajorDesktopMetricsView />;
};

export default MajorDesktopMetrics;
