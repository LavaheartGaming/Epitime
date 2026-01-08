import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Input } from './Input';


describe('Input Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
        const { container } = render(
            <Input id="test-input" label="Test Input" value="" onChange={() => { }} />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should have proper label association', () => {
        render(<Input id="email" label="Email Address" value="" onChange={() => { }} />);
        const input = screen.getByLabelText(/email address/i);
        expect(input).toBeInTheDocument();
    });

    it('should indicate required fields', () => {
        render(<Input id="name" label="Name" value="" onChange={() => { }} required />);
        const input = screen.getByLabelText(/name/i);
        expect(input).toHaveAttribute('aria-required', 'true');
        expect(input).toBeRequired();
    });

    it('should display error messages with proper ARIA', () => {
        render(
            <Input
                id="email"
                label="Email"
                value=""
                onChange={() => { }}
                error="Email is required"
            />
        );

        const input = screen.getByLabelText(/email/i);
        const errorMessage = screen.getByRole('alert');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(errorMessage).toHaveTextContent(/email is required/i);
    });

    it('should associate help text with input', () => {
        render(
            <Input
                id="password"
                label="Password"
                value=""
                onChange={() => { }}
                helpText="Must be at least 8 characters"
            />
        );

        const input = screen.getByLabelText(/password/i);
        const helpText = screen.getByText(/must be at least 8 characters/i);

        expect(input).toHaveAttribute('aria-describedby');
        expect(helpText).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
        const user = userEvent.setup();
        const handleChange = jest.fn();

        render(<Input id="test" label="Test" value="" onChange={handleChange} />);
        const input = screen.getByLabelText(/test/i);

        await user.click(input);
        expect(input).toHaveFocus();

        await user.keyboard('hello');
        expect(handleChange).toHaveBeenCalled();
    });

    it('should have minimum touch target size', () => {
        render(
            <Input id="test" label="Test" value="" onChange={() => { }} />
        );
        const input = screen.getByLabelText(/test/i);
        const styles = window.getComputedStyle(input);

        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('should handle disabled state properly', () => {
        render(<Input id="test" label="Test" value="" onChange={() => { }} disabled />);
        const input = screen.getByLabelText(/test/i);

        expect(input).toBeDisabled();
    });

    it('should not have violations with error state', async () => {
        const { container } = render(
            <Input
                id="test"
                label="Test"
                value=""
                onChange={() => { }}
                error="This field is required"
            />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
