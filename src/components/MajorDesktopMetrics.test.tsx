import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MajorDesktopMetrics from './MajorDesktopMetrics';
import MajorSidebar from './MajorSidebar';
import { analytics, reportRow, statsRow, mockUsageApi, callsTo } from './desktopUsage.fixtures';

const mockAuth: { currentUser: any; logout: jest.Mock } = { currentUser: null, logout: jest.fn() };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../firebase/config', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));

const DAY = '2026-11-02';
const user = (email: string, emailVerified = true) => ({ uid: 'admin-uid', email, emailVerified, getIdToken: () => Promise.resolve('id-token-1') });
const uid = (i: number) => `u${String(i).padStart(4, '0')}`;

// 230 accounts reported today (two report pages) out of 260 tracked (two stats pages)
const todayReport = Array.from({ length: 230 }, (_, i) => reportRow(uid(i), {
  activeMs: i % 10 === 0 ? 0 : 60000,
  online: i < 5,
  version: i % 2 ? '1.0.9' : '1.1.0',
  analytics: analytics({ launchAttempts: 2, launchSucceeded: 1, launchFailed: i % 3 === 0 ? 1 : 0, launchDurationMs: 4000, launchDurationCount: 1,
    launchDurationBuckets: [0, 0, 1, 0, 0, 0, 0, 0], failures: { proxy: i % 3 === 0 ? 1 : 0, connection: 0, configuration: 0, browser: 0, unknown: 0 },
    peakRunningProfiles: i % 7, currentRunningProfiles: i < 5 ? 1 : 0, clicks: { virtualNumbers: 1, hydraproxy: 0, weproxy: 0, catproxies: 0 } })
}));
todayReport.push(reportRow('zed', { email: 'zed@example.com', version: '1.1.0', analytics: analytics({ launchSucceeded: 4, launchDurationCount: 4, launchDurationMs: 8000, launchDurationBuckets: [0, 4, 0, 0, 0, 0, 0, 0] }) }));
const stats = [
  ...Array.from({ length: 260 }, (_, i) => statsRow(uid(i), { activeToday: i < 230 && i % 10 !== 0, activeDays7: i < 230 ? 2 : 0, activeDays30: i < 250 ? 2 : 0,
    newToday: i < 3, firstSeenDay: i === 0 ? '2026-10-10' : '2026-10-30', firstActiveDay: i < 3 ? DAY : '2026-10-30' })),
  statsRow('zed', { email: 'zed@example.com', activeToday: true, lifetimeAnalytics: { ...analytics({ launchSucceeded: 77 }), sessionDaysWithErrors: 0 } })
];
const otherDays = { '2026-10-30': [reportRow(uid(1))], '2026-11-01': [reportRow(uid(2)), reportRow(uid(3))] };
const DATA = { report: { [DAY]: todayReport, ...otherDays }, stats: { [DAY]: stats } };

const renderPage = () => render(
  <MemoryRouter initialEntries={['/major-desktop-metrics']}>
    <Routes>
      <Route path="/major-desktop-metrics" element={<MajorDesktopMetrics />} />
      <Route path="/signin" element={<p>Sign in page</p>} />
    </Routes>
  </MemoryRouter>
);

