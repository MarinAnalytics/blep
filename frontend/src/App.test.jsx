import { render, screen, fireEvent } from '@testing-library/react';
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
});
