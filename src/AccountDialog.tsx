import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, LogOut, Mail, UserRound, X } from 'lucide-react';
import './account.css';

type Props = {
  email?: string;
  onClose: () => void;
  onSendLink: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export default function AccountDialog({
  email,
  onClose,
  onSendLink,
  onSignOut,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const emailId = useId();
  const [address, setAddress] = useState('');
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);

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
      await onSendLink(submittedAddress);
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
          {email ? 'Your account.' : 'Make yourself at home.'}
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
        <div className="account-sent" role="status">
          <span className="account-mail-icon" aria-hidden="true">
            <Mail size={26} />
          </span>
          <h3>Check your email.</h3>
          <p>
            We sent a sign-in link to <strong>{sentTo}</strong>. Open it in this
            browser to finish signing in.
          </p>
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
        <form className="account-form" onSubmit={sendLink}>
          <p className="dialog-intro">
            Sign in to save your places and appointments across devices.
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
            {pending ? 'Sending your link…' : 'Send sign-in link'}
            <ArrowRight size={17} />
          </button>
          <p className="account-note">
            We’ll email you a secure sign-in link. No password to remember.
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
