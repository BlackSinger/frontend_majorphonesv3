import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useNavigate, NavigateFunction } from 'react-router-dom';
import MetaPixelTracker from './MetaPixelTracker';
import { initMetaPixel, trackPageView } from '../analytics/metaPixel';

jest.mock('../analytics/metaPixel', () => ({
  ...jest.requireActual('../analytics/metaPixel'),
  initMetaPixel: jest.fn(),
  trackPageView: jest.fn(),
}));

let navigate: NavigateFunction;
const NavigationProbe = () => {
  navigate = useNavigate();
  return null;
};
const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <MetaPixelTracker />
    <NavigationProbe />
  </MemoryRouter>
);

beforeEach(() => jest.clearAllMocks());

test('one PageView on load and one per route change (query changes alone do not count)', async () => {
  renderAt('/');
  expect(trackPageView).toHaveBeenCalledTimes(1);
  await act(async () => { navigate('/signup'); });
  expect(trackPageView).toHaveBeenCalledTimes(2);
  await act(async () => { navigate('/signup?utm_source=meta'); });
  expect(trackPageView).toHaveBeenCalledTimes(2);
  await act(async () => { navigate('/dashboard'); });
  expect(trackPageView).toHaveBeenCalledTimes(3);
  expect(initMetaPixel).toHaveBeenCalled();
});

test('admin routes (/major-*) never load the pixel nor send PageViews', async () => {
  renderAt('/major-history');
  expect(initMetaPixel).not.toHaveBeenCalled();
  expect(trackPageView).not.toHaveBeenCalled();
  await act(async () => { navigate('/major-user'); });
  expect(trackPageView).not.toHaveBeenCalled();
  await act(async () => { navigate('/dashboard'); });
  expect(trackPageView).toHaveBeenCalledTimes(1);
});
