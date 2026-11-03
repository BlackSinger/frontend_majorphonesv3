import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyBrowser, { DOWNLOAD_URL } from './PrivacyBrowser';
import Sidebar from './Sidebar';

jest.mock('../firebase/config', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));

test('links to the MajorStealth installer and the official support channels', () => {
  render(<MemoryRouter><PrivacyBrowser /></MemoryRouter>);
  expect(DOWNLOAD_URL).toBe('https://www.majorphones.com/downloads/MajorStealth-1.1.0-x64-Setup.exe');
  expect(screen.getByRole('link', { name: /download for windows/i })).toHaveAttribute('href', DOWNLOAD_URL);
  expect(screen.getByText(/is in beta/i)).toBeInTheDocument();
  expect(screen.getByText(/Windows SmartScreen may show/i)).toBeInTheDocument();
  expect(screen.getByText(/MajorStealth is free/i)).toBeInTheDocument();
  // The getting started steps come right after the beta notice
  const beta = screen.getByText(/is in beta/i), steps = screen.getByText('How to get started:');
  expect(beta.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(steps.compareDocumentPosition(screen.getByRole('link', { name: /download for windows/i })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Tickets' })).toHaveAttribute('href', '/tickets');
  expect(screen.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', 'https://t.me/MajorPhones');
  expect(screen.getByRole('link', { name: 'support@majorphones.com' })).toHaveAttribute('href', 'mailto:support@majorphones.com');
  ['Isolated cookies', 'Separate fingerprints', 'Private history', 'Settings per profile'].forEach(title => expect(screen.getByText(title)).toBeInTheDocument());
});

test('the user sidebar shows Privacy Browser right below Empty SIM cards', () => {
  render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar /></MemoryRouter>);
  const names = screen.getAllByRole('link').map(link => link.textContent?.trim());
  expect(names.indexOf('Privacy Browser')).toBe(names.indexOf('Empty SIM cards') + 1);
  expect(screen.getByRole('link', { name: 'Privacy Browser' })).toHaveAttribute('href', '/privacy-browser');
});
