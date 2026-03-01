export const ValkeyKey = {
  signupVerificationAuth: (uuid: string) => `verification:signup:auth:${uuid}`,
  signupVerificationUser: (uuid: string) => `verification:signup:user:${uuid}`,
  lock: (key: string) => `lock:${key}`,

  mfaChallenge: (uuid: string) => `verification:mfa:${uuid}`,
} as const;
