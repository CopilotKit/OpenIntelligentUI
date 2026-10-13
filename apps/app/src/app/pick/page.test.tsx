import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PickPage from './page';
const navigation = vi.hoisted(() => ({ session: 'first-session' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams({ session: navigation.session }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); navigation.session = 'first-session'; });

it('allows a fresh pick after navigating from a completed session', async () => {
  const fetch = vi.fn(() => Promise.resolve(new Response('{}')));
  vi.stubGlobal('fetch', fetch);
  const view = render(<PickPage />);
  await act(async () => { fireEvent.click(screen.getAllByRole('button')[0]); });
  expect(screen.getByText('Sent!')).toBeInTheDocument();
  navigation.session = 'second-session';
  view.rerender(<PickPage />);
  expect(screen.queryByText('Sent!')).not.toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(3);
  await act(async () => { fireEvent.click(screen.getAllByRole('button')[0]); });
  const submissions = fetch.mock.calls.filter((call) => (call as unknown as [string, RequestInit])[1]?.method === 'POST');
  expect(submissions).toHaveLength(2);
  expect(JSON.parse((submissions[1] as unknown as [string, RequestInit])[1].body as string).sessionId).toBe('second-session');
});

it('isolates a late failed request from the next session', async () => {
  let reject!: (error: Error) => void;
  const oldRequest = new Promise<Response>((_resolve, no) => { reject = no; });
  vi.stubGlobal('fetch', vi.fn((_url, options) => options.method === 'POST' ? oldRequest : Promise.resolve(new Response('{}'))));
  const view = render(<PickPage />);
  fireEvent.click(screen.getAllByRole('button')[0]);
  navigation.session = 'second-session';
  view.rerender(<PickPage />);
  await act(async () => { reject(new Error('Old session expired')); });
  expect(screen.queryByText('Something went wrong. Try again.')).not.toBeInTheDocument();
  expect(screen.getByText('Pick a Visualization')).toBeInTheDocument();
});
