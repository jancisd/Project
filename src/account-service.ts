import type { Factor } from '@supabase/supabase-js';
import { backendError, supabase } from './backend';
import { getSignInErrorMessage } from './auth-errors';
import { getAuthRedirectUrl } from './platform';

export const MIN_PASSWORD_LENGTH = 8;

export type AccountSecurityState = {
  currentLevel: 'aal1' | 'aal2' | null;
  factors: { id: string; name: string }[];
  needsChallenge: boolean;
};

export type AccountSecurity = AccountSecurityState;

export type AuthenticatorEnrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

type Operation = 'login' | 'signup' | 'reset' | 'password' | 'security' | 'mfa';
type ProviderFailure = { code?: string; status?: number; message?: string };

// Only these fixed messages cross the service boundary. Provider responses can
// include account details and must never be displayed or logged directly.
class AccountError extends Error {}

const fallbackMessages: Record<Operation, string> = {
  login: 'We couldn’t log you in. Please try again.',
  signup: 'We couldn’t create your account. Please try again.',
  reset: 'We couldn’t send the password reset email. Please try again.',
  password: 'We couldn’t save your password. Please try again.',
  security: 'We couldn’t check your account security. Please try again.',
  mfa: 'We couldn’t update your authenticator. Please try again.',
};

function service() {
  if (!supabase)
    throw new AccountError(
      backendError || 'The account service is not connected.',
    );
  return supabase;
}

function safeFailure(error: unknown, operation: Operation): AccountError {
  if (error instanceof AccountError) return error;
  const failure: ProviderFailure =
    error && typeof error === 'object' ? error : {};
  const { code, status } = failure;
  if (code === 'invalid_credentials')
    return new AccountError(
      'The email or password is incorrect. If you previously used email links, choose Forgot password to set a password.',
    );
  if (code === 'email_not_confirmed')
    return new AccountError(
      'Please confirm your email using the link in your inbox before logging in.',
    );
  if (code === 'weak_password')
    return new AccountError(
      'Please choose a stronger password with at least 8 characters. A longer, unique passphrase works well.',
    );
  if (code === 'same_password')
    return new AccountError('Please choose a different password.');
  if (code === 'email_exists' || code === 'user_already_exists')
    return new AccountError(
      'Please try logging in, or choose Forgot password if you need to set a password.',
    );
  if (
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'user_not_found' ||
    code === 'bad_jwt' ||
    code === 'no_authorization'
  )
    return new AccountError(
      'Your session has expired. Please log in again, or request a new password reset link.',
    );
  if (
    code === 'reauthentication_needed' ||
    code === 'reauthentication_not_valid' ||
    code === 'reauth_nonce_missing'
  )
    return new AccountError(
      'Please log in again before changing your password, or request a new password reset link.',
    );
  if (code === 'insufficient_aal')
    return new AccountError(
      'Please verify a code from your authenticator app to continue.',
    );
  if (
    code === 'mfa_verification_failed' ||
    code === 'mfa_verification_rejected' ||
    code === 'mfa_challenge_expired' ||
    code === 'mfa_ip_address_mismatch'
  )
    return new AccountError(
      'That code couldn’t be verified. Enter the current 6-digit code from your authenticator app and try again.',
    );
  if (code === 'mfa_factor_not_found')
    return new AccountError(
      'That authenticator is no longer available. Please reload your account security settings.',
    );
  if (
    code === 'mfa_totp_enroll_not_enabled' ||
    code === 'mfa_totp_verify_not_enabled'
  )
    return new AccountError(
      'Authenticator apps aren’t enabled yet. Please contact the site owner.',
    );
  if (
    code === 'mfa_factor_name_conflict' ||
    code === 'too_many_enrolled_mfa_factors' ||
    code === 'mfa_verified_factor_exists'
  )
    return new AccountError(
      'An authenticator setup already exists. Cancel any unfinished setup before trying again.',
    );
  if (code === 'email_address_invalid' || code === 'validation_failed')
    return new AccountError(
      operation === 'login' || operation === 'signup' || operation === 'reset'
        ? 'Please enter a valid email address.'
        : fallbackMessages[operation],
    );
  if (
    code === 'invalid_api_key' ||
    code === 'missing_api_key' ||
    /invalid api key|no api key found/i.test(failure.message ?? '')
  )
    return new AccountError(getSignInErrorMessage(failure));
  if (
    (operation === 'signup' || operation === 'reset') &&
    (code === 'email_address_not_authorized' ||
      /email address not authorized|only.*(?:authorized|organisation|organization|team).*email|email.*(?:authorized|organisation|organization|team).*only/i.test(
        failure.message ?? '',
      ))
  )
    return new AccountError(getSignInErrorMessage(failure, 'signup'));
  if (
    code === 'email_provider_disabled' ||
    code === 'provider_disabled' ||
    code === 'signup_disabled'
  )
    return new AccountError(
      'Email and password accounts aren’t enabled yet. Please contact the site owner.',
    );
  if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit'
  )
    return new AccountError(
      'Too many attempts. Please wait a few minutes before trying again.',
    );
  if (status === 0 || code === 'request_timeout' || error instanceof TypeError)
    return new AccountError(
      'We couldn’t reach the account service. Check your connection and try again.',
    );
  return new AccountError(fallbackMessages[operation]);
}

