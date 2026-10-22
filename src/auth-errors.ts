type SignInFailure = { code?: string; status?: number; message?: string };

// Use fixed messages instead of displaying provider responses, which may
// contain account details. These failures need different next steps.
export function getSignInErrorMessage(error: SignInFailure): string {
  const code = error.code;
  if (
    code === 'email_address_not_authorized' ||
    /email address not authorized|only.*(?:authorized|organisation|organization|team).*email|email.*(?:authorized|organisation|organization|team).*only/i.test(
      error.message ?? '',
    )
  )
    return 'Sign-in emails are currently limited to approved accounts. Please contact the site owner to enable email delivery.';
  if (
    error.status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  )
    return 'Too many sign-in emails have been requested. Please wait before trying again.';
  if (
    code === 'email_provider_disabled' ||
    code === 'otp_disabled' ||
    code === 'signup_disabled'
  )
    return 'Email sign-in isn’t enabled yet. Please contact the site owner.';
  if (code === 'email_address_invalid' || code === 'validation_failed')
    return 'Please enter a valid email address.';
  if (
    error.status === 401 ||
    error.status === 404 ||
    code === 'invalid_api_key' ||
    code === 'missing_api_key' ||
    /invalid api key|no api key found/i.test(error.message ?? '')
  )
    return 'Sign-in is unavailable because the site’s connection settings need to be updated. Please contact the site owner.';
  if (error.status === 0 || code === 'request_timeout')
    return 'We couldn’t reach the sign-in service. Check your connection and try again.';
  if (error.status && error.status >= 500)
    return 'The email service couldn’t send your sign-in link. Please try again later or contact the site owner.';
  return 'We couldn’t send the sign-in link. Please check the email and try again shortly.';
}
