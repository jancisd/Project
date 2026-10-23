import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, LogOut, Mail, UserRound, X } from 'lucide-react';
import './account.css';

export type AccountMode = 'login' | 'signup';

type Props = {
  email?: string;
  initialMode?: AccountMode;
  onClose: () => void;
  onSendLink: (email: string, mode: AccountMode) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export default function AccountDialog({
  email,
  initialMode = 'login',
  onClose,
  onSendLink,
  onSignOut,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const emailId = useId();
  const modeId = useId();
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [address, setAddress] = useState('');
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);

  function chooseMode(nextMode: AccountMode) {
    if (pending || nextMode === mode) return;
    setMode(nextMode);
    setSentTo('');
    setError('');
  }

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      dialogRef.current?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    const submittedAddress = address.trim();
    try {
      await onSendLink(submittedAddress, mode);
      if (mounted.current) setSentTo(submittedAddress);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t send your sign-in link. Please try again.',
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onSignOut();
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t sign you out. Please try again.',
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="small-dialog account-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>
          {email
            ? 'Your account.'
            : mode === 'login'
              ? 'Welcome back.'
              : 'Make yourself at home.'}
        </h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close account"
        >
          <X size={21} />
        </button>
      </div>
      {!email && (
        <div
          className="account-tabs"
          role="tablist"
          aria-label="Account access"
        >
          {(['login', 'signup'] as const).map((item, index) => (
            <button
              key={item}
              id={`${modeId}-${item}`}
              type="button"
              role="tab"
              aria-selected={mode === item}
              aria-controls={`${modeId}-panel`}
              tabIndex={mode === item ? 0 : -1}
              disabled={pending}
              onClick={() => chooseMode(item)}
              onKeyDown={(event) => {
                if (pending) return;
                const next =
                  event.key === 'Home'
                    ? 'login'
                    : event.key === 'End'
                      ? 'signup'
                      : ['ArrowLeft', 'ArrowRight'].includes(event.key)
                        ? index === 0
                          ? 'signup'
                          : 'login'
                        : null;
                if (!next) return;
                event.preventDefault();
                chooseMode(next);
                document.getElementById(`${modeId}-${next}`)?.focus();
              }}
            >
              {item === 'login' ? 'Log in' : 'Create account'}
            </button>
          ))}
        </div>
      )}
      {email ? (
        <div className="account-details">
          <p className="dialog-intro">You’re signed in to airstethics.</p>
          <p className="account-email">
            <UserRound size={18} />
            <span>{email}</span>
          </p>
          <p className="account-note">
            Your saved places and appointments are connected to this account.
          </p>
          <button
            type="button"
            className="primary-button account-submit"
            onClick={signOut}
            disabled={pending}
          >
            {pending ? 'Signing out…' : 'Sign out'}
            <LogOut size={16} />
          </button>
        </div>
      ) : sentTo ? (
        <div
          className="account-sent"
          id={`${modeId}-panel`}
          role="tabpanel"
          aria-labelledby={`${modeId}-${mode}`}
        >
          <span className="account-mail-icon" aria-hidden="true">
            <Mail size={26} />
          </span>
          <div role="status">
            <h3>Check your email.</h3>
            <p>
              {mode === 'login'
                ? 'We sent a login link to '
                : 'We sent an account link to '}
              <strong>{sentTo}</strong>. Open it in this browser to{' '}
              {mode === 'login'
                ? 'log in to your existing account.'
                : 'finish joining airstethics.'}
            </p>
          </div>
          <p className="account-note">
            Can’t find it? Check your spam folder, or try again in a minute.
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSentTo('');
              setError('');
            }}
          >
            Use another email or resend
          </button>
        </div>
      ) : (
        <form
          className="account-form"
          id={`${modeId}-panel`}
          role="tabpanel"
          aria-labelledby={`${modeId}-${mode}`}
          onSubmit={sendLink}
        >
          <p className="dialog-intro">
            {mode === 'login'
              ? 'Log in to your existing account to find your saved places and appointments.'
              : 'Create an account to save your places and appointments across devices.'}
          </p>
          <label htmlFor={emailId}>Email address</label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="you@example.com"
            disabled={pending}
          />
          <button
            type="submit"
            className="primary-button account-submit"
            disabled={pending}
          >
            {pending
              ? 'Sending your link…'
              : mode === 'login'
                ? 'Send login link'
                : 'Send sign-up link'}
            <ArrowRight size={17} />
          </button>
          <p className="account-note">
            {mode === 'login'
              ? 'Use the email you registered with. We’ll send a secure link to log in.'
              : 'We’ll email you a secure link to create your account. No password to remember.'}
          </p>
        </form>
      )}
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
