'use client';

import { useId, useState } from 'react';

type Props = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  placeholder?: string;
  autoFocus?: boolean;
  optional?: boolean;
  aside?: React.ReactNode; // odkaz vpravo na riadku popisu (napr. „Zabudnuté heslo?“)
};

export function Field({ label, name, type = 'text', defaultValue, error, hint, optional, aside, ...rest }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <div className="field__top">
        <label htmlFor={id}>
          {label}
          {optional ? <span className="field__opt"> (nepovinné)</span> : null}
        </label>
        {aside}
      </div>
      <div className="field__box">
        <input
          id={id}
          name={name}
          type={isPassword && show ? 'text' : type}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword ? (
          <button type="button" className="field__toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Skryť heslo' : 'Zobraziť heslo'}>
            {show ? 'Skryť' : 'Zobraziť'}
          </button>
        ) : null}
      </div>
      {hint ? (
        <small id={`${id}-hint`} className="field__hint">
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={`${id}-err`} className="field__err">
          {error}
        </small>
      ) : null}
    </div>
  );
}

export function Check({ name, children, defaultChecked, error }: { name: string; children: React.ReactNode; defaultChecked?: boolean; error?: string }) {
  const id = useId();
  return (
    <div className={`check${error ? ' check--error' : ''}`}>
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
      <label htmlFor={id}>{children}</label>
      {error ? (
        <small id={`${id}-err`} className="field__err">
          {error}
        </small>
      ) : null}
    </div>
  );
}
