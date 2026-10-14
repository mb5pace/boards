import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  confirmationText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmationText,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const canConfirm = !confirmationText || typedValue === confirmationText;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="overlay" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="dialog dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <div className="confirm-dialog__mark" aria-hidden="true">!</div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-body">{body}</p>
        {confirmationText ? (
          <label className="confirm-dialog__input">
            <span>Type <strong>{confirmationText}</strong> to continue</span>
            <input
              autoFocus
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete="off"
            />
          </label>
        ) : null}
        <footer className="dialog__actions dialog__actions--centered">
          <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="button button--danger" type="button" onClick={onConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
