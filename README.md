# LucidAuth

LucidAuth is a **TypeScript-first, server-side authentication library**. Currently, it supports Google OAuth and Email/Password authentication for Next.js.

## Status

> **⚠️ Active Development**
>
> This library is in active development. While the core logic is stable, public APIs are subject to change before the v1.0 release.

## Session Strategy

LucidAuth uses a stateless session strategy. Session data is encrypted as a JWE (JSON Web Encryption) and stored in HTTP-only cookies (which can’t be accessed by client-side JavaScript).

## Installation

Run the following command to install `lucidauth`:

```bash
npm install lucidauth
```

## Next.js Integration Guide

Follow the steps below to integrate Google OAuth and Email/Password authentication in your Next.js app.

### Setting Up Environment Variables

Create a `.env.local` file at the root of your project and add the following environment variables.

```bash
# The base URL of your application
BASE_URL="http://localhost:3000"

# A 32-byte random string encoded in Base64, used to sign and encrypt session tokens
SESSION_SECRET="generated-secret-here"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

You can generate a secure `SESSION_SECRET` by running the following command in your terminal:

```bash
openssl rand -base64 32
```

> **⚠️ Important:** When configuring your OAuth Client in the Google Cloud Console, you **must** set the **Authorized Redirect URI** to:
> `http://localhost:3000/api/auth/callback/google`
>
> LucidAuth internally expects this exact URI to verify and process the authorization code sent from the Google authorization server.

### Creating an Auth Configuration File

Create a file named `auth.ts` at your project root and add the following code:

```ts
// auth.ts

import { lucidAuth } from 'lucidauth/next-js';
import { Google } from 'lucidauth/providers/google';
import { Credential } from 'lucidauth/providers/credential';

import {
  createGoogleUser,
  createCredentialUser,
  getCredentialUser,
  checkCredentialUserExists,
  sendVerificationEmail,
  sendPasswordResetEmail,
  updatePassword,
  sendPasswordUpdateEmail,
} from '@/lib/auth/callbacks';

export const {
  signIn,
  signUp,
  signOut,
  getUserSession,
  forgotPassword,
  resetPassword,
  extendUserSessionMiddleware,
  handler,
} = lucidAuth({
  baseUrl: process.env.BASE_URL!,
  session: {
    secret: process.env.SESSION_SECRET!,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: 'select_account',
      onAuthentication: {
        createGoogleUser,
        // Customize these paths based on your app's routes
        redirects: {
          error: '/sign-in/error',
        },
      },
    }),
    Credential({
      onSignUp: {
        checkCredentialUserExists,
        sendVerificationEmail,
        createCredentialUser,
        // Customize these paths based on your app's routes
        redirects: {
          signUpSuccess: '/signup/check-email',
          emailVerificationSuccess: '/signup/success',
          emailVerificationError: '/signup/error',
        },
      },
      onSignIn: {
        getCredentialUser,
      },
      onPasswordReset: {
        checkCredentialUserExists,
        sendPasswordResetEmail,
        updatePassword,
        sendPasswordUpdateEmail,
        // Customize these paths based on your app's routes
        redirects: {
          forgotPasswordSuccess: '/forgot-password/check-email',
          tokenVerificationSuccess: '/reset-password',
          tokenVerificationError: '/forgot-password/error',
          resetPasswordSuccess: '/reset-password/success',
        },
      },
    }),
  ],
});
```

> **📝 Note:** All configuration properties are fully typed and documented with JSDoc. Hover over any property name to see a detailed explanation. For callback functions, you'll find information about the parameters LucidAuth provides and the values you must return.

To keep your auth configuration file uncluttered, define the callback functions in a separate file. For example, create `lib/auth/callbacks.ts`:

```ts
// lib/auth/callbacks.ts

import type { User, GoogleUserClaims } from 'lucidauth';

export async function checkCredentialUserExists({
  email,
}: {
  email: string;
}): Promise<{ exists: boolean }> {
  // Query your database to check if a user with this email
  // already has a credential-based account.
}

export async function sendVerificationEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}): Promise<void> {
  // Use your email service to send the email verification link.
}

export async function createCredentialUser({
  email,
  hashedPassword,
}: {
  email: string;
  hashedPassword: string;
}): Promise<void> {
  // Create the user and their credential account in your database.
}

export async function getCredentialUser({
  email,
}: {
  email: string;
}): Promise<(User & { hashedPassword: string }) | null> {
  // Query your database for the user and return their details.
  // Return null if the user is not found.
}

export async function createGoogleUser(
  userClaims: GoogleUserClaims,
): Promise<User> {
  // Find or create a user in your database using the claims from Google.
  // Return the user object to be stored in the session.
}

export async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}): Promise<void> {
  // Use your email service to send the password reset link.
}

export async function updatePassword({
  email,
  hashedPassword,
}: {
  email: string;
  hashedPassword: string;
}): Promise<void> {
  // Update the user's password in your database.
}

export async function sendPasswordUpdateEmail({
  email,
}: {
  email: string;
}): Promise<void> {
  // Use your email service to send a confirmation
  // that the password was changed.
}
```
