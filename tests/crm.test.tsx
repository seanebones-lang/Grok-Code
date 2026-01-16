import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRM from '@/app/crm/page';

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Test Lead', email: 'test@example.com' }] }),
      insert: jest.fn().mockResolvedValue({}),
    }),
    channel: () => ({
      on: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    }),
  }),
}));

jest.mock('@/lib/ml', () => ({
  predictLeadScore: jest.fn(() => 0.85),
}));

test('renders CRM and adds lead', async () => {
  render(<CRM />);
  expect(screen.getByText(/Enterprise CRM Dashboard/i)).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText(/Lead Name/i), { target: { value: 'Test Lead' } });
  fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByText(/Add Lead/i));
  await waitFor(() => expect(screen.getByText('Test Lead')).toBeInTheDocument());
});