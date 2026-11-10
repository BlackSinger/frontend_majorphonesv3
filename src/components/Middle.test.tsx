import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Middle from './Middle';

const BUY_URL = 'https://buymiddleusa-ezeznlhr5a-uc.a.run.app';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>
}));
jest.mock('../firebase/config', () => ({ db: {}, auth: {} }));
jest.mock('react-firebase-hooks/auth', () => ({ useAuthState: () => [{ uid: 'u1' }] }));
jest.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { getIdToken: () => Promise.resolve('id-token-1') } })
}));

// Firestore documents by path, read through the same doc/collection helpers the component uses
let mockDocs: { [path: string]: any } = {};
const mockReads: string[] = [];
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: async (ref: { path: string }) => {
    mockReads.push(ref.path);
    return { exists: () => ref.path in mockDocs, data: () => mockDocs[ref.path] };
  },
  getDocs: async (ref: { path: string }) => {
    mockReads.push(`${ref.path}/*`);
    const prefix = `${ref.path}/`;
    const docs = Object.entries(mockDocs)
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map(([path, data]) => ({ id: path.slice(prefix.length), data: () => data }));
    return { docs, forEach: (fn: (doc: unknown) => void) => docs.forEach(fn) };
  }
}));

const mockBuy = (status: number, json: object) => {
  const fetchMock = jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => json }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const chooseType = async (title: 'Regular' | 'Premium') => {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${title}`) }));
  await act(async () => {});
};
const continueToSearch = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
const serviceInput = () => screen.findByPlaceholderText('Gmail, Facebook, eBay...');
const pickService = async (typed: string, name: string) => {
  fireEvent.change(await serviceInput(), { target: { value: typed } });
  fireEvent.click(await screen.findByText(name, { selector: 'span' }));
};
const search = () => fireEvent.click(screen.getByRole('button', { name: 'Search numbers' }));
const goToSearch = async (type: 'Regular' | 'Premium') => {
  render(<Middle />);
  await chooseType(type);
  continueToSearch();
  await serviceInput();
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockReads.length = 0;
  mockDocs = {
    'allCatalog/catalog': { middleUSA: ['Telegram', 'Whatsapp'], middleUSARegular: ['Amazon', 'Whatsapp'] },
    'middleUSA/opt11/services/Whatsapp': { name: 'Whatsapp', id: 'wa', priceOneDay: 6.1, priceSevenDays: 19.6 },
    'middleUSA/opt11/services/Amazon': { name: 'Amazon', id: 'am', priceOneDay: 0.6 },
    'middleUSA/opt4/whatsapp': { name: 'Whatsapp', id: 'whatsapp', priceOneDay: 3.4, priceSevenDays: 4.5, priceFourteenDays: 6 }
  };
  mockDocs['middleUSA/opt4/services/whatsapp'] = mockDocs['middleUSA/opt4/whatsapp'];
  delete mockDocs['middleUSA/opt4/whatsapp'];
  global.fetch = jest.fn(async () => { throw new Error('unexpected fetch'); }) as unknown as typeof fetch;
});

describe('choosing the type of number', () => {
  test('the type is asked before the service search, and nothing loads until one is chosen', () => {
    render(<Middle />);
    expect(screen.getByRole('radiogroup', { name: 'Which type of number do you want?' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Gmail, Facebook, eBay...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(mockReads).toEqual([]);
    expect(screen.getByRole('radio', { name: /^Regular/ })).toHaveTextContent('Rent for 1 or 7 days');
    expect(screen.getByRole('radio', { name: /^Premium/ })).toHaveTextContent('Rent for 1, 7 or 14 days');
  });

  test('the search shows the chosen type and Change goes back to the choice', async () => {
    await goToSearch('Regular');
    expect(screen.getByText('Regular', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByRole('radio', { name: /^Regular/ })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('regular middle numbers (SMSBulk, option 11)', () => {
  test('the search lists only the regular catalog', async () => {
    await goToSearch('Regular');
    fireEvent.change(await serviceInput(), { target: { value: 'ama' } });
    expect(await screen.findByText('Amazon', { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(await serviceInput(), { target: { value: 'tele' } });
    expect(await screen.findByText('Service not listed', { selector: 'span' })).toBeInTheDocument();
  });

  test('shows 1 and 7 days from one read of opt11 and buys with option 11 and the service name', async () => {
    const fetchMock = mockBuy(200, { success: true, orderId: 'o1', number: '12025550123', status: 'Inactive' });
    await goToSearch('Regular');
    await pickService('whats', 'Whatsapp');
    search();

    expect(await screen.findByText('Number options')).toBeInTheDocument();
    expect(screen.getAllByText('$6.10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$19.60').length).toBeGreaterThan(0);
    expect(screen.queryByText('$3.40')).not.toBeInTheDocument();
    expect(screen.queryAllByText('14 days', { selector: 'span' })).toHaveLength(0);
    expect(screen.getAllByText('7 days', { selector: 'span' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('No').length).toBeGreaterThan(0);
    expect(mockReads).toContain('middleUSA/opt11/services/Whatsapp');
    expect(mockReads.some(path => path.endsWith('/*'))).toBe(false);

    fireEvent.click(screen.getAllByRole('button', { name: 'Purchase' })[2]);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/history'));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(BUY_URL);
    expect(JSON.parse(init.body as string)).toEqual({ serviceId: 'Whatsapp', duration: 7, option: 11 });
    expect((init.headers as Record<string, string>).authorization).toBe('id-token-1');
  });

  test('a service with only 1 day shows only 1 day', async () => {
    await goToSearch('Regular');
    await pickService('ama', 'Amazon');
    search();
    expect(await screen.findByText('Number options')).toBeInTheDocument();
    expect(screen.getAllByText('$0.60').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 day', { selector: 'span' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('7 days', { selector: 'span' })).toHaveLength(0);
  });

  test.each([
    ['Service unavailable', 'We ran out of SIM cards, try again later'],
    ['Insufficient balance', 'You do not have enough balance to make the purchase'],
    ['You cannot rent, because you have used Amazon Pay', 'Users that deposit with Amazon Pay cannot purchase middle numbers']
  ])('a "%s" answer shows "%s"', async (message, shown) => {
    mockBuy(400, { success: false, message });
    await goToSearch('Regular');
    await pickService('ama', 'Amazon');
    search();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Purchase' }))[0]);
    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('without a published regular catalog it says so', async () => {
    mockDocs['allCatalog/catalog'] = { middleUSA: ['Telegram'] };
    await goToSearch('Regular');
    expect(await screen.findByText('Regular numbers are temporarily unavailable, please try Premium numbers')).toBeInTheDocument();
    expect(await serviceInput()).toBeDisabled();
  });

  test('a service without a regular price is not offered', async () => {
    delete mockDocs['middleUSA/opt11/services/Whatsapp'];
    await goToSearch('Regular');
    await pickService('whats', 'Whatsapp');
    search();
    expect(await screen.findByText('No service available')).toBeInTheDocument();
    expect(screen.queryByText('Number options')).not.toBeInTheDocument();
  });
});

describe('premium middle numbers keep the current flow', () => {
  test('reads opt4 and opt5 (never SMSBulk) and buys without option', async () => {
    const fetchMock = mockBuy(200, { success: true, orderId: 'o1', status: 'Inactive' });
    await goToSearch('Premium');
    await pickService('whats', 'Whatsapp');
    search();

    expect(await screen.findByText('Number options')).toBeInTheDocument();
    expect(mockReads).toEqual(expect.arrayContaining(['middleUSA/opt4/services/*', 'middleUSA/opt5/services/*']));
    expect(mockReads.some(path => path.includes('opt11'))).toBe(false);
    expect(screen.getAllByText('$3.40').length).toBeGreaterThan(0);
    expect(screen.queryByText('$6.10')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Purchase' })[0]);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/history'));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ serviceId: 'whatsapp', duration: 1 });
  });
});
