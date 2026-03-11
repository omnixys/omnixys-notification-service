export interface PasswordResetVariables {
  firstName: string;
  actionUrl: string;
  expiresInMinutes: number;
  ipAddress?: string;
  device?: string;
  location?: string;
  supportEmail?: string;
}
