import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

// Mock Audio to avoid errors in jsdom
global.Audio = class {
  constructor() { this.currentTime = 0; this.volume = 1; }
  play() { return Promise.resolve(); }
};

// Mock fetch for flag API
global.fetch = vi.fn(() => Promise.resolve({
  json: () => Promise.resolve({ country_code: 'US', country_name: 'United States' })
}));

describe('App', () => {
  test('renders counter starting at configured initial value', () => {
    const initial = 3;
    import.meta.env.VITE_INITIAL_BLEP_COUNT = String(initial);
    render(<App />);
    expect(screen.getByText(initial.toLocaleString())).toBeInTheDocument();
  });

  test('increments counter on click/press', () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    render(<App />);
    const button = screen.getByRole('button', { name: /boop the snoot/i });
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('keyboard activation increments counter', () => {
    import.meta.env.VITE_INITIAL_BLEP_COUNT = '0';
    render(<App />);
    const button = screen.getByRole('button', { name: /boop the snoot/i });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
