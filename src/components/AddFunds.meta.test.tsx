import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddFunds from './AddFunds';
import { trackEvent } from '../analytics/metaPixel';

jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1', email: 'u1@example.com' } }) }));
jest.mock('../analytics/metaPixel', () => ({ trackEvent: jest.fn() }));
jest.mock('../firebase/config', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: { getIdToken: jest.fn().mockResolvedValue('id-token-1') } }) }));

const CRYPTOMUS_URL = 'https://createordercryptomus-ezeznlhr5a-uc.a.run.app';
const PAYSSION_URL = 'https://createorderpayssion-ezeznlhr5a-uc.a.run.app';

const mockOrderResponse = (response: { ok: boolean; status: number; json?: unknown; text?: string }) => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.json,
    text: async () => response.text ?? '',
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

// The "Select" button that belongs to a payment method row
const selectMethod = (name: string) => {
  let node: HTMLElement | null = screen.getAllByText(name)[0];
  while (node && !within(node).queryByRole('button', { name: /^Select(ed)?$/ })) node = node.parentElement;
  fireEvent.click(within(node!).getByRole('button', { name: /^Select(ed)?$/ }));
};

const payWith = async (name: string, amount: string) => {
  render(<MemoryRouter><AddFunds /></MemoryRouter>);
  selectMethod(name);
  fireEvent.change(screen.getAllByPlaceholderText('0')[0], { target: { value: amount } });
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`Add \\$${amount} via ${name}`) }));
};

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('Cryptomus: InitiateCheckout fires with the backend order id before redirecting to pay', async () => {
  const fetchMock = mockOrderResponse({ ok: true, status: 200, json: { success: true, url: 'https://pay.cryptomus.com/x', orderId: 'ord-1' } });
  await payWith('Cryptomus', '10');
  await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('InitiateCheckout', { value: 10, currency: 'USD' }, 'ic_ord-1'));
  expect(fetchMock).toHaveBeenCalledWith(CRYPTOMUS_URL, expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 10 });
});

test('Payssion (Alipay): InitiateCheckout uses the Payssion order id', async () => {
  const fetchMock = mockOrderResponse({ ok: true, status: 200, json: { success: true, url: 'https://payssion.com/x', orderId: 'ord-2' } });
  await payWith('Alipay', '5');
  await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('InitiateCheckout', { value: 5, currency: 'USD' }, 'ic_ord-2'));
  expect(fetchMock).toHaveBeenCalledWith(PAYSSION_URL, expect.anything());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 5, paymentName: 'alipay_cn' });
});

test('no InitiateCheckout when the order could not be created', async () => {
  const fetchMock = mockOrderResponse({ ok: false, status: 404, text: 'Payment method not available' });
  await payWith('Cryptomus', '10');
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(trackEvent).not.toHaveBeenCalled();
});
