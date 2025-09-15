import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';

// Mock Audio to avoid errors in jsdom
global.Audio = class {
  constructor() { this.currentTime = 0; this.volume = 1; }
  play() { return Promise.resolve(); }
};

// Mock fetch for flag API, leaderboard and blep POST
global.fetch = vi.fn((url, options = {}) => {
  if (typeof url === 'string' && url.includes('ipapi.co')) {
    return Promise.resolve({ json: () => Promise.resolve({ country_code: 'US', country_name: 'United States' }) });
  }
  if (typeof url === 'string' && url.includes('/api/leaderboard')) {
    return Promise.resolve({ json: () => Promise.resolve([]) });
  }
  if (typeof url === 'string' && url.includes('/api/blep') && options.method === 'POST') {
    return Promise.resolve({ json: () => Promise.resolve({ country_code: 'US', country_name: 'United States', bleps: 1 }) });
  }
  return Promise.resolve({ json: () => Promise.resolve({}) });
});

beforeEach(() => {
  global.fetch.mockClear();
  import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
  import.meta.env.VITE_BLEP_DEBOUNCE_MS = undefined;
});

describe('App', () => {
  test('renders counter starting at configured initial value', async () => {
    const initial = 3;
    import.meta.env.VITE_INITIAL_BLEP_COUNT = String(initial);
    render(<App />);
    // Await the counter appearing (effect-driven updates wrapped in act internally)
    expect(await screen.findByText(initial.toLocaleString())).toBeInTheDocument();
  });

  test('increments counter on click/press', async () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    render(<App />);
    const button = await screen.findByRole('button', { name: /boop the snoot/i });
    fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(button, { pointerId: 1, pointerType: 'touch' });
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  test('keyboard activation increments counter', async () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    render(<App />);
    const button = await screen.findByRole('button', { name: /boop the snoot/i });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  test('debounces multiple rapid presses into one network POST with aggregated count', async () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    import.meta.env.VITE_BLEP_DEBOUNCE_MS = '25'; // short for test speed
    render(<App />);
    await screen.findByAltText(/united states flag/i);
    const button = await screen.findByRole('button', { name: /boop the snoot/i });
    global.fetch.mockClear();

    for (let i = 0; i < 5; i++) {
      fireEvent.pointerDown(button, { pointerId: i + 1, pointerType: 'mouse' });
      fireEvent.pointerUp(button, { pointerId: i + 1, pointerType: 'mouse' });
    }
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(global.fetch.mock.calls.find(c => String(c[0]).includes('/api/blep'))).toBeFalsy();

    await waitFor(() => {
      const blepCalls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/api/blep'));
      expect(blepCalls.length).toBe(1);
      const body = JSON.parse(blepCalls[0][1].body);
      expect(body.count).toBe(5);
    });
  });

  test('flushes pending increments on visibility change (hidden) even before debounce delay', async () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    import.meta.env.VITE_BLEP_DEBOUNCE_MS = '60000';
    render(<App />);
    await screen.findByAltText(/united states flag/i);
    const button = await screen.findByRole('button', { name: /boop the snoot/i });
    global.fetch.mockClear();
    for (let i = 0; i < 3; i++) {
      fireEvent.pointerDown(button, { pointerType: 'mouse' });
      fireEvent.pointerUp(button, { pointerType: 'mouse' });
    }
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(global.fetch.mock.calls.find(c => String(c[0]).includes('/api/blep'))).toBeFalsy();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      const blepCalls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/api/blep'));
      expect(blepCalls.length).toBe(1);
      const body = JSON.parse(blepCalls[0][1].body);
      expect(body.count).toBe(3);
    });
  });
});
