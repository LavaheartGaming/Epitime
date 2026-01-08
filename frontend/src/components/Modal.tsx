import React, { useEffect, useRef } from 'react';
import './Modal.css';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Save currently focused element
            previousActiveElement.current = document.activeElement as HTMLElement;

            // Focus modal
            modalRef.current?.focus();

            // Trap focus in modal
            const handleTabKey = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    const focusableElements = modalRef.current?.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    if (!focusableElements || focusableElements.length === 0) return;

                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleTabKey);

            return () => {
                document.removeEventListener('keydown', handleTabKey);
                // Restore focus
                previousActiveElement.current?.focus();
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (closeOnEscape) {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && isOpen) {
                    onClose();
                }
            };

            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose, closeOnEscape]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className="modal-content"
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="modal-close"
                        aria-label="Fermer la boîte de dialogue"
                    >
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};
