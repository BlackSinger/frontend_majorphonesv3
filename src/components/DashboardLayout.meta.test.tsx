import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { syncMetaContext } from '../analytics/metaPixel';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../analytics/metaPixel', () => ({ syncMetaContext: jest.fn() }));
jest.mock('./Sidebar', () => () => null);
jest.mock('../firebase/config', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));

const renderLayout = () => render(
  <MemoryRouter>
    <DashboardLayout><p>content</p></DashboardLayout>
  </MemoryRouter>
);

beforeEach(() => jest.clearAllMocks());

test('syncs the Meta context once the signed-in user reaches the dashboard', () => {
  const user = { uid: 'u1', email: 'u1@example.com' };
  (useAuth as jest.Mock).mockReturnValue({ currentUser: user });
  renderLayout();
  expect(syncMetaContext).toHaveBeenCalledTimes(1);
  expect(syncMetaContext).toHaveBeenCalledWith(user);
});

test('does nothing without a signed-in user', () => {
  (useAuth as jest.Mock).mockReturnValue({ currentUser: null });
  renderLayout();
  expect(syncMetaContext).not.toHaveBeenCalled();
});
