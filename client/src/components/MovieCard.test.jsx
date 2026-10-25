import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MovieCard from './MovieCard';

describe('MovieCard', () => {
  it('shows title, year, rating and links to the movie', () => {
    render(<MemoryRouter><MovieCard movie={{ id: 603, title: 'The Matrix', releaseDate: '1999-03-30', voteAverage: 8.2, posterPath: '/x.jpg' }} /></MemoryRouter>);
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('8.2')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/movie/603');
  });
});
