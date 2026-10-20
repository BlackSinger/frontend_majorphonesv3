import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import ShortNumbers from './ShortNumbers';

const BUY_URL = 'https://buyshortusa-ezeznlhr5a-uc.a.run.app';

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

// Choosing a type loads its catalog; awaiting it keeps every state update inside act()
const chooseType = async (title: 'Regular' | 'Premium') => {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${title}`) }));
  await act(async () => {});
};
const continueToSearch = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
const openCountries = () => fireEvent.click(screen.getByText('United States', { selector: 'span' }));
const pickCountry = async (name: string) => {
  fireEvent.click(screen.getByText(name, { selector: 'span' }));
  await act(async () => {});
};
const serviceInput = () => screen.findByPlaceholderText('Gmail, Facebook, eBay...');
const pickService = async (typed: string, name: string) => {
  fireEvent.change(await serviceInput(), { target: { value: typed } });
  fireEvent.click(await screen.findByText(name, { selector: 'span' }));
};
const search = () => fireEvent.click(screen.getByRole('button', { name: 'Search numbers' }));

beforeEach(() => {
  mockNavigate.mockReset();
  mockReads.length = 0;
  mockDocs = {
    'allCatalog/catalog': { stnUSA: ['Telegram', 'Whatsapp'], stnUK: ['Telegram'], stnUSARegular: ['Discord', 'Whatsapp'] },
    'stnUSA/opt777/services/Whatsapp': { serviceName: 'Whatsapp', price: '0.44', id: 'wa' },
    'stnUSA/opt2/services/Telegram': { serviceName: 'Telegram', price: 1.5, id: '845' },
    'stnUSA/opt10/services/Telegram': { serviceName: 'Telegram', price: '0.90', id: '8' },
    'stnUSA/opt777/services/Telegram': { serviceName: 'Telegram', price: '0.35', id: 'tg' }
  };
  global.fetch = jest.fn(async () => { throw new Error('unexpected fetch'); }) as unknown as typeof fetch;
});

describe('choosing the type of number', () => {
  test('the type is asked before the service search appears', () => {
    render(<ShortNumbers />);
    expect(screen.getByRole('radiogroup', { name: 'Which type of number do you want?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Regular/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByPlaceholderText('Gmail, Facebook, eBay...')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Country')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(mockReads).toEqual([]);
  });

  test('regular numbers only offer the United States', async () => {
    render(<ShortNumbers />);
    await chooseType('Regular');
    expect(screen.getByRole('radio', { name: /^Regular/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Regular numbers are only available in the United States')).toBeInTheDocument();
    openCountries();
    expect(screen.getAllByText(/^(United States|United Kingdom|Germany)$/, { selector: 'span' }).map(el => el.textContent))
      .toEqual(['United States', 'United States']);
  });

  test('premium numbers keep every country', async () => {
    render(<ShortNumbers />);
    await chooseType('Premium');
    openCountries();
    expect(screen.getByText('United Kingdom', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Germany', { selector: 'span' })).toBeInTheDocument();
  });

  test('switching to regular after picking another premium country goes back to the United States', async () => {
    render(<ShortNumbers />);
    await chooseType('Premium');
    openCountries();
    await pickCountry('Germany');
    await chooseType('Regular');
    expect(screen.getByText('United States', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('Germany', { selector: 'span' })).not.toBeInTheDocument();
  });
});

describe('regular numbers', () => {
  const goToSearch = async () => {
    render(<ShortNumbers />);
    await chooseType('Regular');
    continueToSearch();
    await serviceInput();
  };

  test('the search lists only the SMSKody catalog', async () => {
    await goToSearch();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    fireEvent.change(await serviceInput(), { target: { value: 'disc' } });
    expect(await screen.findByText('Discord', { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(await serviceInput(), { target: { value: 'tele' } });
    expect(await screen.findByText('Service not listed', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('Telegram', { selector: 'span' })).not.toBeInTheDocument();
  });

  test('shows the service, price and expiration, then confirms the purchase with option 777', async () => {
    const fetchMock = mockBuy(200, { success: true, status: 'Pending', number: '12145550198', orderId: 'o1' });
    await goToSearch();
    await pickService('whats', 'Whatsapp');
    search();

    expect(await screen.findByText('Confirm your number')).toBeInTheDocument();
    const details = screen.getByText('Service').closest('dl') as HTMLElement;
    expect(within(details).getByText('Whatsapp')).toBeInTheDocument();
    expect(within(details).getByText('$0.44')).toBeInTheDocument();
    expect(within(details).getByText('5 minutes')).toBeInTheDocument();
    expect(mockReads).toContain('stnUSA/opt777/services/Whatsapp');
    expect(mockReads.some(path => path.endsWith('/*'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/history'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(BUY_URL);
    expect(JSON.parse(init.body as string)).toEqual({ serviceId: 'wa', option: 777 });
    expect((init.headers as Record<string, string>).authorization).toBe('id-token-1');
  });

  test.each([
    ['Service unavailable', 'We ran out of SIM cards, try again later'],
    ['Insufficient balance', 'You do not have enough balance to make the purchase']
  ])('a "%s" answer shows "%s" and stays on the confirmation', async (message, shown) => {
    mockBuy(400, { success: false, message });
    await goToSearch();
    await pickService('whats', 'Whatsapp');
    search();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm your number')).toBeInTheDocument();
  });

  test('without a published regular catalog it says so instead of offering "Service not listed"', async () => {
    mockDocs['allCatalog/catalog'] = { stnUSA: ['Telegram'] };
    await goToSearch();
    expect(await screen.findByText('Regular numbers are temporarily unavailable, please try Premium numbers')).toBeInTheDocument();
    expect(await serviceInput()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    await chooseType('Premium');
    continueToSearch();
    expect(await serviceInput()).toBeEnabled();
  });

  test('a service without an SMSKody price is not offered', async () => {
    delete mockDocs['stnUSA/opt777/services/Whatsapp'];
    await goToSearch();
    await pickService('whats', 'Whatsapp');
    search();
    expect(await screen.findByText('No service available')).toBeInTheDocument();
    expect(screen.queryByText('Confirm your number')).not.toBeInTheDocument();
  });

  test('back to search and change return to the previous steps', async () => {
    await goToSearch();
    await pickService('whats', 'Whatsapp');
    search();
    fireEvent.click(await screen.findByRole('button', { name: /Back to Search/ }));
    expect(await serviceInput()).toHaveValue('Whatsapp');
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Regular/ })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('premium numbers keep the current flow', () => {
  test('searches opt1, opt2 and opt10 (never SMSKody) and buys the chosen option', async () => {
    const fetchMock = mockBuy(200, { success: true, status: 'Pending' });
    render(<ShortNumbers />);
    await chooseType('Premium');
    continueToSearch();
    await pickService('tele', 'Telegram');
    search();

    expect(await screen.findByText('Number options')).toBeInTheDocument();
    expect(mockReads).toEqual(expect.arrayContaining(['stnUSA/opt1/services/*', 'stnUSA/opt2/services/*', 'stnUSA/opt10/services/*']));
    expect(mockReads.some(path => path.includes('opt777'))).toBe(false);
    expect(screen.queryByText('$0.35')).not.toBeInTheDocument();
    expect(screen.getAllByText('$0.90').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1.50').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Purchase' })[0]);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/history'));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ serviceId: '8', option: 10 });
  });

  test('premium in another country loads that country catalog', async () => {
    render(<ShortNumbers />);
    await chooseType('Premium');
    openCountries();
    await pickCountry('United Kingdom');
    continueToSearch();
    fireEvent.change(await serviceInput(), { target: { value: 'tele' } });
    expect(await screen.findByText('Telegram', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });
});
