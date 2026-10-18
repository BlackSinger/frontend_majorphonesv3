import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  parseDate,
  formatDateTime,
  formatFullDate,
  formatAgo,
  messageToText,
  extractCode,
  senderName,
  senderInitial
} from './tempEmailUtils';
import MessageFrame from './TempEmailMessageFrame';

const GET_TEMP_EMAILS_URL = 'https://gettempemails-ezeznlhr5a-uc.a.run.app';
const CREATE_TEMP_EMAIL_URL = 'https://createtempemail-ezeznlhr5a-uc.a.run.app';
const GET_TEMP_EMAIL_MESSAGES_URL = 'https://gettempemailmessages-ezeznlhr5a-uc.a.run.app';

// The open inbox is checked every 20 s while the tab is visible, and pauses after 10 min without user activity
const AUTO_REFRESH_MS = 20 * 1000;
const AUTO_REFRESH_IDLE_MS = 10 * 60 * 1000;
const CLOCK_TICK_MS = 15 * 1000;
// Messages already opened, as "<email id>:<message id>"
const READ_STORAGE_KEY = 'tempEmailReadMessages';
const READ_STORAGE_LIMIT = 500;
// Tailwind xl: emails and inbox side by side
const WIDE_SCREEN_QUERY = '(min-width: 1280px)';

interface TempEmailItem {
  id: string;
  email: string;
  status: string;
  messageCount: number;
  createdAt: string | null;
  lastCheckedAt: string | null;
}

interface TempEmailQuota {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

interface TempEmailMessage {
  id: number;
  from: { name: string; address: string };
  subject: string;
  body: string;
  receivedAt: string | null;
}

interface MessageView extends TempEmailMessage {
  snippet: string;
  code: string | null;
  date: Date | null;
}

interface InboxState {
  messages?: TempEmailMessage[];
  updatedAt?: number;
  error?: { status: number; message: string } | null;
}

interface ApiResult {
  status: number;
  ok: boolean;
  data: any;
}

const postTempEmailApi = async (url: string, idToken: string, body: object = {}): Promise<ApiResult> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok && data?.success !== false, data };
};

const getErrorMessage = (status: number) => {
  switch (status) {
    case 401:
      return 'You are not authenticated or your token is invalid';
    case 403:
      return 'Your account is disabled, please contact our customer support';
    case 404:
      return 'This email was not found, please refresh the page';
    case 410:
      return 'This email has expired';
    case 429:
      return 'You reached the daily limit of temp emails, try again after the reset';
    case 503:
      return 'The inbox service is unavailable right now, please try again in a moment';
    case 500:
      return 'Please contact our customer support';
    default:
      return 'An error occurred, please try again';
  }
};

const NETWORK_ERROR = 'Network connection error, please check your internet connection';

const isWideScreen = () => typeof window.matchMedia === 'function' && window.matchMedia(WIDE_SCREEN_QUERY).matches;

const readKey = (emailId: string, messageId: number) => `${emailId}:${messageId}`;

const loadReadIds = (): Set<string> => {
  try {
    const stored = JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-READ_STORAGE_LIMIT)));
  } catch {
    // Private mode or storage full: unread dots just reset on the next visit
  }
};

// "Just now", "5 min ago", "3 h ago", "Oct 15"
const rowTime = (date: Date | null, now: number) => {
  const ago = formatAgo(date, now);
  return ago.startsWith('on ') ? ago.slice(3) : ago.charAt(0).toUpperCase() + ago.slice(1);
};

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-sky-500 to-indigo-500'
];

const avatarColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const ICONS = {
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  check: 'M5 13l4 4L19 7',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  back: 'M15 19l-7-7 7-7',
  mail: 'M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  cap: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222'
};

