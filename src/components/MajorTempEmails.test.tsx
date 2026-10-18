import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MajorTempEmails from './MajorTempEmails';
import MajorSidebar from './MajorSidebar';

const mockAuth: { currentUser: any; logout: jest.Mock } = { currentUser: null, logout: jest.fn() };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
// MajorSidebar signs out with Firebase directly
jest.mock('../firebase/config', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));

const USER_URL = 'https://getusertempemails-ezeznlhr5a-uc.a.run.app';
const RECENT_URL = 'https://getrecenttempemails-ezeznlhr5a-uc.a.run.app';

const user = (email: string, emailVerified = true) => ({ uid: 'admin-uid', email, emailVerified, getIdToken: () => Promise.resolve('id-token-1') });
const ADMIN = user('orlianpay2@gmail.com');

const GOOGLE_MESSAGE = {
  id: 9,
  from: { name: 'Google', address: 'no-reply@accounts.google.com' },
  subject: 'G-482913 is your Google verification code',
  body: '<p>Use this code to verify:</p><p><b>482913</b></p><script>alert(1)</script>',
  receivedAt: '2026-10-16T12:30:00.000000Z',
};

const ACTIVE_EMAIL = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'old.user@school.edu',
  status: 'active',
  messageCount: 1,
  createdAt: '2026-10-16T10:00:00.000Z',
  lastCheckedAt: '2026-10-16T12:40:00.000Z',
  uid: 'student-uid',
  ownerEmail: 'student@example.com',
  provider: 'tempamail',
  accessUrl: 'https://tempamail.com/access?key=abc123',
  inbox: { status: 'active', messages: [GOOGLE_MESSAGE] },
};
const EXPIRED_EMAIL = {
  ...ACTIVE_EMAIL,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'gone.user@college.edu',
  status: 'expired',
  messageCount: 0,
  inbox: { status: 'expired', messages: [] },
};
const UNAVAILABLE_EMAIL = {
  ...ACTIVE_EMAIL,
  id: '33333333-3333-4333-8333-333333333333',
  email: 'busy.user@campus.edu',
  messageCount: 4,
  ownerEmail: 'other@example.com',
  inbox: { status: 'unavailable', messages: [] },
};

const quota = { dailyLimit: 5, usedToday: 3, remainingToday: 2, resetsAt: '2026-10-19T00:00:00.000Z' };
const userReply = (tempEmails: object[], total = tempEmails.length) => ({
  status: 200,
  json: { success: true, user: { uid: 'student-uid', email: 'student@example.com' }, quota, total, tempEmails },
});
const recentReply = (tempEmails: object[]) => ({ status: 200, json: { success: true, tempEmails } });

type Reply = { status: number; json: unknown };

// Answers each Cloud Function URL with its own queue of replies; a reply can be a promise to hold the request
const mockApi = (replies: { [url: string]: (Reply | Promise<Reply>)[] }) => {
  const fetchMock = jest.fn(async (url: string) => {
    const reply = await replies[url]?.shift();
    if (!reply) throw new Error(`Unexpected call to ${url}`);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.json };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const bodiesOf = (fetchMock: jest.Mock, url: string) =>
  fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url).map(([, init]) => JSON.parse(init.body));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/major-temp-emails']}>
    <Routes>
      <Route path="/major-temp-emails" element={<MajorTempEmails />} />
      <Route path="/major-history" element={<p>Admin history page</p>} />
      <Route path="/signin" element={<p>Sign in page</p>} />
    </Routes>
  </MemoryRouter>
);

const search = (email: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
};

const emailCard = (address: string) => screen.findByRole('button', { name: new RegExp(address.replace(/\./g, '\\.')) });

