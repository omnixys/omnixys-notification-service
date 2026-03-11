export interface MagicLinkVariables {
  firstName: string;
  actionUrl: string;
  expiresInMinutes: number;
  ipAddress?: string;
  device?: string;
}
