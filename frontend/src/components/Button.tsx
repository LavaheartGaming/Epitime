import React from 'react';
import './Button.css';

export interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    className = '',
}) => {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`btn btn-${variant} btn-${size} ${className}`}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-disabled={isDisabled}
            aria-busy={loading}
            style={{ minHeight: '44px' }}
        >
            {loading && (
                <span className="btn-spinner" aria-hidden="true">
                    ⏳
                </span>
            )}
            <span className={loading ? 'btn-content-loading' : ''}>
                {children}
            </span>
        </button>
    );
};
