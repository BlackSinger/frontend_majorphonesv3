import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import TempEmail from './TempEmail';

const mockAuth = { currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('id-token-1') } };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

const LIST_URL = 'https://gettempemails-ezeznlhr5a-uc.a.run.app';
const CREATE_URL = 'https://createtempemail-ezeznlhr5a-uc.a.run.app';
const MESSAGES_URL = 'https://gettempemailmessages-ezeznlhr5a-uc.a.run.app';

const quota = (used: number) => ({
  dailyLimit: 5,
  usedToday: used,
  remainingToday: 5 - used,
  resetsAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString()
});

const OLD_EMAIL = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'old.user@school.edu',
  status: 'active',
  messageCount: 2,
  createdAt: '2026-10-16T10:00:00.000Z',
  lastCheckedAt: null,
};
const NEW_EMAIL = {
  ...OLD_EMAIL,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'new.user@college.edu',
  messageCount: 0,
  createdAt: '2026-10-16T12:00:00.000Z',
};

const GOOGLE_MESSAGE = {
  id: 9,
  from: { name: 'Google', address: 'no-reply@accounts.google.com' },
  subject: 'G-482913 is your Google verification code',
  body: '<style>p{color:red}</style><p>Use this code to verify:</p><p><b>482913</b></p><script>alert(1)</script>',
  receivedAt: '2026-10-16T12:30:00.000000Z',
};
const WELCOME_MESSAGE = {
  id: 3,
  from: { name: '', address: 'welcome@notion.so' },
  subject: 'Welcome to Notion',
  body: 'Hi there,\nThanks for signing up.',
  receivedAt: '2026-10-16 11:00:00',
};

type Reply = { status: number; json: unknown };

const listReply = (emails: object[], used = 1): Reply => ({ status: 200, json: { success: true, data: emails, quota: quota(used) } });
const inboxReply = (messages: object[]): Reply => ({ status: 200, json: { success: true, data: { id: OLD_EMAIL.id, email: OLD_EMAIL.email, messages } } });

