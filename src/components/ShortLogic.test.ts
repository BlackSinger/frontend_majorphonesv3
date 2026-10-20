import { getShortAvailableActions } from './ShortLogic';

const NOW = new Date('2026-10-20T16:00:00Z').getTime();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60 * 1000);

const record = (overrides: object) => ({
  id: 'o1',
  date: '',
  expirationDate: '',
  number: '12145550198',
  serviceType: 'Short',
  status: 'Pending' as const,
  service: 'Whatsapp',
  price: 0.19,
  duration: '',
  code: '',
  country: 'USA',
  createdAt: minutesAgo(0.1),
  ...overrides
});

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

describe('regular numbers (opt 777)', () => {
  test('can be cancelled right after the purchase while no SMS has arrived', () => {
    expect(getShortAvailableActions(record({ opt: 777, createdAt: minutesAgo(0.1) }))).toEqual(['Cancel']);
    expect(getShortAvailableActions(record({ opt: 777, createdAt: minutesAgo(2) }))).toEqual(['Cancel']);
  });

  test('cannot be cancelled once the SMS arrived, nor reused', () => {
    expect(getShortAvailableActions(record({ opt: 777, code: '482731' }))).toEqual([]);
    expect(getShortAvailableActions(record({ opt: 777, status: 'Completed', code: '482731' }))).toEqual([]);
  });

  test('cannot be cancelled after the 5 minutes ran out', () => {
    expect(getShortAvailableActions(record({ opt: 777, createdAt: minutesAgo(6) }))).toEqual([]);
  });
});

describe('the other options keep the 2:45 wait', () => {
  test.each([1, 2, 10])('opt %i', (opt) => {
    expect(getShortAvailableActions(record({ opt, createdAt: minutesAgo(1) }))).toEqual([]);
    expect(getShortAvailableActions(record({ opt, createdAt: minutesAgo(3) }))).toEqual(['Cancel']);
  });

  test('reusable options still offer Reuse after the SMS', () => {
    expect(getShortAvailableActions(record({ opt: 10, status: 'Completed', code: '1' }))).toEqual(['Reuse']);
    expect(getShortAvailableActions(record({ opt: 2, status: 'Completed', code: '1' }))).toEqual([]);
  });
});
