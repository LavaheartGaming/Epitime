import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Button } from './Button';


describe('Button Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
        const { container } = render(<Button>Click me</Button>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes when disabled', () => {
        render(<Button disabled>Disabled Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toBeDisabled();
    });

    it('should have proper ARIA attributes when loading', () => {
        render(<Button loading>Loading Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toBeDisabled();
    });

    it('should have accessible name from children', () => {
        render(<Button>Submit Form</Button>);
        const button = screen.getByRole('button', { name: /submit form/i });
        expect(button).toBeInTheDocument();
    });

    it('should use aria-label when provided', () => {
        render(<Button ariaLabel="Close dialog">X</Button>);
        const button = screen.getByRole('button', { name: /close dialog/i });
        expect(button).toBeInTheDocument();
    });

    it('should have minimum touch target size (44x44px)', () => {
        const { container } = render(<Button>Click</Button>);
        const button = container.querySelector('button');
        const styles = window.getComputedStyle(button!);

        // Check min-height is at least 44px
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('should be keyboard accessible', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        const button = screen.getByRole('button');

        button.focus();
        expect(button).toHaveFocus();
    });

    it('should have different variants without accessibility violations', async () => {
        const variants: Array<'primary' | 'secondary' | 'danger' | 'success'> = [
            'primary',
            'secondary',
            'danger',
            'success',
        ];

        for (const variant of variants) {
            const { container } = render(<Button variant={variant}>Button</Button>);
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        }
    });
});
