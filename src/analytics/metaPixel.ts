import type { User } from 'firebase/auth';

// "Major Phones" pixel from Events Manager (the ID is public)
export const META_PIXEL_ID = process.env.REACT_APP_META_PIXEL_ID || '1650951706375195';
const TRACK_CONTEXT_URL = 'https://trackmetacontext-ezeznlhr5a-uc.a.run.app';
const ATTRIBUTION_KEY = 'mp_attribution';
const FBCLID_KEY = 'mp_fbclid';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
  allowDuplicatePageViews?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let scriptLoaded: Promise<void> | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The admin panel (/major-*) is not tracked
export const isTrackedPath = (pathname: string) => !pathname.startsWith('/major-');

// Same as Meta's base code: calls are queued until fbevents.js loads
export const initMetaPixel = () => {
  if (scriptLoaded) return scriptLoaded;
  if (window.fbq) {
    scriptLoaded = Promise.resolve();
    return scriptLoaded;
  }
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args);
    } else {
      fbq.queue.push(args);
    }
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  // fbevents.js sends its own PageView on every history change (including /major-*) and drops
  // repeated PageViews in the same document: MetaPixelTracker sends exactly one per tracked route
  fbq.disablePushState = true;
  fbq.allowDuplicatePageViews = true;
  window.fbq = fbq;
  window._fbq = fbq;
  scriptLoaded = new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  fbq('init', META_PIXEL_ID);
  return scriptLoaded;
};

export const trackPageView = () => {
  window.fbq?.('track', 'PageView');
};

// eventId: the same id the backend uses for that event, so Meta keeps only one
export const trackEvent = (eventName: string, params: Record<string, unknown> = {}, eventId?: string) => {
  if (!window.fbq) return;
  if (eventId) {
    window.fbq('track', eventName, params, { eventID: eventId });
  } else {
    window.fbq('track', eventName, params);
  }
};

// UTM params and fbclid arrive in the ad URL and are lost while navigating: keep the first touch
export const captureAttribution = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (fbclid) localStorage.setItem(FBCLID_KEY, JSON.stringify({ fbclid, ts: Date.now() }));
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;
    const attribution: Record<string, string | number> = {};
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) attribution[key] = value.slice(0, 200);
    });
    if (!Object.keys(attribution).length && !fbclid) return;
    attribution.landing_page = `${window.location.origin}${window.location.pathname}`;
    attribution.ts = Date.now();
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Storage blocked (private mode): continue without attribution
  }
};

const readCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

// The pixel creates _fbc when landing with fbclid; if the cookie is missing, rebuild it from the stored fbclid
const getFbc = () => {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  try {
    const stored = JSON.parse(localStorage.getItem(FBCLID_KEY) || 'null');
    if (stored?.fbclid) return `fb.1.${stored.ts}.${stored.fbclid}`;
  } catch {
    // no stored fbclid
  }
  return undefined;
};

const readAttribution = () => {
  try {
    return JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
  } catch {
    return {};
  }
};

// Same hash the backend sends as external_id
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Once per session: identifies the user in the pixel and sends the browser context to the backend,
// which recharge events need (they complete via webhook, with no browser). If the backend detects
// this is the user's registration, the browser sends the same CompleteRegistration with the same id
export const syncMetaContext = async (user: User) => {
  const sessionKey = `mp_ctx_${user.uid}`;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  } catch {
    // without sessionStorage it syncs on every dashboard load
  }
  try {
    // Wait for fbevents.js so the _fbp cookie exists (3 s at most)
    await Promise.race([initMetaPixel(), wait(3000)]);
    if (user.email) {
      window.fbq?.('init', META_PIXEL_ID, { em: user.email.trim().toLowerCase(), external_id: await sha256(user.uid) });
    }
    const body = JSON.stringify({
      fbp: readCookie('_fbp'),
      fbc: getFbc(),
      attribution: readAttribution(),
      eventSourceUrl: window.location.href,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      const idToken = await user.getIdToken();
      const response = await fetch(TRACK_CONTEXT_URL, {
        method: 'POST',
        headers: { 'Authorization': idToken, 'Content-Type': 'application/json' },
        body,
      });
      // 409: with Google sign-up the user document is still being created
      if (response.status === 409) {
        await wait(3000);
        continue;
      }
      if (!response.ok) return;
      const data = await response.json();
      if (data.registration && data.eventId) trackEvent('CompleteRegistration', {}, data.eventId);
      return;
    }
  } catch (error) {
    console.error('Meta context sync failed:', error);
  }
};
