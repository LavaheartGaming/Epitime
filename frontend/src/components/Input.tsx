import React from 'react';
import './Input.css';

export interface InputProps {
    id: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'search';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    helpText?: string;
    autoComplete?: string;
    className?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    helpText,
    autoComplete,
    className = '',
    startIcon,
    endIcon,
}) => {
    const errorId = `${id}-error`;
    const helpId = `${id}-help`;
    const hasError = !!error;

    return (
        <div className={`input-group ${className}`}>
            <label htmlFor={id} className="input-label">
                {label}
                {required && (
                    <span className="input-required" aria-label="requis">
                        {' '}*
                    </span>
                )}
            </label>

            {helpText && (
                <p id={helpId} className="input-help">
                    {helpText}
                </p>
            )}

            <div className="input-wrapper">
                {startIcon && (
                    <div className="input-icon input-icon-start" aria-hidden="true">
                        {startIcon}
                    </div>
                )}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    aria-required={required}
                    aria-invalid={hasError}
                    aria-describedby={
                        `${helpText ? helpId : ''} ${hasError ? errorId : ''}`.trim() || undefined
                    }
                    className={`input ${hasError ? 'input-error' : ''} ${startIcon ? 'input-has-start-icon' : ''} ${endIcon ? 'input-has-end-icon' : ''}`}
                    style={{ minHeight: '44px' }}
                />
                {endIcon && (
                    <div className="input-icon input-icon-end" aria-hidden="true">
                        {endIcon}
                    </div>
                )}
            </div>

            {hasError && (
                <p id={errorId} className="error-message" role="alert" aria-live="polite">
                    {error}
                </p>
            )}
        </div>
    );
};
