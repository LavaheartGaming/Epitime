import React from 'react';
import './Input.css';

export interface InputProps {
    id: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    helpText?: string;
    autoComplete?: string;
    className?: string;
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
                className={`input ${hasError ? 'input-error' : ''}`}
            />

            {hasError && (
                <p id={errorId} className="error-message" role="alert" aria-live="polite">
                    {error}
                </p>
            )}
        </div>
    );
};
