import React, { useState, useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canViewTempEmails } from './adminAccess';
import MessageFrame from './TempEmailMessageFrame';
import {
  parseDate,
  formatDateTime,
  formatFullDate,
  messageToText,
  extractCode,
  senderName,
  senderInitial
} from './tempEmailUtils';

const USER_TEMP_EMAILS_URL = 'https://getusertempemails-ezeznlhr5a-uc.a.run.app';
const RECENT_TEMP_EMAILS_URL = 'https://getrecenttempemails-ezeznlhr5a-uc.a.run.app';

// Both functions read every inbox live from the provider, so a call can take ~10 s
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const LIMIT_OPTIONS = [10, 20, 30, 50];

type InboxStatus = 'active' | 'expired' | 'unavailable';
type Tab = 'user' | 'recent';

interface AdminTempEmailMessage {
  id: number;
  from: { name: string; address: string };
  subject: string;
  body: string;
  receivedAt: string | null;
}

interface AdminTempEmail {
  id: string;
  email: string;
  status: string;
  messageCount: number;
  createdAt: string | null;
  lastCheckedAt: string | null;
  uid: string;
  ownerEmail: string | null;
  provider: string;
  accessUrl: string;
  inbox: { status: InboxStatus; messages: AdminTempEmailMessage[] };
}

interface TempEmailQuota {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

interface UserResult {
  email: string;
  quota: TempEmailQuota | null;
  total: number;
  limit: number;
  tempEmails: AdminTempEmail[];
}

interface MessageView extends AdminTempEmailMessage {
  snippet: string;
  code: string | null;
  date: Date | null;
}

interface ApiResult {
  status: number;
  ok: boolean;
  data: any;
}

const postAdminFunction = async (url: string, idToken: string, body: object): Promise<ApiResult> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok && data?.success !== false, data };
};

const INBOX_STATUSES: InboxStatus[] = ['active', 'expired', 'unavailable'];

// A missing inbox counts as unavailable, and every message gets a sender, subject and body
const toTempEmails = (value: unknown): AdminTempEmail[] => (Array.isArray(value) ? value : []).map((item: any) => ({
  ...item,
  messageCount: Number(item?.messageCount) || 0,
  inbox: {
    status: INBOX_STATUSES.includes(item?.inbox?.status) ? item.inbox.status : 'unavailable',
    messages: (Array.isArray(item?.inbox?.messages) ? item.inbox.messages : []).map((message: any) => ({
      id: message?.id,
      from: { name: String(message?.from?.name || ''), address: String(message?.from?.address || '') },
      subject: String(message?.subject || ''),
      body: String(message?.body || ''),
      receivedAt: message?.receivedAt || null
    }))
  }
}));

const isWebLink = (url: string) => /^https?:\/\//i.test(url || '');

const ICONS = {
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  check: 'M5 13l4 4L19 7',
  chevron: 'M19 9l-7 7-7-7',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  mail: 'M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
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

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-700/30 transition-colors duration-200 flex-shrink-0"
      title={isCopied ? 'Copied!' : label}
      aria-label={label}
    >
      <Icon d={isCopied ? ICONS.check : ICONS.copy} className={`w-4 h-4 ${isCopied ? 'text-green-400' : ''}`} />
    </button>
  );
};

