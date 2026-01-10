import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Modal } from './Modal';


describe('Modal Accessibility Tests', () => {
    it('should not have accessibility violations', async () => {
        const { container } = render(
            <Modal isOpen={true} onClose={() => { }} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
        render(
            <Modal isOpen={true} onClose={() => { }} title="Test Modal">
                <p>Content</p>
            </Modal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have accessible title', () => {
        render(
            <Modal isOpen={true} onClose={() => { }} title="Important Dialog">
                <p>Content</p>
            </Modal>
        );

        const title = screen.getByText(/important dialog/i);
        expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('should close on Escape key', async () => {
        const user = userEvent.setup();
        const handleClose = jest.fn();

        render(
            <Modal isOpen={true} onClose={handleClose} title="Test">
                <p>Content</p>
            </Modal>
        );

        await user.keyboard('{Escape}');
        expect(handleClose).toHaveBeenCalled();
    });

    it('should have accessible close button', () => {
        render(
            <Modal isOpen={true} onClose={() => { }} title="Test">
                <p>Content</p>
            </Modal>
        );

        const closeButton = screen.getByRole('button', { name: /fermer/i });
        expect(closeButton).toBeInTheDocument();
    });

    it('should trap focus within modal', async () => {
        const user = userEvent.setup();

        render(
            <Modal isOpen={true} onClose={() => { }} title="Test">
                <button>First</button>
                <button>Second</button>
                <button>Third</button>
            </Modal>
        );

        const closeButton = screen.getByRole('button', { name: /fermer/i });
        const firstButton = screen.getByText('First');
        const thirdButton = screen.getByText('Third');

        // Initial focus is on container, so Tab moves to first focusable: Close Button
        await user.tab();
        expect(closeButton).toHaveFocus();

        // Tab -> First Content Button
        await user.tab();
        expect(firstButton).toHaveFocus();

        // Tab -> Second
        await user.tab();

        // Tab -> Third
        await user.tab();
        expect(thirdButton).toHaveFocus();

        // Tab -> Wraps to Close Button
        await user.tab();
        expect(closeButton).toHaveFocus();

        // Shift+Tab -> Wraps back to Third
        await user.tab({ shift: true });
        expect(thirdButton).toHaveFocus();
    });

    it('should not render when closed', () => {
        const { container } = render(
            <Modal isOpen={false} onClose={() => { }} title="Test">
                <p>Content</p>
            </Modal>
        );

        expect(container).toBeEmptyDOMElement();
    });
});