// Answers each Cloud Function URL with its own queue of replies
const mockApi = (replies: { [url: string]: Reply[] }) => {
  const fetchMock = jest.fn(async (url: string) => {
    const reply = replies[url]?.shift();
    if (!reply) throw new Error(`Unexpected call to ${url}`);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.json };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const callsTo = (fetchMock: jest.Mock, url: string) => fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url);

const openInbox = async () => {
  fireEvent.click(await screen.findByText('old.user@school.edu'));
  return screen.findByRole('list', { name: 'Messages' });
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = jest.fn();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('loads the emails and the quota with the ID token, without showing the provider', async () => {
  const fetchMock = mockApi({ [LIST_URL]: [listReply([OLD_EMAIL], 2)] });
  render(<TempEmail />);

  expect(await screen.findByText('old.user@school.edu')).toBeInTheDocument();
  expect(screen.getByText(/left today/)).toHaveTextContent('3of 5 left today');
  expect(fetchMock).toHaveBeenCalledWith(LIST_URL, expect.objectContaining({
    method: 'POST',
    headers: { Authorization: 'id-token-1', 'Content-Type': 'application/json' },
  }));
  expect(document.body.innerHTML).not.toMatch(/tempamail|access\?key/i);
});

test('Generate creates an email, puts it first and opens its empty inbox', async () => {
  const fetchMock = mockApi({
    [LIST_URL]: [listReply([OLD_EMAIL], 2)],
    [CREATE_URL]: [{ status: 200, json: { success: true, data: NEW_EMAIL, quota: quota(3) } }],
  });
  render(<TempEmail />);
  await screen.findByText('old.user@school.edu');

  fireEvent.click(screen.getByRole('button', { name: 'Generate .edu email' }));

  expect(await screen.findByText('Waiting for emails…')).toBeInTheDocument();
  expect(screen.getByText(/appear here automatically/)).toHaveTextContent('Messages sent to new.user@college.edu appear here automatically');
  expect(screen.getAllByText(/@(school|college)\.edu$/)[0]).toHaveTextContent('new.user@college.edu');
  expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('new.user@college.edu');
  expect(screen.getByText(/left today/)).toHaveTextContent('2of 5 left today');
  // A new email has no messages yet, so its inbox is not read
  expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(0);
});

test('Generate is disabled when no emails are left today', async () => {
  mockApi({ [LIST_URL]: [listReply([OLD_EMAIL], 5)] });
  render(<TempEmail />);
  await screen.findByText('old.user@school.edu');

  expect(screen.getByRole('button', { name: 'Generate .edu email' })).toBeDisabled();
  expect(screen.getByText(/You reached today's limit/)).toBeInTheDocument();
});

test('a 429 shows the limit error and disables Generate with the returned quota', async () => {
  mockApi({
    [LIST_URL]: [listReply([], 4)],
    [CREATE_URL]: [{ status: 429, json: { success: false, error: 'Daily limit reached', quota: quota(5) } }],
  });
  render(<TempEmail />);
  const generate = await screen.findByRole('button', { name: 'Generate .edu email' });
  await waitFor(() => expect(generate).toBeEnabled());

  fireEvent.click(generate);

  expect(await screen.findByText(/reached the daily limit/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate .edu email' })).toBeDisabled();
});

test('the inbox lists messages with snippet, code and unread dot, and opens one in a sandboxed frame', async () => {
  const fetchMock = mockApi({
    [LIST_URL]: [listReply([OLD_EMAIL])],
    [MESSAGES_URL]: [inboxReply([GOOGLE_MESSAGE, WELCOME_MESSAGE])],
  });
  render(<TempEmail />);
  const list = await openInbox();

  expect(JSON.parse((callsTo(fetchMock, MESSAGES_URL)[0] as any)[1].body)).toEqual({ id: OLD_EMAIL.id });
  const rows = within(list).getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('Google');
  expect(rows[0]).toHaveTextContent('Use this code to verify: 482913');
  expect(within(rows[0]).getByRole('button', { name: 'Copy code 482913' })).toBeInTheDocument();
  expect(rows[1]).toHaveTextContent('welcome');
  expect(rows[1]).toHaveTextContent('Hi there, Thanks for signing up.');
  expect(within(rows[1]).queryByRole('button', { name: /Copy code/ })).not.toBeInTheDocument();
  expect(within(list).getAllByTitle('Unread')).toHaveLength(2);
  expect(screen.getByText('2 new')).toBeInTheDocument();

  fireEvent.click(within(rows[0]).getByText('Google'));

  expect(screen.getByRole('heading', { name: GOOGLE_MESSAGE.subject })).toBeInTheDocument();
  expect(screen.getByText('no-reply@accounts.google.com')).toBeInTheDocument();
  const frame = screen.getByTitle('Message content');
  expect(frame).toHaveAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts|allow-forms/);
  expect(frame.getAttribute('srcdoc')).toContain('<b>482913</b>');
  expect(frame.getAttribute('srcdoc')).toContain('<base target="_blank">');
  expect(screen.getByRole('button', { name: 'Copy code 482913' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to inbox' }));

  const listAgain = screen.getByRole('list', { name: 'Messages' });
  expect(within(listAgain).getAllByTitle('Unread')).toHaveLength(1);
  expect(screen.getByText('1 new')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('tempEmailReadMessages') as string)).toEqual([`${OLD_EMAIL.id}:9`]);
});

test('read messages stay read on the next visit', async () => {
  localStorage.setItem('tempEmailReadMessages', JSON.stringify([`${OLD_EMAIL.id}:9`]));
  mockApi({ [LIST_URL]: [listReply([OLD_EMAIL])], [MESSAGES_URL]: [inboxReply([GOOGLE_MESSAGE, WELCOME_MESSAGE])] });
  render(<TempEmail />);
  const list = await openInbox();

  expect(within(list).getAllByTitle('Unread')).toHaveLength(1);
});

test('a 410 shows the expired banner and marks the email as expired', async () => {
  mockApi({
    [LIST_URL]: [listReply([OLD_EMAIL])],
    [MESSAGES_URL]: [{ status: 410, json: { success: false, error: 'Temp email expired' } }],
  });
  render(<TempEmail />);
  fireEvent.click(await screen.findByText('old.user@school.edu'));

  expect(await screen.findByText('This email has expired')).toBeInTheDocument();
  expect(screen.getByText('Expired')).toBeInTheDocument();
  expect(screen.queryByText('Auto-refresh on')).not.toBeInTheDocument();
});

test('a 503 shows an error with Retry', async () => {
  const fetchMock = mockApi({
    [LIST_URL]: [listReply([OLD_EMAIL])],
    [MESSAGES_URL]: [
      { status: 503, json: { success: false, error: 'Service unavailable' } },
      inboxReply([WELCOME_MESSAGE]),
    ],
  });
  render(<TempEmail />);
  fireEvent.click(await screen.findByText('old.user@school.edu'));

  expect(await screen.findByText(/service is unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Welcome to Notion')).toBeInTheDocument();
  expect(screen.queryByText(/service is unavailable/)).not.toBeInTheDocument();
  expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(2);
});

test('the open inbox refreshes every 20 s and pauses after 10 min without activity', async () => {
  jest.useFakeTimers();
  const replies = Array.from({ length: 40 }, () => inboxReply([]));
  const fetchMock = mockApi({ [LIST_URL]: [listReply([OLD_EMAIL])], [MESSAGES_URL]: replies });
  render(<TempEmail />);
  fireEvent.click(await screen.findByText('old.user@school.edu'));
  await screen.findByText('Waiting for emails…');
  expect(screen.getByText('Auto-refresh on')).toBeInTheDocument();
  expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(1);

  await act(async () => { jest.advanceTimersByTime(20 * 1000); });
  await waitFor(() => expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(2));

  await act(async () => { jest.advanceTimersByTime(10 * 60 * 1000); });
  expect(await screen.findByText('Auto-refresh paused')).toBeInTheDocument();
  const callsWhenPaused = callsTo(fetchMock, MESSAGES_URL).length;

  await act(async () => { jest.advanceTimersByTime(60 * 1000); });
  expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(callsWhenPaused);

  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  await waitFor(() => expect(callsTo(fetchMock, MESSAGES_URL)).toHaveLength(callsWhenPaused + 1));
  expect(await screen.findByText('Auto-refresh on')).toBeInTheDocument();
});

test('copies the address and the code', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  mockApi({ [LIST_URL]: [listReply([OLD_EMAIL])], [MESSAGES_URL]: [inboxReply([GOOGLE_MESSAGE])] });
  render(<TempEmail />);
  await screen.findByText('old.user@school.edu');

  fireEvent.click(screen.getByTitle('Copy email'));
  // Copying does not open the inbox
  expect(screen.getByText('No email selected')).toBeInTheDocument();

  await openInbox();
  fireEvent.click(screen.getByRole('button', { name: 'Copy code 482913' }));
  // Copying the code from the list does not open the message
  expect(screen.queryByTitle('Message content')).not.toBeInTheDocument();

  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  expect(writeText).toHaveBeenNthCalledWith(1, 'old.user@school.edu');
  expect(writeText).toHaveBeenNthCalledWith(2, '482913');
});