async function run<T>(
  operation: Operation,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw safeFailure(error, operation);
  }
}

function emailAddress(email: string): string {
  const value = email.trim();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new AccountError('Please enter a valid email address.');
  return value;
}

function requireNewPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH || !password.trim())
    throw new AccountError('Please use a password with at least 8 characters.');
}

function redirectUrl(recovery = false): string {
  return getAuthRedirectUrl(recovery);
}

export async function logInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  return run('login', async () => {
    const address = emailAddress(email);
    if (!password) throw new AccountError('Please enter your password.');
    const { data, error } = await service().auth.signInWithPassword({
      email: address,
      password,
    });
    if (error) throw error;
    if (!data.user?.id || !data.session?.access_token)
      throw new AccountError(fallbackMessages.login);
  });
}

export async function createPasswordAccount(
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  return run('signup', async () => {
    const address = emailAddress(email);
    requireNewPassword(password);
    const { data, error } = await service().auth.signUp({
      email: address,
      password,
      options: { emailRedirectTo: redirectUrl() },
    });
    if (error) throw error;
    if (!data.user?.id || (data.session && !data.session.access_token))
      throw new AccountError(fallbackMessages.signup);
    // Supabase may intentionally hide an existing account behind a confirmation
    // response. The caller should show the same inbox guidance in that case.
    return { needsConfirmation: !data.session };
  });
}

export async function sendPasswordReset(email: string): Promise<void> {
  return run('reset', async () => {
    const { error } = await service().auth.resetPasswordForEmail(
      emailAddress(email),
      { redirectTo: redirectUrl(true) },
    );
    if (error) throw error;
  });
}

async function readSecurity(): Promise<{
  state: AccountSecurityState;
  all: Factor[];
}> {
  const client = service();
  // listFactors calls getUser, validating the current account against the server.
  // Session metadata alone can be stale immediately after enrollment/removal.
  const factors = await client.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  if (!factors.data || !Array.isArray(factors.data.all))
    throw new AccountError(fallbackMessages.security);
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  if (
    !assurance.data ||
    ![null, 'aal1', 'aal2'].includes(assurance.data.currentLevel)
  )
    throw new AccountError(fallbackMessages.security);
  const currentLevel = assurance.data.currentLevel as 'aal1' | 'aal2' | null;
  const verified = factors.data.all.filter(
    (factor) => factor.status === 'verified',
  );
  const totp = verified.filter((factor) => factor.factor_type === 'totp');
  const needsChallenge = verified.length > 0 && currentLevel !== 'aal2';
  if (needsChallenge && totp.length === 0)
    throw new AccountError(
      'This account needs a verification method that isn’t available here. Please contact the site owner.',
    );
  return {
    state: {
      currentLevel,
      factors: totp.map((factor) => ({
        id: factor.id,
        name: factor.friendly_name || 'Authenticator app',
      })),
      needsChallenge,
    },
    all: factors.data.all,
  };
}

export async function getAccountSecurity(): Promise<AccountSecurityState> {
  return run('security', async () => (await readSecurity()).state);
}

