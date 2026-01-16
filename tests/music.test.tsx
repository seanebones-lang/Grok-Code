import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MusicCreator from '@/app/music/page';

jest.mock('@/lib/supabase');
jest.mock('@/lib/composer', () => ({ generateMusic: () => Promise.resolve({ url: 'test.mid', score: 0.9 }) }));

test('generates music from prompt', async () => {
  render(<MusicCreator />);
  fireEvent.change(screen.getByPlaceholderText(/Describe music/i), { target: { value: 'jazz' } });
  fireEvent.click(screen.getByText('Create'));
  await waitFor(() => expect(screen.getByText('jazz')).toBeInTheDocument());
});