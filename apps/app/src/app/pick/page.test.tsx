import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PickPage from './page';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams({ session: 'test-session' }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function pendingSubmission() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const submission = new Promise<Response>((yes, no) => { resolve = yes; reject = no; });
  vi.stubGlobal('fetch', vi.fn((_url, options) => options.method === 'POST' ? submission : Promise.resolve(new Response('{}'))));
  render(<PickPage />);
  fireEvent.click(screen.getAllByRole('button')[0]);
  return { resolve, reject };
}

it('waits for accepted delivery before showing Sent', async () => {
  const request = pendingSubmission();
  expect(screen.queryByText('Sent!')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Sending');
  expect(screen.getAllByRole('button')).toHaveLength(3);
  for (const option of screen.getAllByRole('button')) expect(option).toBeDisabled();
  await act(async () => { request.resolve(new Response('{}', { status: 200 })); });
  expect(screen.getByText('Sent!')).toBeInTheDocument();
});

it('restores options after a delivery failure and clears stale errors on retry', async () => {
  const request = pendingSubmission();
  await act(async () => { request.reject(new Error('Network unavailable')); });
  expect(screen.queryByText('Sent!')).not.toBeInTheDocument();
  expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument();
  for (const option of screen.getAllByRole('button')) expect(option).toBeEnabled();
  const retry = new Promise<Response>(() => {});
  vi.stubGlobal('fetch', vi.fn(() => retry));
  fireEvent.click(screen.getAllByRole('button')[0]);
  expect(screen.queryByText('Something went wrong. Try again.')).not.toBeInTheDocument();
  expect(screen.queryByText('Sent!')).not.toBeInTheDocument();
});
