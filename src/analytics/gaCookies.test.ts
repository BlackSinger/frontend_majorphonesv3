import { readGaClientId, readGaSessionId } from './gaCookies';

describe('GA cookies', () => {
  test('client id is the last two parts of _ga', () => {
    expect(readGaClientId('GA1.1.1234567890.1791000000')).toBe('1234567890.1791000000');
    expect(readGaClientId('GA1.2.42.1791000000')).toBe('42.1791000000');
    expect(readGaClientId('junk')).toBeUndefined();
    expect(readGaClientId(undefined)).toBeUndefined();
  });
  test('session id from old (GS1) and new (GS2) _ga_<id> formats', () => {
    expect(readGaSessionId('GS1.1.1791000500.3.1.1791000600.0.0.0')).toBe('1791000500');
    expect(readGaSessionId('GS2.1.s1791000500$o3$g1$t1791000600$j60$l0$h0')).toBe('1791000500');
    expect(readGaSessionId('GS2.1.sabc$o3')).toBeUndefined();
    expect(readGaSessionId(undefined)).toBeUndefined();
  });
  test('reads the real cookies by default', () => {
    document.cookie = '_ga=GA1.1.555.1791000000';
    document.cookie = '_ga_8M931KWSPB=GS2.1.s1791000700$o1$g0$t1791000700$j60$l0$h0';
    expect(readGaClientId()).toBe('555.1791000000');
    expect(readGaSessionId()).toBe('1791000700');
  });
});
