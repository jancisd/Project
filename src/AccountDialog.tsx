import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import type {
  AccountSecurity,
  AuthenticatorEnrollment,
} from './account-service';
import './account.css';

export type AccountMode = 'login' | 'signup';

type Props = {
  email?: string;
  initialMode?: AccountMode;
  recovery?: boolean;
  security?: AccountSecurity | null;
  securityLoading?: boolean;
  securityError?: string;
  onClose: () => void;
  onSendLink: (email: string, mode: AccountMode) => Promise<void>;
  onPasswordLogin: (email: string, password: string) => Promise<void>;
  onPasswordSignup: (
    email: string,
    password: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  onRequestReset: (email: string) => Promise<void>;
  onSetPassword: (password: string) => Promise<void>;
  onRecoveryDone: () => void;
  onSignOut: () => Promise<void>;
  onRetrySecurity: () => void;
  onEnroll: () => Promise<AuthenticatorEnrollment>;
  onVerify: (factorId: string, code: string) => Promise<void>;
  onRemove: (factorId: string) => Promise<void>;
};

type Method = 'password' | 'link' | 'reset';
type SentNotice = { kind: 'link' | 'signup' | 'reset'; address: string };

export default function AccountDialog({
  email,
  initialMode = 'login',
  recovery = false,
  security,
  securityLoading = false,
  securityError,
  onClose,
  onSendLink,
  onPasswordLogin,
  onPasswordSignup,
  onRequestReset,
  onSetPassword,
  onRecoveryDone,
  onSignOut,
  onRetrySecurity,
  onEnroll,
  onVerify,
  onRemove,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const codeId = useId();
  const factorId = useId();
  const modeId = useId();
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [method, setMethod] = useState<Method>('password');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<SentNotice | null>(null);
  const [error, setError] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [enrollment, setEnrollment] = useState<AuthenticatorEnrollment | null>(
    null,
  );
  const [code, setCode] = useState('');
  const [selectedFactor, setSelectedFactor] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');
  const mounted = useRef(true);
  const working = useRef(false);
  const needsChallenge = Boolean(email && security?.needsChallenge);
  const checkingSecurity = Boolean(email && (!security || securityLoading));
  const activeFactor =
    security?.factors.find((factor) => factor.id === selectedFactor)?.id ??
    security?.factors[0]?.id;

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    setPassword('');
    setConfirmation('');
    setCode('');
    setEnrollment(null);
    setSelectedFactor('');
    setEditingPassword(false);
    setPasswordSaved(false);
    setSecurityNotice('');
    setError('');
  }, [email]);

  async function perform(action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t complete that request. Please try again.',
        );
    } finally {
      working.current = false;
      if (mounted.current) setPending(false);
    }
  }

  function clearPasswords() {
    setPassword('');
    setConfirmation('');
  }

  function chooseMode(nextMode: AccountMode) {
    if (pending || nextMode === mode) return;
    setMode(nextMode);
    setMethod('password');
    setSent(null);
    setError('');
    clearPasswords();
  }

  function chooseMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setSent(null);
    setError('');
    clearPasswords();
  }

  function close() {
    if (working.current) return;
    if (!enrollment) return onClose();
    void perform(async () => {
      await onRemove(enrollment.id);
      if (!mounted.current) return;
      setEnrollment(null);
      setCode('');
      onClose();
    });
  }

  function signOut() {
    void perform(async () => {
      if (enrollment) await onRemove(enrollment.id);
      await onSignOut();
      if (mounted.current) onClose();
    });
  }

  function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      mode === 'signup' &&
      method === 'password' &&
      password !== confirmation
    ) {
      setError('Your passwords don’t match. Please enter them again.');
      return;
    }
    const submittedAddress = address.trim();
    void perform(async () => {
      if (method === 'reset') {
        await onRequestReset(submittedAddress);
        if (mounted.current)
          setSent({ kind: 'reset', address: submittedAddress });
      } else if (method === 'link') {
        await onSendLink(submittedAddress, mode);
        if (mounted.current)
          setSent({ kind: 'link', address: submittedAddress });
      } else if (mode === 'login') {
        await onPasswordLogin(submittedAddress, password);
        if (mounted.current) clearPasswords();
      } else {
        const result = await onPasswordSignup(submittedAddress, password);
        if (!mounted.current) return;
        clearPasswords();
        if (result.needsConfirmation)
          setSent({ kind: 'signup', address: submittedAddress });
      }
    });
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError('Your passwords don’t match. Please enter them again.');
      return;
    }
    void perform(async () => {
      await onSetPassword(password);
      if (!mounted.current) return;
      clearPasswords();
      setPasswordSaved(true);
      if (recovery) {
        setEditingPassword(true);
        onRecoveryDone();
      }
    });
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const verificationFactor = enrollment?.id ?? activeFactor;
    if (!verificationFactor) {
      setError(
        'We couldn’t find your authenticator. Please reload account security.',
      );
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }
    void perform(async () => {
      try {
        await onVerify(verificationFactor, code);
        if (!mounted.current) return;
        if (enrollment) setSecurityNotice('Authenticator enabled.');
        setEnrollment(null);
      } finally {
        if (mounted.current) setCode('');
      }
    });
  }

  function startEnrollment() {
    setSecurityNotice('');
    void perform(async () => {
      const result = await onEnroll();
      if (!mounted.current) {
        void onRemove(result.id).catch(() => {});
        return;
      }
      setCode('');
      setEnrollment(result);
    });
  }

  function cancelEnrollment() {
    if (!enrollment) return;
    void perform(async () => {
      await onRemove(enrollment.id);
      if (!mounted.current) return;
      setEnrollment(null);
      setCode('');
    });
  }

  function removeFactor(id: string) {
    void perform(async () => {
      await onRemove(id);
      if (mounted.current) setSecurityNotice('Authenticator disabled.');
    });
  }

  function passwordFields(confirm: boolean) {
    return (
      <>
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          type="password"
          autoComplete={confirm ? 'new-password' : 'current-password'}
          required
          minLength={confirm ? 8 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
          aria-describedby={confirm ? `${passwordId}-hint` : undefined}
        />
        {confirm && (
          <>
            <p className="account-note" id={`${passwordId}-hint`}>
              Use at least 8 characters.
            </p>
            <label htmlFor={confirmId}>Confirm password</label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
            />
          </>
        )}
      </>
    );
  }

  function codeFields() {
    return (
      <>
        <label htmlFor={codeId}>Authenticator code</label>
        <input
          id={codeId}
          className="account-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          disabled={pending}
          placeholder="000000"
        />
        <button
          type="submit"
          className="primary-button account-submit"
          disabled={pending || (!enrollment && !activeFactor)}
        >
          {pending ? 'Verifying…' : 'Verify code'}
          <ShieldCheck size={17} />
        </button>
      </>
    );
  }

  function securityStatus() {
    return (
      <div className="account-security-status">
        <p className="account-note" role={securityError ? 'alert' : 'status'}>
          {securityError || 'Checking account security…'}
        </p>
        {securityError && (
          <button
            type="button"
            className="text-button"
            onClick={onRetrySecurity}
            disabled={pending || securityLoading}
          >
            Retry account security
          </button>
        )}
      </div>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="small-dialog account-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>
          {needsChallenge
            ? 'Verify it’s you.'
            : recovery || editingPassword
              ? 'Choose your password.'
              : email
                ? 'Your account.'
                : method === 'reset'
                  ? 'Reset your password.'
                  : mode === 'login'
                    ? 'Welcome back.'
                    : 'Make yourself at home.'}
        </h2>
        <button
          type="button"
          className="icon-button"
          onClick={close}
          aria-label="Close account"
          disabled={pending}
        >
          <X size={21} />
        </button>
      </div>
      {!email && !recovery && (
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
      {needsChallenge ? (
        <form className="account-form" onSubmit={verifyCode}>
          <p className="dialog-intro">
            Enter the code from your authenticator app to finish logging in.
          </p>
          <p className="account-email">
            <UserRound size={18} aria-hidden="true" />
            <span>{email}</span>
          </p>
          {security && security.factors.length > 1 && (
            <>
              <label htmlFor={factorId}>Authenticator</label>
              <select
                id={factorId}
                value={activeFactor}
                disabled={pending}
                onChange={(event) => {
                  setSelectedFactor(event.target.value);
                  setCode('');
                  setError('');
                }}
              >
                {security.factors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {codeFields()}
          {securityError && securityStatus()}
          <button
            type="button"
            className="text-button account-secondary"
            onClick={signOut}
            disabled={pending}
          >
            Sign out
          </button>
        </form>
      ) : recovery || (email && editingPassword) ? (
        !email || checkingSecurity || securityError ? (
          <div className="account-details">
            {!email ? (
              <p className="account-note" role="status">
                Open the reset link from your email to choose a new password.
              </p>
            ) : (
              securityStatus()
            )}
          </div>
        ) : passwordSaved ? (
          <div className="account-sent">
            <div role="status">
              <h3>Password saved.</h3>
              <p>You can now log in with your email and password.</p>
            </div>
            <button
              type="button"
              className="primary-button account-submit"
              onClick={() => {
                if (recovery) onRecoveryDone();
                else {
                  setEditingPassword(false);
                  setPasswordSaved(false);
                }
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="account-form" onSubmit={savePassword}>
            <p className="dialog-intro">
              {recovery
                ? 'Choose a new password for your account.'
                : 'Add a password or replace your current one. Your account and saved places stay together.'}
            </p>
            <p className="account-email">
              <UserRound size={18} aria-hidden="true" />
              <span>{email}</span>
            </p>
            {passwordFields(true)}
            <button
              type="submit"
              className="primary-button account-submit"
              disabled={pending}
            >
              {pending ? 'Saving…' : 'Save password'}
              <ArrowRight size={17} />
            </button>
            {!recovery && (
              <button
                type="button"
                className="text-button account-secondary"
                disabled={pending}
                onClick={() => {
                  setEditingPassword(false);
                  clearPasswords();
                  setError('');
                }}
              >
                Back to account
              </button>
            )}
          </form>
        )
      ) : email ? (
        <div className="account-details">
          <p className="dialog-intro">You’re signed in to airstethics.</p>
          <p className="account-email">
            <UserRound size={18} aria-hidden="true" />
            <span>{email}</span>
          </p>
          <p className="account-note">
            Your saved places and appointments are connected to this account.
          </p>
          <button
            type="button"
            className="account-outline-button"
            disabled={
              pending ||
              checkingSecurity ||
              Boolean(securityError) ||
              Boolean(enrollment)
            }
            onClick={() => {
              setEditingPassword(true);
              setPasswordSaved(false);
              setSecurityNotice('');
              setError('');
            }}
          >
            Set or change password
          </button>
          <section
            className="account-security"
            aria-labelledby={`${modeId}-security`}
          >
            <h3 id={`${modeId}-security`}>
              <ShieldCheck size={18} aria-hidden="true" />
              Account security
            </h3>
            {checkingSecurity || securityError ? (
              securityStatus()
            ) : enrollment ? (
              <form className="account-form" onSubmit={verifyCode}>
                <h4>Set up your authenticator.</h4>
                <p className="account-note">
                  Scan this QR code in an app such as Google Authenticator,
                  Microsoft Authenticator, or 1Password. Then enter its
                  six-digit code.
                </p>
                <p className="account-note">
                  Keep a secure backup in your authenticator app. You’ll need
                  access to it when you log in.
                </p>
                <img
                  className="account-qr"
                  width={210}
                  height={210}
                  src={
                    enrollment.qrCode.startsWith('data:image/svg+xml')
                      ? enrollment.qrCode
                      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`
                  }
                  alt="Scan to add airstethics to your authenticator app"
                />
                <details className="account-setup-key">
                  <summary>Enter setup key manually</summary>
                  <code aria-label="Authenticator setup key">
                    {enrollment.secret}
                  </code>
                </details>
                {codeFields()}
                <button
                  type="button"
                  className="text-button account-secondary"
                  onClick={cancelEnrollment}
                  disabled={pending}
                >
                  Cancel setup
                </button>
              </form>
            ) : (
              <>
                <p className="account-note">
                  Add an optional code from an authenticator app when you log
                  in. No extra sign-in emails needed.
                </p>
                {securityNotice && (
                  <p className="account-success" role="status">
                    {securityNotice}
                  </p>
                )}
                {security && security.factors.length > 0 ? (
                  <>
                    {!securityNotice && (
                      <p className="account-success">Authenticator enabled.</p>
                    )}
                    {security.factors.map((factor) => (
                      <div className="account-factor" key={factor.id}>
                        <span>{factor.name}</span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => removeFactor(factor.id)}
                          disabled={pending || security.currentLevel !== 'aal2'}
                        >
                          Disable authenticator
                        </button>
                      </div>
                    ))}
                    {security.currentLevel !== 'aal2' && (
                      <p className="account-note">
                        Verify your authenticator code before turning it off.
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="account-outline-button"
                    onClick={startEnrollment}
                    disabled={pending || !security}
                  >
                    Enable authenticator
                  </button>
                )}
              </>
            )}
          </section>
          <button
            type="button"
            className="primary-button account-submit"
            onClick={signOut}
            disabled={pending}
          >
            Sign out
            <LogOut size={16} />
          </button>
        </div>
      ) : sent ? (
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
              {sent.kind === 'reset' ? (
                <>
                  If an account exists for <strong>{sent.address}</strong>,
                  we’ll send a password reset link. Open it in this browser to
                  choose a new password.
                </>
              ) : sent.kind === 'signup' ? (
                <>
                  We sent a confirmation link to <strong>{sent.address}</strong>
                  . Open it to finish creating your account, then log in with
                  your password.
                </>
              ) : (
                <>
                  We sent a login link to <strong>{sent.address}</strong>. Open
                  it in this browser to log in to your existing account.
                </>
              )}
            </p>
          </div>
          <p className="account-note">
            Can’t find it? Check your spam folder, or try again in a minute.
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSent(null);
              setError('');
            }}
          >
            Use another email or resend
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode('login');
              chooseMethod('password');
            }}
          >
            Back to log in
          </button>
        </div>
      ) : (
        <form
          className="account-form"
          id={`${modeId}-panel`}
          role="tabpanel"
          aria-labelledby={`${modeId}-${mode}`}
          onSubmit={submitAccess}
        >
          <p className="dialog-intro">
            {method === 'reset'
              ? 'Enter your account email and we’ll send a link to choose a new password.'
              : method === 'link'
                ? 'Use the email you registered with. We’ll send a secure link to log in.'
                : mode === 'login'
                  ? 'Log in with your email and password to find your saved places and appointments.'
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
          {method === 'password' && passwordFields(mode === 'signup')}
          {mode === 'login' && method === 'password' && (
            <button
              type="button"
              className="text-button account-forgot"
              onClick={() => chooseMethod('reset')}
              disabled={pending}
            >
              Forgot password?
            </button>
          )}
          <button
            type="submit"
            className="primary-button account-submit"
            disabled={pending}
          >
            {pending
              ? method === 'password'
                ? mode === 'signup'
                  ? 'Creating account…'
                  : 'Logging in…'
                : 'Sending your link…'
              : method === 'reset'
                ? 'Send reset link'
                : method === 'link'
                  ? 'Send login link'
                  : mode === 'login'
                    ? 'Log in'
                    : 'Create account'}
            <ArrowRight size={17} />
          </button>
          {mode === 'login' && (
            <button
              type="button"
              className="text-button account-secondary"
              disabled={pending}
              onClick={() =>
                chooseMethod(method === 'password' ? 'link' : 'password')
              }
            >
              {method === 'password'
                ? 'Use an email link instead'
                : method === 'reset'
                  ? 'Back to log in'
                  : 'Use a password instead'}
            </button>
          )}
          {mode === 'signup' && (
            <p className="account-note">
              Already joined with an email link? Choose Log in, use your email
              link, then set a password in your account.
            </p>
          )}
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
