export const ValkeyKey = {
  signupVerificationAuth: (uuid: string) => `verification:signup:auth:${uuid}`,
  signupVerificationUser: (uuid: string) => `verification:signup:user:${uuid}`,
  signupVerificationAddress: (uuid: string) =>
    `verification:signup:address:${uuid}`,
  lock: (key: string) => `lock:${key}`,

  mfaChallenge: (uuid: string) => `verification:mfa:${uuid}`,
} as const;
