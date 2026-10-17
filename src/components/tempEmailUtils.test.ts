import { extractCode, messageToText, buildMessageDocument, parseDate, formatAgo, senderName, senderInitial } from './tempEmailUtils';

describe('extractCode', () => {
  test.each([
    ['Your code is 123456', '', '123456'],
    ['G-482913 is your Google verification code', '', '482913'],
    ['482913 is your Instagram code', '', '482913'],
    ['Verify your email', 'Enter this code: 482 913 to continue', '482913'],
    ['Your Steam login', 'Steam Guard code: F7K2Q', 'F7K2Q'],
    ['Confirm your account', 'Your code expires in 10 minutes. Code: AB12CD', 'AB12CD'],
    ['Tu código de verificación', 'Tu código es 7314', '7314'],
    ['Discord 556677', '', '556677'],
    ['Verification', 'Use the code below to sign in 3489 It expires soon', '3489'],
  ])('%s / %s -> %s', (subject, text, code) => {
    expect(extractCode(subject, text)).toBe(code);
  });

  test.each([
    ['Welcome to Notion', 'Thanks for signing up. © 2026 Notion Labs'],
    ['Your 2026 summary', 'See what happened this year'],
    ['cachorra', 'cachorra'],
    ['Order shipped', 'Your order total is $1234.56'],
    ['Meeting at 10:30', 'See you on 2026-10-17'],
  ])('no code in %s / %s', (subject, text) => {
    expect(extractCode(subject, text)).toBeNull();
  });
});

describe('messageToText', () => {
  test('drops styles and keeps words of block elements apart', () => {
    expect(messageToText('<style>p{color:red}</style><p>Hello</p><p>World</p><script>alert(1)</script>')).toBe('Hello World');
  });

  test('removes invisible preview padding', () => {
    expect(messageToText('<div>Hi‌͏ there</div>')).toBe('Hi there');
  });

  test('plain text is only collapsed', () => {
    expect(messageToText('Reply to <old@site.com>\n\nThanks')).toBe('Reply to <old@site.com> Thanks');
  });
});

describe('buildMessageDocument', () => {
  test('wraps HTML with the base styles, the link target and a no-script policy', () => {
    const doc = buildMessageDocument('<p>Code <b>123456</b></p>');
    expect(doc).toContain('<div id="mp-root"><p>Code <b>123456</b></p></div>');
    expect(doc).toContain('<base target="_blank">');
    expect(doc).toContain('img{max-width:100%');
    expect(doc).toContain("script-src 'none'");
  });

  test('escapes plain text and keeps its line breaks', () => {
    expect(buildMessageDocument('Reply to <old@site.com>\nThanks'))
      .toContain('<div class="mp-text">Reply to &lt;old@site.com&gt;\nThanks</div>');
  });
});

test('dates without a timezone are UTC', () => {
  expect(parseDate('2026-10-16 11:00:00')?.toISOString()).toBe('2026-10-16T11:00:00.000Z');
  expect(parseDate('2026-10-16T12:30:00.000000Z')?.toISOString()).toBe('2026-10-16T12:30:00.000Z');
  expect(parseDate(null)).toBeNull();
});

test('formatAgo', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  expect(formatAgo(new Date(now - 20 * 1000), now)).toBe('just now');
  expect(formatAgo(new Date(now - 5 * 60 * 1000), now)).toBe('5 min ago');
  expect(formatAgo(new Date(now - 3 * 3600 * 1000), now)).toBe('3 h ago');
  expect(formatAgo(new Date('2026-10-15T12:00:00Z'), now)).toMatch(/^on Oct 1[45]$/);
});

test('sender name and initial', () => {
  expect(senderName({ name: 'Orlian Prato', address: 'o@x.com' })).toBe('Orlian Prato');
  expect(senderName({ name: '', address: 'welcome@notion.so' })).toBe('welcome');
  expect(senderInitial({ name: '', address: 'welcome@notion.so' })).toBe('W');
  expect(senderInitial({ name: '"Google"', address: '' })).toBe('G');
});
