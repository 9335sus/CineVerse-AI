import { render, screen } from '@testing-library/react';
import { SPOILER, Unofficial } from './Stories';

describe('Story labelling', () => {
  it('always shows the unofficial AI-generated notice', () => {
    render(<Unofficial />);
    expect(screen.getByRole('note')).toHaveTextContent(/Unofficial, AI-generated alternate story/);
    expect(screen.getByRole('note')).toHaveTextContent(/not part of the film/);
  });
  it('names all three spoiler levels', () => { expect(Object.keys(SPOILER)).toEqual(['none', 'light', 'full']); });
});