const INBOX_BADGES: { [status in InboxStatus]: { label: string; className: string; dot: string } } = {
  active: { label: 'Active', className: 'bg-green-500/10 text-green-300 border-green-500/30', dot: 'bg-green-400' },
  expired: { label: 'Expired', className: 'bg-red-500/10 text-red-300 border-red-500/30', dot: 'bg-red-400' },
  unavailable: { label: 'Unavailable', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' }
};

const InboxBadge: React.FC<{ status: InboxStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${INBOX_BADGES[status].className}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${INBOX_BADGES[status].dot}`} />
    {INBOX_BADGES[status].label}
  </span>
);

const Avatar: React.FC<{ from: AdminTempEmailMessage['from'] }> = ({ from }) => (
  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
    {senderInitial(from)}
  </div>
);

const LoadingNotice: React.FC = () => (
  <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
    <Spinner className="h-5 w-5 text-emerald-300 flex-shrink-0" />
    <div>
      <p className="text-emerald-100 text-sm font-semibold">Reading inboxes live…</p>
      <p className="text-emerald-200/70 text-xs">Every inbox is read from the provider right now, this can take about 10 seconds</p>
    </div>
  </div>
);

const SkeletonList: React.FC = () => (
  <div className="space-y-3" aria-hidden="true">
    {[0, 1, 2].map(index => (
      <div key={index} className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 animate-pulse">
        <div className="h-4 w-1/2 rounded bg-slate-700/60" />
        <div className="mt-3 h-3 w-1/3 rounded bg-slate-700/40" />
      </div>
    ))}
  </div>
);

const Detail: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide = false, children }) => (
  <div className={`min-w-0 ${wide ? 'md:col-span-2' : ''}`}>
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">{label}</dt>
    <dd className="mt-0.5 flex items-start gap-1 text-slate-200 break-all">{children}</dd>
  </div>
);

const MessageRow: React.FC<{ message: MessageView }> = ({ message }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className="w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors duration-150 focus:outline-none focus-visible:bg-slate-700/40"
      >
        <Avatar from={message.from} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-sm text-white font-semibold">{senderName(message.from)}</p>
            <span className="flex-shrink-0 text-xs text-slate-400">{formatDateTime(message.date)}</span>
          </div>
          <p className="truncate text-sm text-slate-200 font-semibold mt-0.5">{message.subject || '(No subject)'}</p>
          {!isOpen && <p className="truncate text-sm text-slate-400 mt-0.5">{message.snippet || 'No preview available'}</p>}
          {!isOpen && message.code && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-xs font-mono font-bold tracking-wider">
              {message.code}
            </span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          <div className="text-xs text-slate-400 space-y-0.5">
            <p className="break-all">
              From <span className="text-slate-200">{message.from.name || senderName(message.from)}</span>
              {message.from.address && <> &lt;{message.from.address}&gt;</>}
            </p>
            <p>{formatFullDate(message.date)}</p>
          </div>
          {message.code && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 pl-3 pr-1 py-1">
              <span className="uppercase tracking-wider text-[10px] font-semibold text-emerald-300/80">Code</span>
              <span className="font-mono font-bold text-emerald-100 tracking-wider">{message.code}</span>
              <CopyButton text={message.code} label={`Copy code ${message.code}`} />
            </div>
          )}
          <MessageFrame body={message.body} />
        </div>
      )}
    </li>
  );
};

const MessageList: React.FC<{ item: AdminTempEmail }> = ({ item }) => {
  const messages = item.inbox.messages;
  const views: MessageView[] = useMemo(() => messages.map(message => {
    const text = messageToText(message.body);
    return { ...message, snippet: text.slice(0, 200), code: extractCode(message.subject, text), date: parseDate(message.receivedAt) };
  }), [messages]);

  if (item.inbox.status !== 'active') return null;
  if (views.length === 0) {
    return <p className="rounded-2xl border border-slate-700/50 px-4 py-6 text-center text-sm text-slate-400">No messages received</p>;
  }
  return (
    <ul aria-label={`Messages of ${item.email}`} className="rounded-2xl border border-slate-700/50 divide-y divide-slate-700/40 overflow-hidden">
      {views.map(message => <MessageRow key={message.id} message={message} />)}
    </ul>
  );
};

const EmailCard: React.FC<{ item: AdminTempEmail; onViewOwner?: (email: string) => void }> = ({ item, onViewOwner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const count = item.messageCount;
  const lastChecked = parseDate(item.lastCheckedAt);

  return (
    <div className={`rounded-2xl border transition-colors duration-200 ${isOpen ? 'border-emerald-500/50 bg-slate-800/60' : 'border-slate-600/40 bg-slate-800/40 hover:border-slate-500/60'}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className="w-full flex items-start gap-3 p-4 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold break-all">{item.email}</p>
          {onViewOwner && (
            <p className="text-xs text-slate-400 mt-0.5 break-all">
              Owner <span className={item.ownerEmail ? 'text-emerald-300' : 'text-slate-500'}>{item.ownerEmail || 'Unknown user'}</span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
            <InboxBadge status={item.inbox.status} />
            <span>Created {formatDateTime(parseDate(item.createdAt))}</span>
            <span className="inline-flex items-center gap-1">
              <Icon d={ICONS.mail} className="w-3.5 h-3.5" />
              {count} {count === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </div>
        <Icon d={ICONS.chevron} className={`w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-slate-700/50 px-4 pb-4 text-left">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
            <Detail label="Address">
              <span className="flex-1">{item.email}</span>
              <CopyButton text={item.email} label="Copy address" />
            </Detail>
            {onViewOwner && (
              <Detail label="Owner">
                <span className="flex-1">{item.ownerEmail || 'Unknown user'}</span>
                {item.ownerEmail && (
                  <button
                    type="button"
                    onClick={() => onViewOwner(item.ownerEmail as string)}
                    className="flex-shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-2"
                  >
                    View user's emails
                  </button>
                )}
              </Detail>
            )}
            <Detail label="User ID">
              <span className="flex-1 font-mono text-xs pt-0.5">{item.uid || '-'}</span>
              {item.uid && <CopyButton text={item.uid} label="Copy user ID" />}
            </Detail>
            <Detail label="Email ID">
              <span className="flex-1 font-mono text-xs pt-0.5">{item.id}</span>
              <CopyButton text={item.id} label="Copy email ID" />
            </Detail>
            <Detail label="Provider">{item.provider || '-'}</Detail>
            <Detail label="Stored status">{item.status || '-'}</Detail>
            <Detail label="Created">{formatFullDate(parseDate(item.createdAt))}</Detail>
            <Detail label="Last checked by user">{lastChecked ? formatFullDate(lastChecked) : 'Never'}</Detail>
            {item.accessUrl && (
              <Detail label="Access link" wide>
                {isWebLink(item.accessUrl) ? (
                  <a href={item.accessUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-400 hover:text-blue-300 hover:underline">
                    {item.accessUrl}
                  </a>
                ) : (
                  <span className="flex-1">{item.accessUrl}</span>
                )}
                <CopyButton text={item.accessUrl} label="Copy access link" />
              </Detail>
            )}
          </dl>

          {item.inbox.status === 'expired' && (
            <div className="mb-3 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <Icon d={ICONS.warning} className="w-5 h-5 text-red-300 flex-shrink-0" />
              <p className="text-sm text-red-200">The provider no longer has this inbox, so its messages can't be read</p>
            </div>
          )}
          {item.inbox.status === 'unavailable' && (
            <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <Icon d={ICONS.warning} className="w-5 h-5 text-amber-300 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                The inbox could not be read right now. The message count is the last one the user saw; search again to retry
              </p>
            </div>
          )}
          <MessageList item={item} />
        </div>
      )}
    </div>
  );
};

const EmailList: React.FC<{ items: AdminTempEmail[]; emptyText: string; onViewOwner?: (email: string) => void }> = ({ items, emptyText, onViewOwner }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-4">
          <Icon d={ICONS.inbox} className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-300 mb-1">No Temp Emails Found</h3>
        <p className="text-slate-400">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map(item => <EmailCard key={item.id} item={item} onViewOwner={onViewOwner} />)}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">{label}</p>
    <p className="mt-1 text-xl font-bold text-white break-words">{value}</p>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const MajorTempEmailsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('user');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [email, setEmail] = useState('');
  const [userResult, setUserResult] = useState<UserResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [recentLimit, setRecentLimit] = useState(DEFAULT_LIMIT);
  const [recentEmails, setRecentEmails] = useState<AdminTempEmail[] | null>(null);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState('');

  // Only the latest request of each view updates it
  const userRequestRef = useRef(0);
  const recentRequestRef = useRef(0);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  // 401 and 403 sign out like the other admin pages; returns null in that case
  const callAdminFunction = async (url: string, body: object): Promise<ApiResult | null> => {
    if (!currentUser) return null;
    const idToken = await currentUser.getIdToken();
    const result = await postAdminFunction(url, idToken, body);
    if (result.status === 401 || result.status === 403) {
      await logout();
      navigate('/signin');
      return null;
    }
    return result;
  };

  const searchUser = async (target: string, limit: number = DEFAULT_LIMIT) => {
    const trimmed = target.trim();
    if (!trimmed) {
      showError('Please enter an email address');
      return;
    }
    const requestId = ++userRequestRef.current;
    setIsSearching(true);
    try {
      const result = await callAdminFunction(USER_TEMP_EMAILS_URL, { email: trimmed, limit });
      if (!result || requestId !== userRequestRef.current) return;
      if (!result.ok) {
        console.error('getUserTempEmails error:', result.data);
        if (result.status === 404) showError('User not found');
        else if (result.status === 400) showError('Please enter a valid email address');
        else showError('Please refresh');
        return;
      }
      setUserResult({
        email: result.data?.user?.email || trimmed,
        quota: result.data?.quota || null,
        total: Number(result.data?.total) || 0,
        limit,
        tempEmails: toTempEmails(result.data?.tempEmails)
      });
    } catch (error) {
      if (requestId !== userRequestRef.current) return;
      console.error('Error fetching user temp emails:', error);
      showError('Please refresh');
    } finally {
      if (requestId === userRequestRef.current) setIsSearching(false);
    }
  };

  const loadRecent = async (limit: number) => {
    const requestId = ++recentRequestRef.current;
    setIsLoadingRecent(true);
    setRecentError('');
    try {
      const result = await callAdminFunction(RECENT_TEMP_EMAILS_URL, { limit });
      if (!result || requestId !== recentRequestRef.current) return;
      if (!result.ok) {
        console.error('getRecentTempEmails error:', result.data);
        setRecentError('There was a problem getting the recent temp emails, please try again');
        return;
      }
      setRecentEmails(toTempEmails(result.data?.tempEmails));
    } catch (error) {
      if (requestId !== recentRequestRef.current) return;
      console.error('Error fetching recent temp emails:', error);
      setRecentError('There was a problem getting the recent temp emails, please try again');
    } finally {
      if (requestId === recentRequestRef.current) setIsLoadingRecent(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'recent' && recentEmails === null && !isLoadingRecent) loadRecent(recentLimit);
  };

  const handleLimitChange = (limit: number) => {
    setRecentLimit(limit);
    loadRecent(limit);
  };

  const handleGoBack = () => {
    userRequestRef.current++;
    setIsSearching(false);
    setUserResult(null);
  };

  const handleViewOwner = (ownerEmail: string) => {
    setActiveTab('user');
    setEmail(ownerEmail);
    setUserResult(null);
    searchUser(ownerEmail);
  };

  const renderUserView = () => {
    if (!userResult) {
      return (
        <>
          <form
            className="rounded-3xl shadow-2xl border border-slate-700/50 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              searchUser(email);
            }}
          >
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full max-w-sm">
                <label htmlFor="temp-email-user" className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                  Email
                </label>
                <input
                  id="temp-email-user"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter user email"
                  disabled={isSearching}
                  className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-600/50 rounded-2xl text-white text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300 placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="w-full max-w-sm">
                <button
                  type="submit"
                  disabled={isSearching}
                  aria-label="Search"
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {isSearching ? <Spinner className="h-5 w-5 text-white" /> : 'Search'}
                </button>
              </div>
            </div>
          </form>
          {isSearching && (
            <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 space-y-4">
              <LoadingNotice />
              <SkeletonList />
            </div>
          )}
        </>
      );
    }

    const { quota, total, tempEmails, limit } = userResult;
    const shown = tempEmails.length;
    return (
      <>
        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
              <span className="text-slate-300 font-semibold">Viewing temp emails for:</span>
              <span className="text-emerald-400 font-bold break-words max-w-full">{userResult.email}</span>
            </div>
            <button
              type="button"
              onClick={handleGoBack}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Go back
            </button>
          </div>
        </div>

        {quota && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left" aria-label="Daily quota">
            <Stat label="Used today" value={`${quota.usedToday} / ${quota.dailyLimit}`} />
            <Stat label="Left today" value={quota.remainingToday} />
            <Stat label="Resets" value={formatDateTime(parseDate(quota.resetsAt))} hint="00:00 UTC" />
            <Stat label="Total emails" value={total} />
          </div>
        )}

        <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 text-left space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
              Emails
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span>{shown < total ? `Showing the ${shown} newest of ${total}` : `${total} ${total === 1 ? 'email' : 'emails'}`}</span>
              {shown < total && limit < MAX_LIMIT && (
                <button
                  type="button"
                  onClick={() => searchUser(userResult.email, MAX_LIMIT)}
                  disabled={isSearching}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-600/50 text-slate-200 text-xs font-semibold hover:bg-slate-700/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load up to {MAX_LIMIT}
                </button>
              )}
            </div>
          </div>
          {isSearching && <LoadingNotice />}
          <EmailList items={tempEmails} emptyText="This user has not generated temp emails" />
        </div>
      </>
    );
  };

  const renderRecentView = () => (
    <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 text-left space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
            Recent emails
          </h2>
          <p className="text-slate-400 text-sm">The newest temp emails generated by all users</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <span id="recent-limit-label" className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-2">
              Show
            </span>
            <div role="group" aria-labelledby="recent-limit-label" className="inline-flex rounded-2xl border-2 border-slate-600/50 bg-slate-800/50 p-1">
              {LIMIT_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === recentLimit}
                  onClick={() => handleLimitChange(option)}
                  disabled={isLoadingRecent}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${option === recentLimit
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 disabled:opacity-50'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadRecent(recentLimit)}
            disabled={isLoadingRecent}
            aria-label="Refresh recent emails"
            title="Refresh"
            className="w-11 h-11 rounded-2xl border-2 border-slate-600/50 bg-slate-800/50 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/50 flex items-center justify-center transition-colors duration-200 disabled:cursor-wait"
          >
            <Icon d={ICONS.refresh} className={`w-5 h-5 ${isLoadingRecent ? 'animate-spin text-emerald-300' : ''}`} />
          </button>
        </div>
      </div>

      {isLoadingRecent && <LoadingNotice />}
      {recentError && !isLoadingRecent && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <Icon d={ICONS.warning} className="w-5 h-5 text-red-300 flex-shrink-0" />
          <p className="flex-1 text-sm text-red-200">{recentError}</p>
          <button
            type="button"
            onClick={() => loadRecent(recentLimit)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-semibold transition-colors duration-200 flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      {recentEmails === null
        ? isLoadingRecent && <SkeletonList />
        : <EmailList items={recentEmails} emptyText="No temp emails have been generated yet" onViewOwner={handleViewOwner} />}
    </div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'user', label: 'By user' },
    { id: 'recent', label: 'Recent' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
        <div className="relative z-10 text-left">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
            Temp Emails
          </h1>
          <p className="text-slate-300 text-md">View users' temporary .edu emails and the messages they received</p>
          <div role="tablist" aria-label="Temp email views" className="mt-5 flex space-x-4 border-b border-slate-700/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`pb-3 px-1 text-md font-semibold transition-all duration-300 border-b-2 ${activeTab === tab.id
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'user' ? renderUserView() : renderRecentView()}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ margin: '0' }}>
          <div role="alertdialog" aria-label="Error" className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-80 max-w-md">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto flex items-center justify-center bg-red-500/20 rounded-full">
                  <Icon d={ICONS.warning} className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error</h3>
              <p className="text-blue-200 mb-4">{errorMessage}</p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-lg"
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// The page exists only for the temp email admin; everyone else goes back to the admin history
const MajorTempEmails: React.FC = () => {
  const { currentUser } = useAuth();
  if (!canViewTempEmails(currentUser)) return <Navigate to="/major-history" replace />;
  return <MajorTempEmailsView />;
};

export default MajorTempEmails;
