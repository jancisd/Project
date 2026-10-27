import assert from 'node:assert/strict';
import { parseNativeAuthLink } from '../src/native-auth-links.ts';

const tokens =
  'access_token=header.payload.signature&refresh_token=fixture-refresh';
assert.deepEqual(parseNativeAuthLink(`airstethics://auth#${tokens}`), {
  accessToken: 'header.payload.signature',
  refreshToken: 'fixture-refresh',
  recovery: false,
});
assert.deepEqual(
  parseNativeAuthLink(
    `airstethics://auth/?account=recovery#${tokens}&type=recovery`,
  ),
  {
    accessToken: 'header.payload.signature',
    refreshToken: 'fixture-refresh',
    recovery: true,
  },
);
assert.equal(
  parseNativeAuthLink(`airstethics://auth?account=recovery#${tokens}`)
    ?.recovery,
  false,
  'a query flag alone cannot identify recovery',
);

for (const value of [
  '/auth',
  `https://airsthetic.netlify.app/#${tokens}`,
  `otherapp://auth#${tokens}`,
  `airstethics://somewhere#${tokens}`,
  `airstethics://auth.evil.example/#${tokens}`,
  `airstethics://someone@auth/#${tokens}`,
  `airstethics://auth:123/#${tokens}`,
  `airstethics://auth/wrong/path#${tokens}`,
  'airstethics://auth?account=recovery',
  'airstethics://auth#access_token=header.payload.signature',
  'airstethics://auth#refresh_token=fixture-refresh',
  'airstethics://auth#access_token=invalid&refresh_token=fixture-refresh',
  `airstethics://auth#${tokens}&error=access_denied`,
  `airstethics://auth?error_code=expired#${tokens}`,
  `airstethics://auth#${tokens}&access_token=other.payload.signature`,
  `airstethics://auth#${tokens}&refresh_token=another-refresh`,
  `airstethics://auth#${tokens}&type=recovery&type=signup`,
  `airstethics://auth#access_token=header.payload.signature&refresh_token=bad%20token`,
])
  assert.equal(
    parseNativeAuthLink(value),
    null,
    'reject malformed/untrusted callback',
  );

console.log(
  'Native callback parsing checks passed; no account/network requests made.',
);