export async function setAccountPassword(password: string): Promise<void> {
  return run('password', async () => {
    requireNewPassword(password);
    const client = service();
    const { data: account, error: accountError } = await client.auth.getUser();
    if (accountError) throw accountError;
    if (!account.user?.id)
      throw new AccountError(
        'Please log in or open a new password reset link before setting your password.',
      );
    const { state } = await readSecurity();
    if (state.needsChallenge)
      throw new AccountError(
        'Please verify a code from your authenticator app before changing your password.',
      );
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw error;
    if (!data.user?.id || data.user.id !== account.user.id)
      throw new AccountError(fallbackMessages.password);
  });
}

export async function enrollAuthenticator(): Promise<AuthenticatorEnrollment> {
  return run('mfa', async () => {
    const { state, all } = await readSecurity();
    if (state.needsChallenge)
      throw new AccountError(
        'Please verify your existing authenticator before changing security settings.',
      );
    if (state.factors.length)
      throw new AccountError(
        'An authenticator is already enabled for this account.',
      );
    const client = service();
    // A reload can interrupt setup before the first code is verified. Replace
    // only unfinished factors created by this UI, leaving verified factors and
    // any other authenticator registrations untouched.
    for (const unfinished of all.filter(
      (factor) =>
        factor.factor_type === 'totp' &&
        factor.status === 'unverified' &&
        factor.friendly_name === 'Authenticator app',
    )) {
      const removed = await client.auth.mfa.unenroll({
        factorId: unfinished.id,
      });
      if (removed.error) throw removed.error;
      if (removed.data?.id !== unfinished.id)
        throw new AccountError(fallbackMessages.mfa);
    }
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    });
    if (error) throw error;
    if (
      !data?.id ||
      data.type !== 'totp' ||
      !data.totp?.qr_code ||
      !data.totp.secret
    )
      throw new AccountError(fallbackMessages.mfa);
    const svg = data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
    // Supabase's SVG generator includes an XML declaration and a comment.
    if (
      !/^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
        svg,
      )
    )
      throw new AccountError(fallbackMessages.mfa);
    return {
      id: data.id,
      qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      secret: data.totp.secret,
    };
  });
}

export async function verifyAuthenticator(
  factorId: string,
  code: string,
): Promise<void> {
  return run('mfa', async () => {
    const value = code.trim();
    if (!/^\d{6}$/.test(value))
      throw new AccountError(
        'Please enter the 6-digit code from your authenticator app.',
      );
    const { all } = await readSecurity();
    if (
      !all.some(
        (factor) => factor.id === factorId && factor.factor_type === 'totp',
      )
    )
      throw new AccountError(
        'That authenticator is no longer available. Please reload your account security settings.',
      );
    const client = service();
    const challenge = await client.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;
    if (!challenge.data?.id) throw new AccountError(fallbackMessages.mfa);
    const verification = await client.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: value,
    });
    if (verification.error) throw verification.error;
    if (!verification.data?.access_token || !verification.data.user?.id)
      throw new AccountError(fallbackMessages.mfa);
    // verify saves the new session before resolving. Read its assurance locally;
    // a later network failure must not make a verified enrollment look pending.
    // The caller refreshes the factor list separately and keeps private data
    // locked if that refresh fails.
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (assurance.data?.currentLevel !== 'aal2')
      throw new AccountError(
        'We couldn’t confirm your authenticator verification. Please try again.',
      );
  });
}

export async function removeAuthenticator(factorId: string): Promise<void> {
  return run('mfa', async () => {
    const { state, all } = await readSecurity();
    const factor = all.find(
      (candidate) =>
        candidate.id === factorId && candidate.factor_type === 'totp',
    );
    if (!factor)
      throw new AccountError(
        'That authenticator is no longer available. Please reload your account security settings.',
      );
    if (factor.status === 'verified' && state.currentLevel !== 'aal2')
      throw new AccountError(
        'Please verify a code from your authenticator app before turning it off.',
      );
    const { data, error } = await service().auth.mfa.unenroll({ factorId });
    if (error) throw error;
    if (data?.id !== factorId) throw new AccountError(fallbackMessages.mfa);
  });
}
