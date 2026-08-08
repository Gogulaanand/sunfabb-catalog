import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContactPage from './page';

vi.mock('@/components/storefront/contact-form', () => ({
  default: () => <form aria-label="Contact form" />,
}));

describe('contact page', () => {
  it('renders the owner-approved contact channels and enquiry route', () => {
    render(<ContactPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Contact Us' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Contact form' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Reach us directly')).toBeInTheDocument();
    expect(screen.queryByText(/XXXXX|\.\.\./)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /factory location on Google Maps/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Email us/i })).toBeInTheDocument();
    expect(
      document.querySelector('script[type="application/ld+json"]'),
    ).toBeTruthy();
  });
});