const stat = (group: string, label: string) => {
  const tile = within(screen.getByRole('group', { name: group })).getByText(label).parentElement as HTMLElement;
  return tile.querySelector('p:nth-child(2)')?.textContent;
};

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T15:00:00Z'));
  mockAuth.currentUser = user('orlianpay2@gmail.com');
  mockAuth.logout = jest.fn(() => Promise.resolve());
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('access', () => {
  test.each([
    ['a regular user', user('someone@example.com')],
    ['an unverified admin email', user('orlianpay2@gmail.com', false)]
  ])('%s sees access denied and nothing is fetched', async (_, currentUser) => {
    mockAuth.currentUser = currentUser;
    const { fetchMock } = mockUsageApi(DATA);
    renderPage();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    ['orlianpay2@gmail.com', true],
    ['marylorenaosuna@gmail.com', true],
    ['someone@example.com', false]
  ])('the sidebar shows MajorStealth Metrics to %s: %s', (email, visible) => {
    mockAuth.currentUser = user(email);
    render(<MemoryRouter initialEntries={['/major-history']}><MajorSidebar /></MemoryRouter>);
    const link = screen.queryByRole('link', { name: 'MajorStealth Metrics' });
    if (visible) expect(link).toHaveAttribute('href', '/major-desktop-metrics');
    else expect(link).not.toBeInTheDocument();
  });

  test('a 403 from the backend shows access denied', async () => {
    mockAuth.currentUser = user('marylorenaosuna@gmail.com');
    mockUsageApi(DATA, () => ({ status: 403, json: { error: 'Administrator access required' } }));
    renderPage();
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  test('a 401 asks to sign in again', async () => {
    mockUsageApi(DATA, () => ({ status: 401, json: { error: 'Sign in to MajorPhones' } }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in again' }));
    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(mockAuth.logout).toHaveBeenCalled();
  });
});

test('totals cover every page of both endpoints', async () => {
  const { fetchMock } = mockUsageApi(DATA);
  renderPage();
  await screen.findByRole('region', { name: 'Users' });

  expect(callsTo(fetchMock, 'getDesktopUsageStats')).toEqual([{ day: DAY, cursor: null }, { day: DAY, cursor: 'u0199' }]);
  expect(callsTo(fetchMock, 'getDesktopUsageReport').filter(call => call.day === DAY)).toEqual([{ day: DAY, cursor: null }, { day: DAY, cursor: 'u0199' }]);
  // 230 report rows with 23 of them without active time, plus zed
  expect(stat('Active users', 'Daily active')).toBe('208');
  expect(stat('Active users', 'Weekly active')).toBe('231');
  expect(stat('Active users', 'Monthly active')).toBe('251');
  expect(stat('Active users', 'Tracked accounts')).toBe('261');
  expect(stat('Connection', 'Connected now')).toBe('5');
  expect(stat('Profiles', 'Open now')).toBe('5');
  // Highest single account, never the sum of 231 peaks
  expect(stat('Profiles', 'Highest account peak')).toBe('6');
  // 234 succeeded, 77 failed: 234 / 311
  expect(stat('Launches', 'Success rate')).toBe('75.2%');
  expect(stat('Launches', 'Average launch')).toBe("4.0 s");
  expect(screen.getByText('231 accounts')).toBeInTheDocument();
});

test('a failed refresh does not leave the previous figures on screen', async () => {
  let fail = false;
  mockUsageApi(DATA, () => (fail ? { status: 500, json: { error: 'Usage service unavailable' } } : undefined));
  renderPage();
  await screen.findByRole('region', { name: 'Users' });
  fail = true;
  fireEvent.click(screen.getByRole('button', { name: 'Refresh metrics' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByRole('region', { name: 'Users' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Accounts' })).not.toBeInTheDocument();
});

test('refresh refetches the trend days once, only after the new day load', async () => {
  let release: () => void = () => {};
  let hold = false;
  const { fetchMock } = mockUsageApi(DATA, (endpoint, day) => (hold && day === DAY && endpoint === 'getDesktopUsageReport'
    ? new Promise(resolve => { release = () => resolve({ status: 200, json: { day, rows: [], nextCursor: null } }); })
    : undefined));
  renderPage();
  expect((await screen.findAllByText('Daily active users')).length).toBeGreaterThan(0);
  const weekCalls = () => callsTo(fetchMock, 'getDesktopUsageReport').filter(call => call.day === '2026-11-01').length;
  expect(weekCalls()).toBe(1);

  hold = true;
  fireEvent.click(screen.getByRole('button', { name: 'Refresh metrics' }));
  await waitFor(() => expect(callsTo(fetchMock, 'getDesktopUsageStats')).toHaveLength(4));
  // The previous load must not start trend requests while the new one is pending
  expect(weekCalls()).toBe(1);
  release();
  await screen.findByRole('region', { name: 'Users' });
  await waitFor(() => expect(weekCalls()).toBe(2));
});

test('trends fetch each missing day once, three at a time, and reuse them', async () => {
  const { fetchMock, state } = mockUsageApi(DATA);
  renderPage();
  expect((await screen.findAllByText('Daily active users')).length).toBeGreaterThan(0);
  const reportDays = () => callsTo(fetchMock, 'getDesktopUsageReport').filter(call => !call.cursor).map(call => call.day);
  // The selected day comes from the main load; the other 6 days of the week are fetched once
  expect(reportDays().sort()).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', DAY]);

  fireEvent.click(screen.getByRole('button', { name: '30 days' }));
  expect((await screen.findAllByText('Daily active users')).length).toBeGreaterThan(0);
  // Only days since the first account was seen (Oct 10), and none of the week again
  const days = reportDays();
  expect(days).toHaveLength(24);
  expect(new Set(days).size).toBe(24);
  expect(days.some(d => (d as string) < '2026-10-10')).toBe(false);
  expect(state.maxActive).toBeLessThanOrEqual(3);

  // Oct 4 is before any account was seen: shown as no data
  expect(screen.getAllByLabelText('Oct 4: no data').length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(/^Nov 1: Active users 2$/)).toHaveLength(1);
});

test('search, detail and CSV of the selected accounts', async () => {
  mockUsageApi(DATA);
  let csv = '';
  (URL as any).createObjectURL = jest.fn((blob: Blob) => {
    const reader = new FileReader();
    reader.onload = () => { csv = String(reader.result); };
    reader.readAsText(blob);
    return 'blob:csv';
  });
  (URL as any).revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  renderPage();
  await screen.findByRole('region', { name: 'Accounts' });

  fireEvent.change(screen.getByPlaceholderText('Email or user ID'), { target: { value: 'zed' } });
  expect(screen.getByText('1 account')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'zed@example.com' }));
  const dialog = screen.getByRole('dialog', { name: 'Account zed@example.com' });
  expect(within(dialog).getByText('Lifetime')).toBeInTheDocument();
  expect(within(dialog).getAllByText('77').length).toBeGreaterThan(0);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close account detail' }));

  fireEvent.change(screen.getByPlaceholderText('Email or user ID'), { target: { value: '' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.0.9' } });
  expect(screen.getByText('115 accounts')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select u0001@example.com' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select u0003@example.com' }));
  fireEvent.click(screen.getByRole('button', { name: /Export CSV \(2 selected\)/ }));

  expect(click).toHaveBeenCalled();
  await waitFor(() => expect(csv).not.toBe(''));
  const lines = csv.replace(/^﻿/, '').split('\r\n');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toMatch(/^"day","email","uid"/);
  expect(lines.slice(1).map(line => JSON.parse(line.split(',')[1])).sort()).toEqual(['u0001@example.com', 'u0003@example.com']);
});

test('a day with only legacy clients shows n/a instead of zero', async () => {
  const legacy = { report: { [DAY]: [reportRow('old', { metricSessionCount: 0, hasLegacyClients: true })] }, stats: { [DAY]: [statsRow('old')] } };
  mockUsageApi(legacy);
  renderPage();
  await screen.findByRole('region', { name: 'Users' });
  expect(screen.getByText(/No session on this day sent extended metrics/)).toBeInTheDocument();
  expect(stat('Launches', 'Success rate')).toBe('n/a');
  expect(stat('Time and sessions', 'Time open')).toBe('1h 0m');
});