const Icon: React.FC<{ d: string; className?: string }> = ({ d, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CopyButton: React.FC<{ copied: boolean; title: string; onCopy: () => void }> = ({ copied, title, onCopy }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onCopy(); }}
    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors duration-200 flex-shrink-0"
    title={copied ? 'Copied!' : title}
    aria-label={title}
  >
    <Icon d={copied ? ICONS.check : ICONS.copy} className={`w-4 h-4 ${copied ? 'text-green-400' : ''}`} />
  </button>
);

const Avatar: React.FC<{ from: TempEmailMessage['from'] }> = ({ from }) => (
  <div className={`w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br ${avatarColor(from.address || from.name || '')} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
    {senderInitial(from)}
  </div>
);

const CodeChip: React.FC<{ code: string; copied: boolean; onCopy: () => void; large?: boolean }> = ({ code, copied, onCopy, large = false }) => (
  <div className={`inline-flex items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 ${large ? 'gap-3 pl-4 pr-1.5 py-1.5' : 'gap-2 pl-2.5 pr-1 py-0.5'}`}>
    <span className={`uppercase tracking-wider font-semibold text-emerald-300/80 ${large ? 'text-xs' : 'text-[10px]'}`}>Code</span>
    <span className={`font-mono font-bold text-emerald-100 ${large ? 'text-xl tracking-[0.2em]' : 'text-sm tracking-wider'}`}>{code}</span>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCopy(); }}
      aria-label={`Copy code ${code}`}
      className={large
        ? 'px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white text-xs font-bold shadow-lg transition-all duration-200 min-w-[64px]'
        : 'px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-semibold transition-colors duration-200 min-w-[48px]'}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  </div>
);

const StatusBadge: React.FC<{ expired: boolean }> = ({ expired }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${expired ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-green-500/10 text-green-300 border-green-500/30'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${expired ? 'bg-red-400' : 'bg-green-400'}`} />
    {expired ? 'Expired' : 'Active'}
  </span>
);

const PulseDot: React.FC<{ size?: string }> = ({ size = 'h-2 w-2' }) => (
  <span className={`relative flex ${size}`}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
    <span className={`relative inline-flex rounded-full ${size} bg-emerald-400`} />
  </span>
);

