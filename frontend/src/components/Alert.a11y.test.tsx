import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Alert } from './Alert';

expect.extend(toHaveNoViolations);

describe('Alert Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
        const { container } = render(
            <Alert type="info">This is an alert message</Alert>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA role and live region', () => {
        render(<Alert type="success">Success message</Alert>);
        const alert = screen.getByRole('alert');

        expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible label for different types', () => {
        const types: Array<'success' | 'error' | 'warning' | 'info'> = [
            'success',
            'error',
            'warning',
            'info',
        ];

        types.forEach((type) => {
            const { unmount } = render(<Alert type={type}>Message</Alert>);
            const alert = screen.getByRole('alert');
            expect(alert).toHaveAttribute('aria-label');
            unmount();
        });
    });

    it('should have accessible close button when provided', () => {
        const handleClose = jest.fn();
        render(
            <Alert type="info" onClose={handleClose}>
                Closeable alert
            </Alert>
        );

        const closeButton = screen.getByRole('button', { name: /fermer/i });
        expect(closeButton).toBeInTheDocument();
    });

    it('should not have violations for all alert types', async () => {
        const types: Array<'success' | 'error' | 'warning' | 'info'> = [
            'success',
            'error',
            'warning',
            'info',
        ];

        for (const type of types) {
            const { container, unmount } = render(
                <Alert type={type} title={`${type} title`}>
                    Message
                </Alert>
            );
            const results = await axe(container);
            expect(results).toHaveNoViolations();
            unmount();
        }
    });

    it('should display title when provided', () => {
        render(
            <Alert type="error" title="Error Title">
                Error message
            </Alert>
        );

        expect(screen.getByText('Error Title')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
    });
});
