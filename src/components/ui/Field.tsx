import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

const fieldBase =
  'w-full rounded-field border bg-paper px-4 text-base text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-terra focus:ring-1 focus:ring-terra disabled:opacity-60';

export function fieldClasses(invalid?: boolean, extra = '') {
  return `${fieldBase} ${invalid ? 'border-terra' : 'border-divider'} ${extra}`;
}

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Rótulo + controle + ajuda/erro, no padrão do handoff (rótulo muted 14 px acima do campo). */
export function Field({ label, htmlFor, hint, error, aside, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      {(label || aside) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-sm font-semibold text-muted">
              {label}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-terra-text">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, className = '', ...rest },
  ref,
) {
  if (leading) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">{leading}</span>
        <input ref={ref} aria-invalid={invalid || undefined} className={fieldClasses(invalid, `h-12 pl-11 ${className}`)} {...rest} />
      </div>
    );
  }
  return <input ref={ref} aria-invalid={invalid || undefined} className={fieldClasses(invalid, `h-12 ${className}`)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className = '', rows = 3, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={fieldClasses(invalid, `resize-none py-3 ${className}`)} {...rest} />;
  },
);

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(function PasswordInput(
  { invalid, className = '', ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        className={fieldClasses(invalid, `h-12 pr-24 ${className}`)}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full px-3 text-sm font-semibold text-terra-text hover:bg-sand/70"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  );
});

export function useFieldId(prefix: string) {
  return `${prefix}-${useId()}`;
}