const TempEmail: React.FC = () => {
  const { currentUser } = useAuth();

  const [tempEmails, setTempEmails] = useState<TempEmailItem[]>([]);
  const [quota, setQuota] = useState<TempEmailQuota | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMessageId, setOpenMessageId] = useState<number | null>(null);
  const [inboxes, setInboxes] = useState<{ [id: string]: InboxState }>({});
  const [loadingIds, setLoadingIds] = useState<{ [id: string]: boolean }>({});
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emailsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(new Set<string>());
  const lastFetchRef = useRef<{ [id: string]: number }>({});
  const lastInteractionRef = useRef(Date.now());
  const fetchInboxRef = useRef<(id: string) => void>(() => {});

  const selectedEmail = tempEmails.find(item => item.id === selectedId) || null;
  const selectedInbox = selectedId ? inboxes[selectedId] : undefined;
  const selectedMessages = selectedInbox?.messages;
  const isSelectedLoading = selectedId ? !!loadingIds[selectedId] : false;
  const isSelectedExpired = selectedEmail?.status === 'expired';

  const messageViews: MessageView[] = useMemo(() => (selectedMessages || []).map(message => {
    const text = messageToText(message.body);
    return {
      ...message,
      snippet: text.slice(0, 200),
      code: extractCode(message.subject, text),
      date: parseDate(message.receivedAt)
    };
  }), [selectedMessages]);

  const openMessage = messageViews.find(message => message.id === openMessageId) || null;

  // The quota renews at 00:00 UTC; once resetsAt has passed the server allows new emails again
  const quotaExhausted = quota !== null && quota.remainingToday <= 0 && Date.now() < Date.parse(quota.resetsAt);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const scrollIntoViewOnSmallScreens = (ref: React.RefObject<HTMLDivElement | null>) => {
    // Below xl the page shows one step at a time: emails -> inbox -> message. Each step jumps to its top like a new screen
    if (isWideScreen()) return;
    setTimeout(() => ref.current?.scrollIntoView({ block: 'start' }), 0);
  };

  const fetchInbox = async (id: string) => {
    if (!currentUser || inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);
    setLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const idToken = await currentUser.getIdToken();
      const result = await postTempEmailApi(GET_TEMP_EMAIL_MESSAGES_URL, idToken, { id });

      if (result.ok) {
        const messages: TempEmailMessage[] = Array.isArray(result.data?.data?.messages) ? result.data.data.messages : [];
        lastFetchRef.current[id] = Date.now();
        setInboxes(prev => ({ ...prev, [id]: { messages, updatedAt: Date.now(), error: null } }));
        setTempEmails(prev => prev.map(item => (
          item.id === id
            ? { ...item, status: 'active', messageCount: messages.length, lastCheckedAt: new Date().toISOString() }
            : item
        )));
        return;
      }

      console.log('getTempEmailMessages error:', result.data);
      if (result.status === 410) {
        setTempEmails(prev => prev.map(item => (item.id === id ? { ...item, status: 'expired' } : item)));
      }
      setInboxes(prev => ({ ...prev, [id]: { ...prev[id], error: { status: result.status, message: getErrorMessage(result.status) } } }));
    } catch (error) {
      console.log('getTempEmailMessages network error:', error);
      setInboxes(prev => ({ ...prev, [id]: { ...prev[id], error: { status: 0, message: NETWORK_ERROR } } }));
    } finally {
      inFlightRef.current.delete(id);
      setLoadingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };
  fetchInboxRef.current = fetchInbox;

  const selectEmail = (item: TempEmailItem) => {
    const isSame = item.id === selectedId;
    setSelectedId(item.id);
    setOpenMessageId(null);
    setIsAutoRefreshPaused(false);
    lastInteractionRef.current = Date.now();
    scrollIntoViewOnSmallScreens(panelRef);
    // An expired email is only checked again on request
    if (item.status !== 'expired' && !(isSame && inboxes[item.id]?.messages)) {
      fetchInbox(item.id);
    }
  };

  const loadTempEmails = async () => {
    if (!currentUser) return;
    setIsLoadingList(true);
    setListError('');
    try {
      const idToken = await currentUser.getIdToken();
      const result = await postTempEmailApi(GET_TEMP_EMAILS_URL, idToken);
      if (result.ok) {
        const list: TempEmailItem[] = Array.isArray(result.data?.data) ? result.data.data : [];
        setTempEmails(list);
        if (result.data?.quota) setQuota(result.data.quota);
        // Side by side there is room for the inbox: open the newest active email right away
        const newestActive = list.find(item => item.status !== 'expired');
        if (isWideScreen() && newestActive && !selectedId) selectEmail(newestActive);
        return;
      }
      console.log('getTempEmails error:', result.data);
      setListError(getErrorMessage(result.status));
    } catch (error) {
      console.log('getTempEmails network error:', error);
      setListError(NETWORK_ERROR);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadTempEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // Keeps "Updated x min ago" and the message times current
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const markActive = () => { lastInteractionRef.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(event => window.addEventListener(event, markActive, { passive: true }));
    return () => events.forEach(event => window.removeEventListener(event, markActive));
  }, []);

  useEffect(() => {
    if (!selectedId || isSelectedExpired || isAutoRefreshPaused) return;
    const timer = window.setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= AUTO_REFRESH_IDLE_MS) {
        setIsAutoRefreshPaused(true);
        return;
      }
      if (document.visibilityState === 'hidden') return;
      fetchInboxRef.current(selectedId);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, isSelectedExpired, isAutoRefreshPaused]);

  // Coming back to the tab counts as activity and catches up right away
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      lastInteractionRef.current = Date.now();
      if (!selectedId || isSelectedExpired || isAutoRefreshPaused) return;
      if (Date.now() - (lastFetchRef.current[selectedId] || 0) >= AUTO_REFRESH_MS) fetchInboxRef.current(selectedId);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [selectedId, isSelectedExpired, isAutoRefreshPaused]);

  const handleGenerate = async () => {
    if (!currentUser || isGenerating || quotaExhausted) return;
    setIsGenerating(true);
    try {
      const idToken = await currentUser.getIdToken();
      const result = await postTempEmailApi(CREATE_TEMP_EMAIL_URL, idToken);
      if (result.data?.quota) setQuota(result.data.quota);

      if (result.ok && result.data?.data) {
        const created: TempEmailItem = result.data.data;
        lastFetchRef.current[created.id] = Date.now();
        setTempEmails(prev => [created, ...prev.filter(item => item.id !== created.id)]);
        setInboxes(prev => ({ ...prev, [created.id]: { messages: [], updatedAt: Date.now(), error: null } }));
        setSelectedId(created.id);
        setOpenMessageId(null);
        setIsAutoRefreshPaused(false);
        lastInteractionRef.current = Date.now();
        scrollIntoViewOnSmallScreens(panelRef);
        return;
      }

      console.log('createTempEmail error:', result.data);
      showError(getErrorMessage(result.status));
    } catch (error) {
      console.log('createTempEmail network error:', error);
      showError(NETWORK_ERROR);
    } finally {
      setIsGenerating(false);
    }
  };

  const markRead = (emailId: string, messageId: number) => {
    setReadIds(prev => {
      const key = readKey(emailId, messageId);
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      saveReadIds(next);
      return next;
    });
  };

  const handleOpenMessage = (message: MessageView) => {
    if (!selectedId) return;
    setOpenMessageId(message.id);
    markRead(selectedId, message.id);
    scrollIntoViewOnSmallScreens(panelRef);
  };

  const handleBackToInbox = () => {
    setOpenMessageId(null);
    scrollIntoViewOnSmallScreens(panelRef);
  };

  const handleBackToEmails = () => {
    setSelectedId(null);
    setOpenMessageId(null);
    scrollIntoViewOnSmallScreens(emailsRef);
  };

  const handleRefresh = () => {
    if (!selectedId) return;
    lastInteractionRef.current = Date.now();
    fetchInbox(selectedId);
  };

  const handleResumeAutoRefresh = () => {
    lastInteractionRef.current = Date.now();
    setIsAutoRefreshPaused(false);
    if (selectedId) fetchInbox(selectedId);
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(current => (current === field ? null : current)), 2000);
    } catch (error) {
      showError('Could not copy to the clipboard, please copy it manually');
    }
  };

  const unreadCount = (emailId: string) =>
    (inboxes[emailId]?.messages || []).filter(message => !readIds.has(readKey(emailId, message.id))).length;

  const onEnterOrSpace = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const renderEmailsList = () => {
    if (isLoadingList) {
      return (
        <div className="space-y-3" role="status" aria-label="Loading your emails">
          {[0, 1].map(index => (
            <div key={index} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 animate-pulse">
              <div className="h-4 w-3/4 rounded bg-slate-700/60" />
              <div className="mt-4 h-3 w-1/2 rounded bg-slate-700/40" />
            </div>
          ))}
        </div>
      );
    }

    if (listError) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left">
          <div className="flex items-start gap-3">
            <Icon d={ICONS.warning} className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-200">{listError}</p>
          </div>
          <button
            type="button"
            onClick={loadTempEmails}
            className="mt-3 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-semibold transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      );
    }

    if (tempEmails.length === 0) {
      return (
        <div className="text-center py-10 px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700/60 rounded-2xl mb-4">
            <Icon d={ICONS.cap} className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">No emails yet</h3>
          <p className="text-slate-400 text-sm">Generate your first .edu email to get started</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 xl:max-h-[40rem] xl:overflow-y-auto xl:pr-1">
        {tempEmails.map(item => {
          const isSelected = item.id === selectedId;
          const isExpired = item.status === 'expired';
          const unread = unreadCount(item.id);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => selectEmail(item)}
              onKeyDown={onEnterOrSpace(() => selectEmail(item))}
              className={`rounded-2xl border p-4 text-left cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 ${isSelected ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-600/40 bg-slate-800/40 hover:border-slate-500/60 hover:bg-slate-800/70'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold break-all pt-1 ${isExpired ? 'text-slate-400' : 'text-white'}`}>{item.email}</p>
                <div className="-mr-1.5 -mt-0.5">
                  <CopyButton copied={copiedField === `email-${item.id}`} title="Copy email" onCopy={() => handleCopy(item.email, `email-${item.id}`)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                <StatusBadge expired={isExpired} />
                <span>{formatDateTime(parseDate(item.createdAt))}</span>
                <span className="inline-flex items-center gap-1" title={`${item.messageCount} ${item.messageCount === 1 ? 'message' : 'messages'}`}>
                  <Icon d={ICONS.mail} className="w-3.5 h-3.5" />
                  {item.messageCount}
                </span>
                {unread > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">{unread} new</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInboxBanners = (email: TempEmailItem) => {
    const error = selectedInbox?.error;
    return (
      <>
        {isSelectedExpired && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
            <Icon d={ICONS.clock} className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-200 font-semibold text-sm">This email has expired</p>
              <p className="text-amber-100/70 text-xs mt-0.5">It can't receive new messages anymore. Generate a new email to keep going.</p>
            </div>
            <button
              type="button"
              onClick={() => fetchInbox(email.id)}
              disabled={isSelectedLoading}
              className="text-xs font-semibold text-amber-200 hover:text-white transition-colors duration-200 flex-shrink-0 disabled:opacity-50"
            >
              Check again
            </button>
          </div>
        )}
        {error && error.status !== 410 && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left">
            <Icon d={ICONS.warning} className="w-5 h-5 text-red-300 flex-shrink-0" />
            <p className="flex-1 text-sm text-red-200">{error.message}</p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSelectedLoading}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-semibold transition-colors duration-200 flex-shrink-0 disabled:opacity-50"
            >
              {isSelectedLoading ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}
      </>
    );
  };

  const renderMessageRows = (email: TempEmailItem) => {
    if (selectedMessages === undefined) {
      if (!isSelectedLoading) return null;
      return (
        <div role="status" aria-label="Loading messages">
          {[0, 1, 2].map(index => (
            <div key={index} className="flex gap-3 px-4 sm:px-6 py-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-700/60 flex-shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-3 w-1/3 rounded bg-slate-700/60" />
                <div className="h-3 w-2/3 rounded bg-slate-700/50" />
                <div className="h-3 w-5/6 rounded bg-slate-700/40" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedMessages.length === 0) {
      if (isSelectedExpired) return null;
      return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/5 border border-emerald-500/30 flex items-center justify-center">
              <Icon d={ICONS.mail} className="w-8 h-8 text-emerald-300" />
            </div>
            {!isAutoRefreshPaused && (
              <span className="absolute -top-1 -right-1">
                <PulseDot size="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white">Waiting for emails…</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            Messages sent to <span className="text-slate-200 font-medium break-all">{email.email}</span> appear here automatically
          </p>
        </div>
      );
    }

    return (
      <ul className="divide-y divide-slate-700/40" aria-label="Messages">
        {messageViews.map(message => {
          const isUnread = !readIds.has(readKey(email.id, message.id));
          return (
            <li key={message.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOpenMessage(message)}
                onKeyDown={onEnterOrSpace(() => handleOpenMessage(message))}
                className={`flex gap-3 px-4 sm:px-6 py-4 cursor-pointer text-left transition-colors duration-150 focus:outline-none focus-visible:bg-slate-700/40 ${isUnread ? 'bg-slate-800/50 hover:bg-slate-700/40' : 'hover:bg-slate-800/50'}`}
              >
                <Avatar from={message.from} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`flex-1 truncate text-sm ${isUnread ? 'text-white font-semibold' : 'text-slate-300 font-medium'}`}>
                      {senderName(message.from)}
                    </p>
                    <span
                      className={`flex-shrink-0 text-xs ${isUnread ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}
                      title={formatFullDate(message.date)}
                    >
                      {rowTime(message.date, now)}
                    </span>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Unread" />}
                  </div>
                  <p className={`truncate text-sm mt-0.5 ${isUnread ? 'text-white font-bold' : 'text-slate-200 font-semibold'}`}>
                    {message.subject || '(No subject)'}
                  </p>
                  <p className="truncate text-sm text-slate-400 mt-0.5">{message.snippet || 'No preview available'}</p>
                  {message.code && (
                    <div className="mt-2">
                      <CodeChip
                        code={message.code}
                        copied={copiedField === `code-${message.id}`}
                        onCopy={() => handleCopy(message.code as string, `code-${message.id}`)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderInbox = (email: TempEmailItem) => {
    const updatedAt = selectedInbox?.updatedAt ? new Date(selectedInbox.updatedAt) : parseDate(email.lastCheckedAt);
    const updatedLabel = updatedAt
      ? `Updated ${formatAgo(updatedAt, Math.max(now, selectedInbox?.updatedAt || 0))}`
      : isSelectedLoading ? 'Checking…' : 'Not checked yet';

    return (
      <>
        <div className="px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-slate-800/40">
          <div className="flex items-start gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBackToEmails}
              className="xl:hidden -ml-2 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
              aria-label="Back to your emails"
            >
              <Icon d={ICONS.back} />
            </button>
            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
                Inbox
              </h2>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-slate-200 text-sm font-medium truncate">{email.email}</span>
                <CopyButton copied={copiedField === 'inbox-address'} title="Copy address" onCopy={() => handleCopy(email.email, 'inbox-address')} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span>{updatedLabel}</span>
                {!isSelectedExpired && (
                  isAutoRefreshPaused ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-300/90">Auto-refresh paused</span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={handleResumeAutoRefresh}
                        className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-2"
                      >
                        Resume
                      </button>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                        <PulseDot />
                        Auto-refresh on
                      </span>
                    </>
                  )
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSelectedLoading}
              aria-label="Refresh inbox"
              title="Refresh inbox"
              className="flex-shrink-0 w-10 h-10 rounded-xl border border-slate-600/50 bg-slate-800/60 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 flex items-center justify-center transition-all duration-200 disabled:cursor-wait"
            >
              <Icon d={ICONS.refresh} className={`w-5 h-5 ${isSelectedLoading ? 'animate-spin text-emerald-300' : ''}`} />
            </button>
          </div>
        </div>
        {renderInboxBanners(email)}
        <div className="py-2">{renderMessageRows(email)}</div>
      </>
    );
  };

  const renderMessage = (email: TempEmailItem, message: MessageView) => (
    <>
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-slate-700/50 bg-slate-800/40">
        <button
          type="button"
          onClick={handleBackToInbox}
          className="flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
          aria-label="Back to inbox"
        >
          <Icon d={ICONS.back} />
          <span>Inbox</span>
        </button>
        <span className="ml-auto truncate text-xs text-slate-500 pr-2">{email.email}</span>
      </div>
      <div className="p-4 sm:p-6 space-y-5 text-left">
        <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{message.subject || '(No subject)'}</h2>
        <div className="flex items-start gap-3">
          <Avatar from={message.from} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{senderName(message.from)}</p>
            {message.from.address && <p className="text-slate-400 text-xs truncate">{message.from.address}</p>}
            <p className="sm:hidden text-slate-500 text-xs mt-1">{formatFullDate(message.date)}</p>
          </div>
          <p className="hidden sm:block text-slate-400 text-xs text-right flex-shrink-0 pt-0.5">{formatFullDate(message.date)}</p>
        </div>
        {message.code && (
          <CodeChip
            large
            code={message.code}
            copied={copiedField === `code-${message.id}`}
            onCopy={() => handleCopy(message.code as string, `code-${message.id}`)}
          />
        )}
        <MessageFrame key={`${email.id}:${message.id}`} body={message.body} />
      </div>
    </>
  );

  const renderPanel = () => {
    if (!selectedEmail) {
      return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-24">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700/60 rounded-2xl mb-5">
            <Icon d={ICONS.inbox} className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-1">No email selected</h3>
          <p className="text-slate-400 text-sm max-w-xs">Open one of your emails to read its messages, or generate a new one</p>
        </div>
      );
    }
    return openMessage ? renderMessage(selectedEmail, openMessage) : renderInbox(selectedEmail);
  };

  const remaining = quota?.remainingToday ?? 0;
  const dailyLimit = quota?.dailyLimit ?? 5;

  return (
    <div className="space-y-6">
      {/* Header, quota and Generate */}
      <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="text-left">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
              Temp .edu Email
            </h1>
            <p className="text-slate-300 text-md">Disposable .edu inboxes for sign-ups and verification codes</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
            <div className="text-left" aria-live="polite">
              {isLoadingList && !quota ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 w-32 rounded bg-slate-700/60" />
                  <div className="h-2 w-40 rounded bg-slate-700/40" />
                </div>
              ) : quota ? (
                <>
                  <p className="text-sm text-slate-400">
                    <span className="text-white text-2xl font-bold mr-1.5">{remaining}</span>
                    of {quota.dailyLimit} left today
                  </p>
                  <div className="flex gap-1 mt-1.5" aria-hidden="true">
                    {Array.from({ length: dailyLimit }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 w-7 rounded-full ${index < remaining ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-slate-600/70'}`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5">Resets {formatDateTime(parseDate(quota.resetsAt))} (00:00 UTC)</p>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingList || quotaExhausted || !currentUser}
              className="group px-7 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white font-bold text-md rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-[200px]"
            >
              <span className="flex items-center justify-center">
                {isGenerating ? <Spinner className="h-6 w-6" /> : 'Generate .edu email'}
              </span>
            </button>
          </div>
        </div>
        {quotaExhausted && (
          <p className="mt-4 text-left text-amber-300 text-xs">You reached today's limit, come back after the reset</p>
        )}
      </div>

      {/* Information Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4">
        <ul className="text-blue-200 text-xs space-y-1.5 text-left sm:text-center">
          <li>• You can generate up to {dailyLimit} emails per day, the limit renews at 00:00 UTC</li>
          <li>• These emails are temporary and may expire after some time</li>
          <li>• New messages show up automatically while this page is open</li>
        </ul>
      </div>

      {/* Emails and Inbox */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        <div
          ref={emailsRef}
          className={`${selectedId ? 'hidden xl:block' : ''} rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-5 scroll-mt-4`}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
              Your emails
            </h2>
            {tempEmails.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-xs font-semibold">{tempEmails.length}</span>
            )}
          </div>
          {renderEmailsList()}
        </div>

        {/* Below xl the open inbox fills the screen, so scrolling to it works even while a message is still loading */}
        <div
          ref={panelRef}
          className={`${selectedId ? 'block min-h-[calc(100vh-6rem)]' : 'hidden'} xl:block xl:min-h-[30rem] rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden scroll-mt-4`}
        >
          {renderPanel()}
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error</h3>
              <p className="text-blue-200 mb-4">{errorMessage}</p>
              <button
                onClick={handleErrorModalClose}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempEmail;