beforeEach(() => {
  mockAuth.currentUser = ADMIN;
  mockAuth.logout = jest.fn(() => Promise.resolve());
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('access', () => {
  test.each([
    ['the other admin', user('marylorenaosuna@gmail.com')],
    ['an unverified orlianpay2 account', user('orlianpay2@gmail.com', false)],
    ['a regular user', user('someone@example.com')],
  ])('%s is sent to the admin history and nothing is fetched', async (_, currentUser) => {
    mockAuth.currentUser = currentUser;
    const fetchMock = mockApi({});
    renderPage();

    expect(await screen.findByText('Admin history page')).toBeInTheDocument();
    expect(screen.queryByText('Temp Emails')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    ['orlianpay2@gmail.com', true],
    ['marylorenaosuna@gmail.com', false],
  ])('the admin sidebar shows Temp Emails to %s: %s', (email, visible) => {
    mockAuth.currentUser = user(email);
    render(<MemoryRouter initialEntries={['/major-history']}><MajorSidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
    const link = screen.queryByRole('link', { name: 'Temp Emails' });
    if (visible) expect(link).toHaveAttribute('href', '/major-temp-emails');
    else expect(link).not.toBeInTheDocument();
  });
});

describe('By user', () => {
  test('searches with the raw ID token, shows the loading state, then the quota and the emails', async () => {
    let answer: (reply: Reply) => void = () => {};
    const fetchMock = mockApi({ [USER_URL]: [new Promise<Reply>(resolve => { answer = resolve; })] });
    renderPage();

    search('  student@example.com ');

    expect(await screen.findByText('Reading inboxes live…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(USER_URL, expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'id-token-1', 'Content-Type': 'application/json' },
    })));
    expect(bodiesOf(fetchMock, USER_URL)).toEqual([{ email: 'student@example.com', limit: 20 }]);

    answer(userReply([ACTIVE_EMAIL, EXPIRED_EMAIL]));

    expect(await screen.findByText('Viewing temp emails for:')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Reading inboxes live…')).not.toBeInTheDocument();
    const quotaStats = screen.getByLabelText('Daily quota');
    expect(within(quotaStats).getByText('Used today').nextSibling).toHaveTextContent('3 / 5');
    expect(within(quotaStats).getByText('Left today').nextSibling).toHaveTextContent('2');
    expect(within(quotaStats).getByText('Total emails').nextSibling).toHaveTextContent('2');
    expect(within(quotaStats).getByText('00:00 UTC')).toBeInTheDocument();
    expect(screen.getByText('2 emails')).toBeInTheDocument();
    expect(await emailCard('old.user@school.edu')).toHaveTextContent('Active');
    expect(await emailCard('gone.user@college.edu')).toHaveTextContent('Expired');
  });

  test('an email expands to its details and messages, and a message opens in a sandboxed frame', async () => {
    mockApi({ [USER_URL]: [userReply([ACTIVE_EMAIL])] });
    renderPage();
    search('student@example.com');

    const card = await emailCard('old.user@school.edu');
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('tempamail')).not.toBeInTheDocument();
    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('tempamail')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ACTIVE_EMAIL.accessUrl })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('student-uid')).toBeInTheDocument();

    const messages = screen.getByRole('list', { name: 'Messages of old.user@school.edu' });
    const row = within(messages).getByRole('button', { name: /Google/ });
    expect(row).toHaveTextContent('G-482913 is your Google verification code');
    expect(row).toHaveTextContent('Use this code to verify: 482913');
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(row);

    expect(screen.getByText(/no-reply@accounts\.google\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy code 482913' })).toBeInTheDocument();
    const frame = screen.getByTitle('Message content');
    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts|allow-forms/);
    expect(frame.getAttribute('srcdoc')).toContain('<b>482913</b>');
    expect(frame.getAttribute('srcdoc')).toContain('<base target="_blank">');
    expect(frame.getAttribute('srcdoc')).toContain("script-src 'none'");
  });

  test('expired and unavailable inboxes say why there are no messages', async () => {
    mockApi({ [USER_URL]: [userReply([EXPIRED_EMAIL, UNAVAILABLE_EMAIL])] });
    renderPage();
    search('student@example.com');

    fireEvent.click(await emailCard('gone.user@college.edu'));
    expect(screen.getByText(/no longer has this inbox/)).toBeInTheDocument();

    const unavailable = await emailCard('busy.user@campus.edu');
    expect(unavailable).toHaveTextContent('Unavailable');
    expect(unavailable).toHaveTextContent('4 messages');
    fireEvent.click(unavailable);
    expect(screen.getByText(/could not be read right now/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Messages of/ })).not.toBeInTheDocument();
  });

  test('an empty email and an unknown user show the error modal', async () => {
    const fetchMock = mockApi({ [USER_URL]: [{ status: 404, json: { success: false, message: 'User not found' } }] });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(within(screen.getByRole('alertdialog')).getByText('Please enter an email address')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }));

    search('nobody@example.com');
    expect(await screen.findByText('User not found')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('nobody@example.com');
    expect(screen.queryByText('Viewing temp emails for:')).not.toBeInTheDocument();
  });

  test('a 403 signs out and goes to sign in', async () => {
    mockApi({ [USER_URL]: [{ status: 403, json: { success: false, message: 'Forbidden' } }] });
    renderPage();
    search('student@example.com');

    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
  });

  test('Load up to 50 asks again when the user has more emails than shown, and Go back returns to the search', async () => {
    const fetchMock = mockApi({ [USER_URL]: [userReply([ACTIVE_EMAIL], 25), userReply([ACTIVE_EMAIL, EXPIRED_EMAIL], 25)] });
    renderPage();
    search('student@example.com');

    expect(await screen.findByText('Showing the 1 newest of 25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load up to 50' }));

    expect(await screen.findByText('Showing the 2 newest of 25')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load up to 50' })).not.toBeInTheDocument();
    expect(bodiesOf(fetchMock, USER_URL)).toEqual([
      { email: 'student@example.com', limit: 20 },
      { email: 'student@example.com', limit: 50 },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
    expect(screen.queryByText('Viewing temp emails for:')).not.toBeInTheDocument();
  });
});

