import { createHash } from 'crypto';
import type { User } from 'firebase/auth';

type MetaPixelModule = typeof import('./metaPixel');

const PIXEL_ID = '1650951706375195';
const ENDPOINT = 'https://trackmetacontext-ezeznlhr5a-uc.a.run.app';
const FBEVENTS = 'https://connect.facebook.net/en_US/fbevents.js';

// Fresh module per test: the pixel loader keeps module-level state
const loadModule = (): MetaPixelModule => {
  let loaded: MetaPixelModule | undefined;
  jest.isolateModules(() => {
    loaded = require('./metaPixel');
  });
  return loaded as MetaPixelModule;
};
const queue = () => (window.fbq ? window.fbq.queue : []) as unknown[][];
const finishScriptLoad = () => document.querySelectorAll(`script[src="${FBEVENTS}"]`).forEach((script) => script.dispatchEvent(new Event('load')));
const clearCookies = () => document.cookie.split(';').forEach((cookie) => {
  document.cookie = `${cookie.split('=')[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});
const fakeUser = (overrides: Record<string, unknown> = {}) => ({
  uid: 'AbC123uid',
  email: '  Mixed.Case@Example.COM ',
  getIdToken: jest.fn().mockResolvedValue('id-token-1'),
  ...overrides,
}) as unknown as User;
const mockFetch = (...responses: Array<{ status: number; body?: unknown } | Error>) => {
  const fetchMock = jest.fn();
  responses.forEach((response) => {
    if (response instanceof Error) {
      fetchMock.mockRejectedValueOnce(response);
    } else {
      fetchMock.mockResolvedValueOnce({ ok: response.status >= 200 && response.status < 300, status: response.status, json: async () => response.body ?? {} });
    }
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};
const sentBody = (fetchMock: jest.Mock, call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body);

beforeEach(() => {
  delete window.fbq;
  delete window._fbq;
  document.head.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  clearCookies();
  window.history.replaceState({}, '', '/');
  jest.restoreAllMocks();
});

describe('initMetaPixel', () => {
  test('loads fbevents.js once, configures the stub and queues init with the pixel id', () => {
    const { initMetaPixel } = loadModule();
    initMetaPixel();
    initMetaPixel();
    const scripts = document.querySelectorAll(`script[src="${FBEVENTS}"]`);
    expect(scripts).toHaveLength(1);
    expect((scripts[0] as HTMLScriptElement).async).toBe(true);
    expect(window._fbq).toBe(window.fbq);
    expect(window.fbq?.disablePushState).toBe(true);
    expect(window.fbq?.allowDuplicatePageViews).toBe(true);
    expect(window.fbq?.version).toBe('2.0');
    expect(window.fbq?.loaded).toBe(true);
    expect(queue()).toEqual([['init', PIXEL_ID]]);
  });

  test('once fbevents.js takes over, calls go straight to it (callMethod)', () => {
    const { initMetaPixel, trackEvent } = loadModule();
    initMetaPixel();
    const callMethod = jest.fn();
    window.fbq!.callMethod = callMethod;
    trackEvent('Lead', { value: 1 });
    expect(callMethod).toHaveBeenCalledWith('track', 'Lead', { value: 1 });
  });

  test('keeps an already installed pixel instead of injecting a second one', () => {
    const existing = Object.assign(jest.fn(), { queue: [] }) as unknown as NonNullable<Window['fbq']>;
    window.fbq = existing;
    const { initMetaPixel } = loadModule();
    initMetaPixel();
    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(window.fbq).toBe(existing);
  });

  test('resolves even when an ad blocker makes the script fail', async () => {
    const { initMetaPixel } = loadModule();
    const loading = initMetaPixel();
    document.querySelector(`script[src="${FBEVENTS}"]`)!.dispatchEvent(new Event('error'));
    await expect(loading).resolves.toBeUndefined();
  });
});

describe('tracking helpers', () => {
  test('PageView and events with and without the dedup event id', () => {
    const { initMetaPixel, trackPageView, trackEvent } = loadModule();
    initMetaPixel();
    trackPageView();
    trackEvent('InitiateCheckout', { value: 10, currency: 'USD' }, 'ic_ord-1');
    trackEvent('ViewContent');
    expect(queue().slice(1)).toEqual([
      ['track', 'PageView'],
      ['track', 'InitiateCheckout', { value: 10, currency: 'USD' }, { eventID: 'ic_ord-1' }],
      ['track', 'ViewContent', {}],
    ]);
  });

  test('tracking before the pixel exists is a no-op, not a crash', () => {
    const { trackPageView, trackEvent } = loadModule();
    expect(() => {
      trackPageView();
      trackEvent('Purchase', {}, 'pur_1');
    }).not.toThrow();
  });

  test('only the admin panel (/major-*) is excluded', () => {
    const { isTrackedPath } = loadModule();
    ['/', '/signin', '/signup', '/dashboard', '/add-funds', '/short'].forEach((path) => expect(isTrackedPath(path)).toBe(true));
    ['/major-history', '/major-user', '/major-transactions'].forEach((path) => expect(isTrackedPath(path)).toBe(false));
  });
});

describe('captureAttribution', () => {
  test('stores the ad UTMs with the landing page (without query) and a timestamp', () => {
    window.history.replaceState({}, '', '/signup?utm_source=meta&utm_medium=paid_social&utm_campaign=oct26&utm_content=gmail&utm_term=sms&other=1');
    const { captureAttribution } = loadModule();
    captureAttribution();
    const stored = JSON.parse(localStorage.getItem('mp_attribution')!);
    expect(stored).toEqual({
      utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'oct26', utm_content: 'gmail', utm_term: 'sms',
      landing_page: 'http://localhost/signup', ts: expect.any(Number),
    });
  });

  test('first touch wins: a later visit with other UTMs does not overwrite it', () => {
    const { captureAttribution } = loadModule();
    window.history.replaceState({}, '', '/?utm_source=meta&utm_content=gmail');
    captureAttribution();
    window.history.replaceState({}, '', '/?utm_source=google&utm_content=other');
    captureAttribution();
    expect(JSON.parse(localStorage.getItem('mp_attribution')!).utm_source).toBe('meta');
  });

  test('fbclid alone is kept (Meta adds it to every ad click)', () => {
    window.history.replaceState({}, '', '/signup?fbclid=IwAR_test');
    const { captureAttribution } = loadModule();
    captureAttribution();
    expect(JSON.parse(localStorage.getItem('mp_fbclid')!)).toEqual({ fbclid: 'IwAR_test', ts: expect.any(Number) });
    expect(JSON.parse(localStorage.getItem('mp_attribution')!).landing_page).toBe('http://localhost/signup');
  });

  test('organic visits store nothing, long values are truncated, blocked storage does not crash', () => {
    const { captureAttribution } = loadModule();
    window.history.replaceState({}, '', '/signin');
    captureAttribution();
    expect(localStorage.getItem('mp_attribution')).toBeNull();
    window.history.replaceState({}, '', `/?utm_campaign=${'x'.repeat(500)}`);
    captureAttribution();
    expect(JSON.parse(localStorage.getItem('mp_attribution')!).utm_campaign).toHaveLength(200);
    localStorage.clear();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => captureAttribution()).not.toThrow();
  });
});

describe('syncMetaContext', () => {
  test('sends the browser context and fires CompleteRegistration with the id the backend returns', async () => {
    document.cookie = '_fbp=fb.1.1791000000000.1234567890; path=/';
    document.cookie = '_fbc=fb.1.1791000000000.IwAR_click; path=/';
    localStorage.setItem('mp_attribution', JSON.stringify({ utm_source: 'meta', utm_content: 'gmail', landing_page: 'http://localhost/signup', ts: 1 }));
    window.history.replaceState({}, '', '/dashboard');
    const fetchMock = mockFetch({ status: 200, body: { success: true, registration: true, eventId: 'reg_AbC123uid' } });
    const { syncMetaContext } = loadModule();
    const syncing = syncMetaContext(fakeUser());
    finishScriptLoad();
    await syncing;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'id-token-1', 'Content-Type': 'application/json' });
    expect(sentBody(fetchMock)).toEqual({
      fbp: 'fb.1.1791000000000.1234567890',
      fbc: 'fb.1.1791000000000.IwAR_click',
      attribution: { utm_source: 'meta', utm_content: 'gmail', landing_page: 'http://localhost/signup', ts: 1 },
      eventSourceUrl: 'http://localhost/dashboard',
    });
    const externalId = createHash('sha256').update('AbC123uid').digest('hex');
    expect(queue()).toContainEqual(['init', PIXEL_ID, { em: 'mixed.case@example.com', external_id: externalId }]);
    expect(queue()).toContainEqual(['track', 'CompleteRegistration', {}, { eventID: 'reg_AbC123uid' }]);
  });

  test('returning users: no CompleteRegistration when the backend says it is not a registration', async () => {
    mockFetch({ status: 200, body: { success: true, registration: false } });
    const { syncMetaContext } = loadModule();
    const syncing = syncMetaContext(fakeUser());
    finishScriptLoad();
    await syncing;
    expect(queue().some((call) => call[1] === 'CompleteRegistration')).toBe(false);
  });

  test('runs once per browser session', async () => {
    const fetchMock = mockFetch({ status: 200, body: { registration: false } }, { status: 200, body: { registration: false } });
    const { syncMetaContext } = loadModule();
    const user = fakeUser();
    const first = syncMetaContext(user);
    finishScriptLoad();
    await first;
    await syncMetaContext(user);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('retries while the user document is still being created (409)', async () => {
    const fetchMock = mockFetch({ status: 409 }, { status: 200, body: { registration: true, eventId: 'reg_AbC123uid' } });
    const { syncMetaContext } = loadModule();
    const syncing = syncMetaContext(fakeUser());
    finishScriptLoad();
    await syncing;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queue()).toContainEqual(['track', 'CompleteRegistration', {}, { eventID: 'reg_AbC123uid' }]);
  }, 15000);

  test('rebuilds _fbc from the stored fbclid when the cookie is missing', async () => {
    localStorage.setItem('mp_fbclid', JSON.stringify({ fbclid: 'IwAR_stored', ts: 1791000000000 }));
    const fetchMock = mockFetch({ status: 200, body: { registration: false } });
    const { syncMetaContext } = loadModule();
    const syncing = syncMetaContext(fakeUser());
    finishScriptLoad();
    await syncing;
    const body = sentBody(fetchMock);
    expect(body.fbc).toBe('fb.1.1791000000000.IwAR_stored');
    expect(body).not.toHaveProperty('fbp');
  });

  test('backend errors and network failures never break the dashboard', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({ status: 500 });
    let module = loadModule();
    let syncing = module.syncMetaContext(fakeUser());
    finishScriptLoad();
    await expect(syncing).resolves.toBeUndefined();
    expect(queue().some((call) => call[1] === 'CompleteRegistration')).toBe(false);

    sessionStorage.clear();
    delete window.fbq;
    document.head.innerHTML = '';
    mockFetch(new Error('Failed to fetch'));
    module = loadModule();
    syncing = module.syncMetaContext(fakeUser());
    finishScriptLoad();
    await expect(syncing).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  test('users without an email skip advanced matching but still sync', async () => {
    const fetchMock = mockFetch({ status: 200, body: { registration: false } });
    const { syncMetaContext } = loadModule();
    const syncing = syncMetaContext(fakeUser({ email: null }));
    finishScriptLoad();
    await syncing;
    expect(queue().filter((call) => call[0] === 'init')).toEqual([['init', PIXEL_ID]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
