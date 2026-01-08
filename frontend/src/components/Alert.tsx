import React from 'react';
import './Alert.css';

export interface AlertProps {
    type?: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

export const Alert: React.FC<AlertProps> = ({
    type = 'info',
    title,
    children,
    onClose,
    className = '',
}) => {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    const ariaLabels = {
        success: 'Succès',
        error: 'Erreur',
        warning: 'Avertissement',
        info: 'Information',
    };

    return (
        <div
            className={`alert alert-${type} ${className}`}
            role="alert"
            aria-live="polite"
            aria-label={ariaLabels[type]}
        >
            <div className="alert-icon" aria-hidden="true">
                {icons[type]}
            </div>

            <div className="alert-content">
                {title && <div className="alert-title">{title}</div>}
                <div className="alert-message">{children}</div>
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="alert-close"
                    aria-label="Fermer l'alerte"
                >
                    ✕
                </button>
            )}
        </div>
    );
};
