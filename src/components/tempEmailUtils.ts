// Helpers for the Temp .edu Email page: dates, message text, verification codes and the sandboxed message document

// Dates may come without a timezone ("2026-10-16 17:05:12"); those are UTC
export const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/.test(normalized);
  const date = new Date(hasTimezone ? normalized : `${normalized}Z`);
  return isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (date: Date | null) => {
  if (!date) return '-';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatFullDate = (date: Date | null) => {
  if (!date) return '-';
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });
};

// "just now", "5 min ago", "3 h ago", "on Oct 15"
export const formatAgo = (date: Date | null, now: number) => {
  if (!date) return '';
  const minutes = Math.floor(Math.max(0, now - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Plain text bodies may contain things like "<user@site.com>", so only real tags count as HTML
const HTML_TAG = /<(html|head|body|meta|style|div|p|br|hr|table|tr|td|span|a|img|font|b|strong|i|em|u|ul|ol|li|h[1-6]|center)(\s[^>]*)?\/?>/i;

export const isHtmlBody = (body: string) => HTML_TAG.test(body);

// Invisible characters that newsletters use to pad the preview text
const INVISIBLE = /[​-‍͏­﻿]/g;

const collapse = (text: string) => text.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();

const BLOCK_TAGS = 'br, p, div, tr, td, th, li, h1, h2, h3, h4, h5, h6, table, section';

// Readable text of a message, used for the list snippet and to find verification codes.
// DOMParser builds an inert document: nothing in it runs or loads.
export const messageToText = (body: string): string => {
  if (!body) return '';
  if (!isHtmlBody(body)) return collapse(body);
  try {
    const doc = new DOMParser().parseFromString(body, 'text/html');
    doc.querySelectorAll('style, script, title, noscript, head').forEach(node => node.remove());
    // Keep words from block elements apart: "<p>Hello</p><p>World</p>" -> "Hello World"
    doc.querySelectorAll(BLOCK_TAGS).forEach(node => node.parentNode?.insertBefore(doc.createTextNode(' '), node.nextSibling));
    return collapse(doc.body?.textContent || '');
  } catch {
    return collapse(body.replace(/<[^>]+>/g, ' '));
  }
};

const CODE_WORDS = '(?:code|c[oó]digo|otp|pin|passcode)';
// "123456", "482 913", "AB12CD"
const CODE_TOKEN = '(\\d{3,4}[ -]\\d{3,4}|[A-Za-z0-9]{4,8})';
// "Your code is 123456", "Código: 4829", "code - AB12CD"
const CODE_AFTER_WORD = new RegExp(`\\b${CODE_WORDS}\\b(?:\\s+(?:is|es|was))?\\s*[:#\\-–]?\\s*${CODE_TOKEN}(?![A-Za-z0-9])`, 'gi');
// "482913 is your Instagram code", "G-482913 is your Google verification code"
const CODE_BEFORE_WORD = new RegExp(`(?:^|[^A-Za-z0-9])${CODE_TOKEN}\\s+(?:(?:is|es)\\s+)?(?:(?:your|tu|su|the)\\s+)?(?:[\\w.-]+\\s+){0,3}${CODE_WORDS}\\b`, 'gi');
// A number on its own, not part of a price, date or time
const LONE_NUMBER = /(?:^|[^\d$€£.,:/])(\d{4,8})(?![.,:/]?\d)/g;
const MENTIONS_CODE = /\b(?:code|c[oó]digo|otp|pin|passcode|verification|verify)\b/i;

const normalizeCode = (token: string) => (/^\d{3,4}[ -]\d{3,4}$/.test(token) ? token.replace(/[ -]/g, '') : token);

const looksLikeCode = (token: string) => {
  const code = normalizeCode(token);
  return code.length >= 4 && code.length <= 8 && /\d/.test(code);
};

const isYear = (token: string) => /^(19|20)\d{2}$/.test(token);

const firstMatch = (pattern: RegExp, text: string, accept: (token: string) => boolean) => {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (accept(match[1])) return normalizeCode(match[1]);
    // Zero-length safety: always move forward
    if (match.index === pattern.lastIndex) pattern.lastIndex++;
  }
  return null;
};

// The verification code of a message, if it has one. The subject is checked before the body.
export const extractCode = (subject: string, text: string): string | null => {
  for (const source of [subject, text]) {
    if (!source) continue;
    const code = firstMatch(CODE_AFTER_WORD, source, looksLikeCode) || firstMatch(CODE_BEFORE_WORD, source, looksLikeCode);
    if (code) return code;
  }
  const loneNumber = (token: string) => !isYear(token);
  const fromSubject = subject ? firstMatch(LONE_NUMBER, subject, loneNumber) : null;
  if (fromSubject) return fromSubject;
  return text && MENTIONS_CODE.test(text) ? firstMatch(LONE_NUMBER, text, loneNumber) : null;
};

// The message is rendered in an iframe sandboxed without allow-scripts or allow-forms. With no scripts,
// allow-same-origin only lets the page measure #mp-root to size the iframe. Links open in a new tab.
export const buildMessageDocument = (body: string) => {
  const content = isHtmlBody(body)
    ? body
    : `<div class="mp-text">${escapeHtml(body || '(This message has no content)')}</div>`;
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; form-action \'none\'">'
    + '<meta name="referrer" content="no-referrer"><meta name="color-scheme" content="light"><base target="_blank">'
    + '<style>html,body{margin:0;padding:0;background:#ffffff}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;overflow-wrap:break-word}'
    + '#mp-root{display:flow-root;padding:16px}img{max-width:100%;height:auto}a{color:#059669}.mp-text{white-space:pre-wrap}</style>'
    + `</head><body><div id="mp-root">${content}</div></body></html>`;
};

// Sender shown in the inbox: the name, or the part of the address before the @
export const senderName = (from: { name: string; address: string }) =>
  from.name?.trim() || from.address?.split('@')[0] || 'Unknown sender';

export const senderInitial = (from: { name: string; address: string }) => {
  const letter = senderName(from).match(/[A-Za-z0-9]/);
  return letter ? letter[0].toUpperCase() : '?';
};
