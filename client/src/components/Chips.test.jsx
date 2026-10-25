import { render, screen, fireEvent } from '@testing-library/react';
import Chips from './Chips';

describe('Chips', () => {
  const opts = [{ id: 1, name: 'Comedy' }, { id: 2, name: 'Drama' }];
  it('marks selected chips and calls onToggle', () => {
    const onToggle = vi.fn();
    render(<Chips options={opts} selected={[1]} onToggle={onToggle} label="Genres" />);
    expect(screen.getByRole('button', { name: 'Comedy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Drama' }));
    expect(onToggle).toHaveBeenCalledWith(2);
  });
  it('supports single selection', () => {
    render(<Chips options={opts} selected={2} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true');
  });
});
