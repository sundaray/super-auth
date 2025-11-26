export type EmailVerificationToken = string & {
  __brand: EmailVerificationToken;
};

export type EmailVerificationUrl = string & {
  __brand: EmailVerificationUrl;
};

export interface EmailVerificationPayload {
  email: string;
  hashedPassword: string;
  [key: string]: unknown;
}
