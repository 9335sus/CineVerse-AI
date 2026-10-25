import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import WhereToWatch from './WhereToWatch';
import * as movies from '../services/movies';

vi.mock('../services/movies');

describe('WhereToWatch', () => {
  it('groups providers, links each service, and shows attribution', async () => {
    movies.getProviders.mockResolvedValue({ region: 'IN', link: 'https://example.com/watch', stream: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }], free: [], ads: [], rent: [{ id: 3, name: 'Google Play Movies', logoPath: null }, { id: 99, name: 'NewService', logoPath: null }], buy: [], attribution: 'JustWatch' });
    render(<WhereToWatch movieId={603} title="The Matrix" />);
    const netflix = await screen.findByRole('link', { name: /Open Netflix/ });
    expect(netflix).toHaveAttribute('href', 'https://www.netflix.com/search?q=The%20Matrix');
    expect(netflix).toHaveAttribute('target', '_blank');
    expect(netflix).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: /Open Google Play Movies/ })).toHaveAttribute('href', expect.stringContaining('play.google.com'));
    expect(screen.getByRole('link', { name: /Open NewService/ })).toHaveAttribute('href', 'https://example.com/watch'); // falls back to the JustWatch page
    expect(screen.getByText('Stream (subscription)')).toBeInTheDocument();
    expect(screen.queryByText('Buy')).not.toBeInTheDocument();
    expect(screen.getByText(/JustWatch via TMDB/)).toBeInTheDocument();
  });
  it('shows an empty message when nothing is available', async () => {
    movies.getProviders.mockResolvedValue({ region: 'IN', link: null, stream: [], free: [], ads: [], rent: [], buy: [] });
    render(<WhereToWatch movieId={1} title="X" />);
    await waitFor(() => expect(screen.getByText(/Not listed on any streaming/)).toBeInTheDocument());
  });
  it('shows an error with retry', async () => {
    movies.getProviders.mockRejectedValue(new Error('boom'));
    render(<WhereToWatch movieId={1} title="X" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load availability/);
  });
});