describe('Recent', () => {
  test('loads the newest 20 on open, the limit selector reloads, and an owner opens By user', async () => {
    const fetchMock = mockApi({
      [RECENT_URL]: [recentReply([ACTIVE_EMAIL, UNAVAILABLE_EMAIL]), recentReply([ACTIVE_EMAIL])],
      [USER_URL]: [userReply([ACTIVE_EMAIL])],
    });
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));
    expect(screen.getByRole('tab', { name: 'Recent' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Reading inboxes live…')).toBeInTheDocument();

    expect(await emailCard('busy.user@campus.edu')).toHaveTextContent('Owner other@example.com');
    expect(bodiesOf(fetchMock, RECENT_URL)).toEqual([{ limit: 20 }]);
    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '50' }));
    await waitFor(() => expect(screen.queryByText('busy.user@campus.edu')).not.toBeInTheDocument());
    expect(bodiesOf(fetchMock, RECENT_URL)).toEqual([{ limit: 20 }, { limit: 50 }]);
    expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(await emailCard('old.user@school.edu'));
    fireEvent.click(screen.getByRole('button', { name: "View user's emails" }));

    expect(screen.getByRole('tab', { name: 'By user' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Viewing temp emails for:')).toBeInTheDocument();
    expect(bodiesOf(fetchMock, USER_URL)).toEqual([{ email: 'student@example.com', limit: 20 }]);

    // Going back to Recent keeps the list that was already loaded
    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));
    expect(await emailCard('old.user@school.edu')).toBeInTheDocument();
    expect(bodiesOf(fetchMock, RECENT_URL)).toHaveLength(2);
  });

  test('an error shows a banner whose Retry loads again', async () => {
    mockApi({
      [RECENT_URL]: [{ status: 500, json: { success: false, message: 'Internal Server Error' } }, recentReply([])],
    });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(await screen.findByText(/problem getting the recent temp emails/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No temp emails have been generated yet')).toBeInTheDocument();
    expect(screen.queryByText(/problem getting the recent temp emails/)).not.toBeInTheDocument();
  });
});
