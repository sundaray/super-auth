# LucidAuth

LucidAuth is a **TypeScript-first, server-side authentication library**. Currently, it supports Google OAuth and Email/Password authentication for Next.js.

## Status

> **🚀 v1 Beta**
>
> The core APIs are stable and have been tested in production-like environments. Minor refinements may occur before the official v1 release, but no breaking changes to the main authentication flows are expected.

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

import type {
  CheckCredentialUserExistsParams,
  CreateCredentialUserParams,
  CreateGoogleUserParams,
  GetCredentialUserParams,
  SendPasswordResetEmailParams,
  SendPasswordUpdateEmailParams,
  SendVerificationEmailParams,
  UpdatePasswordParams,
  CheckCredentialUserExistsReturn,
  CreateGoogleUserReturn,
  GetCredentialUserReturn,
} from 'lucidauth/core/types';

export async function checkCredentialUserExists({
  email,
}: CheckCredentialUserExistsParams): Promise<CheckCredentialUserExistsReturn> {
  // Query your database to check if a user with this email
  // already has a credential-based account.
}

export async function sendVerificationEmail({
  email,
  url,
}: SendVerificationEmailParams): Promise<void> {
  // Use your email service to send the email verification link.
}

export async function createCredentialUser({
  email,
  hashedPassword,
}: CreateCredentialUserParams): Promise<void> {
  // Create the user and their credential account in your database.
}

export async function getCredentialUser({
  email,
}: GetCredentialUserParams): Promise<GetCredentialUserReturn> {
  // Query your database for the user and return their details.
  // Return null if the user is not found.
}

export async function createGoogleUser(
  userClaims: CreateGoogleUserParams,
): Promise<CreateGoogleUserReturn> {
  // Find or create a user in your database using the claims from Google.
  // Return the user object to be stored in the session.
}

export async function sendPasswordResetEmail({
  email,
  url,
}: SendPasswordResetEmailParams): Promise<void> {
  // Use your email service to send the password reset link.
}

export async function updatePassword({
  email,
  hashedPassword,
}: UpdatePasswordParams): Promise<void> {
  // Update the user's password in your database.
}

export async function sendPasswordUpdateEmail({
  email,
}: SendPasswordUpdateEmailParams): Promise<void> {
  // Use your email service to send a confirmation
  // that the password was changed.
}
```

### Adding the [...lucidauth] Route Handler

Create a file at `app/api/auth/[...lucidauth]/route.ts` and add the following code:

```ts
import { handler } from '@/auth';

export { handler as GET, handler as POST };
```

> **⚠️ Important:** You must define this file at the exact path: `/app/api/auth/[...lucidauth]/route.ts`. LucidAuth internally relies on this specific route structure to handle OAuth callbacks and generate correct email verification and password reset URLs.

### Creating Server Actions

Inside your `app` directory, create a file named `actions.ts` and add the following Server Actions.

Before we look at the individual actions, note that each action uses a `rethrowIfRedirect` function. LucidAuth internally uses Next.js's `redirect()` function, which throws a `NEXT_REDIRECT` error. You **must** catch and re-throw this error—if you swallow it, the redirect will be canceled.

Create a file at `lib/auth/next-redirect.ts` with the following implementation:

```ts
// lib/auth/next-redirect.ts

function isRedirectError(error: unknown): error is Error & { digest: string } {
  return (
    error instanceof Error &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
}

export function rethrowIfRedirect(error: unknown): void {
  if (isRedirectError(error)) {
    throw error;
  }
}
```

Now let's look at each Server Action.

#### Sign In with Google

```ts
// app/actions.ts

'use server';

import { signIn, signUp, signOut, forgotPassword, resetPassword } from '@/auth';
import { LucidAuthError } from 'lucidauth/core/errors';
import { rethrowIfRedirect } from '@/lib/auth/next-redirect';

export async function signInWithGoogle() {
  try {
    await signIn('google', { redirectTo: '/dashboard' });
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('signInWithGoogle error: ', error);

    if (error instanceof LucidAuthError) {
      return { error: 'Google sign-in failed. Please try again.' };
    }
    return { error: 'Something went wrong. Please try again.' };
  }
}
```

#### Sign Up with Email & Password

```ts
export async function signUpWithEmailAndPassword(data: {
  email: string;
  password: string;
}) {
  // Validate your form data

  try {
    await signUp({
      email: data.email,
      password: data.password,
    });
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('signUpWithEmailAndPassword error: ', error);

    if (error instanceof LucidAuthError) {
      switch (error.name) {
        case 'AccountAlreadyExistsError':
          return {
            error: 'An account with this email already exists. Please sign in.',
          };
        default:
          return { error: 'Sign-up failed. Please try again.' };
      }
    }
    return { error: 'Something went wrong. Please try again.' };
  }
}
```

During sign-up, a common error scenario is when a user tries to register with an email address that is already associated with an existing credential account. LucidAuth throws an `AccountAlreadyExistsError` for this case. You can target this error by name to inform the user that they should sign in instead.

#### Sign In with Email & Password

```ts
export async function signInWithEmailAndPassword(data: {
  email: string;
  password: string;
}) {
  // Validate your form data

  try {
    await signIn('credential', {
      email: data.email,
      password: data.password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('signInWithEmailAndPassword error: ', error);

    if (error instanceof LucidAuthError) {
      switch (error.name) {
        case 'AccountNotFoundError':
          return { error: 'No account found with this email. Please sign up.' };
        case 'InvalidCredentialsError':
          return { error: 'Invalid email or password.' };
        default:
          return { error: 'Sign-in failed. Please try again.' };
      }
    }
    return { error: 'Something went wrong. Please try again.' };
  }
}
```

During sign-in, two common error scenarios might occur: the user entered an email address that doesn't exist, or they entered the wrong password. LucidAuth throws `AccountNotFoundError` and `InvalidCredentialsError` for these cases. You can target these errors by name to return user-friendly messages.

#### Sign Out

```ts
export async function signOutAction() {
  try {
    await signOut({ redirectTo: '/' });
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('signOut error: ', error);

    return { error: 'Something went wrong. Please try again.' };
  }
}
```

#### Forgot Password

```ts
export async function forgotPasswordAction(email: string) {
  // Validate your form data

  try {
    await forgotPassword(email);
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('forgotPassword error: ', error);

    if (error instanceof LucidAuthError) {
      return {
        error: 'Failed to process forgot password request. Please try again.',
      };
    }
    return { error: 'Something went wrong. Please try again.' };
  }
}
```

When a user submits the forgot password form, LucidAuth redirects them to the path you specified in the `forgotPasswordSuccess` property of the `redirects` object (inside `onPasswordReset`)—regardless of whether the email exists. On that page, it's best practice to show a generic message:

> "If an account exists for the email address you entered, you will receive a password reset link within a minute or so."

This prevents attackers from discovering which email addresses are registered in your system.

#### Reset Password

```ts
export async function resetPasswordAction(token: string, password: string) {
  // Validate your form data

  try {
    await resetPassword(token, password);
  } catch (error) {
    rethrowIfRedirect(error);

    console.log('resetPassword error: ', error);

    if (error instanceof LucidAuthError) {
      switch (error.name) {
        case 'InvalidPasswordResetTokenError':
          return {
            error:
              'Invalid password reset token. Please request a new password reset link.',
          };
        case 'ExpiredPasswordResetTokenError':
          return {
            error:
              'Password reset token has expired. Please request a new password reset link.',
          };
        default:
          return {
            error: 'Failed to reset password. Please try again.',
          };
      }
    }
    return { error: 'Something went wrong. Please try again.' };
  }
}
```

The `resetPassword` function requires a token as its first argument. Where does this token come from?

When a user clicks the password reset link in their email, LucidAuth validates the token and redirects them to the path you specified in the `tokenVerificationSuccess` property of the `redirects` object (inside `onPasswordReset`). LucidAuth appends the token as a query parameter to the URL:

```
https://yourapp.com/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Extract this token using the `useSearchParams` hook and pass it to the `resetPasswordAction`.

### Accessing User Session in Server Components

```ts
import { getUserSession } from "@/auth";

export default async function ServerPage() {
  const session = await getUserSession();

  return <p>{session?.user.email}</p>;
}
```

### Accessing User Session in Client Components

```ts
"use client";

import { useUserSession } from "lucidauth/react";

export default function ClientPage() {
  const { isLoading, isError, isAuthenticated, session } = useUserSession();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>Error fetching user session.</p>;
  }

  if (!isAuthenticated) {
    return <p>Please sign in.</p>;
  }

  return <p>{session?.user.email}</p>;
}
```

### Extending User Session

Create a file named `proxy.ts` in your project root and add the following code:

```ts
// proxy.ts

import { extendUserSessionMiddleware } from '@/auth';

export { extendUserSessionMiddleware as proxy };

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth).*)',
  ],
};
```

> **📝 Note:** In Next.js 16, middleware was renamed to proxy. The `proxy.ts` file serves the same purpose as the previous `middleware.ts` file.

Let's say you've set `maxAge` to 1 hour (`60 * 60`) in your auth configuration. This means the user session expires after 1 hour. But what if a user is actively using your app for 2 hours? Signing them out abruptly at the 1-hour mark would be a poor experience.

The `extendUserSessionMiddleware` solves this by automatically refreshing the session while the user is active. When the session is past its halfway point and the user makes a request, the middleware extends the session, so active users don't get unexpectedly signed out.

The `matcher` configuration ensures the middleware runs on all routes except static assets and auth API routes (which handle their own session logic).

### Protecting Routes in Proxy (Middleware)

You can extend the proxy to protect routes and control access based on authentication status:

```ts
// proxy.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserSession, extendUserSessionMiddleware } from '@/auth';

const protectedRoutes = ['/admin', '/dashboard'];
const authRoutes = ['/signin', '/forgot-password', '/reset-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getUserSession();

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users away from protected routes
  if (!session && isProtectedRoute) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth routes
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Extend session for active users
  return extendUserSessionMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth).*)',
  ],
};
```

This proxy handles two scenarios before allowing the request to proceed:

1. **Unauthenticated users accessing protected routes**: When a user who isn't signed in tries to visit `/admin` or `/dashboard`, they're redirected to the sign-in page. The `next` query parameter preserves the original destination, so you can redirect them back after they sign in.

2. **Authenticated users accessing auth routes**: A user who is already signed in has no reason to access `/signin`, `/forgot-password`, or `/reset-password`. The proxy redirects them to the home page instead.

For all other requests, the proxy calls `extendUserSessionMiddleware` to refresh the session for active users and allows the request to continue normally.

## Extending the User Type Using Module Augmentation

In the `createGoogleUser` and `getCredentialUser` callbacks, the object you return becomes part of the user session. The object you return can contain the properties: `id`, `email`, `name`, `image`, and `role`. This is because LucidAuth defines the default `User` type as follows:

```ts
export interface BaseUser {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
}

export interface User extends BaseUser {}
```

If you attempt to return any other property, you will get a TypeScript error saying that the property does not exist on the `User` type. However, in practice, you often need to make additional properties available in the user session. You can achieve this using **Module Augmentation**.

Let's say you want to make a property named `subscriptionId` available on the `user` object inside the user session (`session.user.subscriptionId`). To do this, create a file named `lucidauth.d.ts` in your project root and add the following code:

```ts
// lucidauth.d.ts

import { BaseUser } from 'lucidauth/core/types';

declare module 'lucidauth/core/types' {
  interface BaseUser {
    subscriptionId?: string;
    // Add any other custom fields here
  }
}
```

LucidAuth's `User` interface extends `BaseUser`. By adding your custom fields to `BaseUser`, they automatically propagate to the `User` type and the `UserSession` type used throughout your application.

Now, you can return `subscriptionId` from your callbacks without TypeScript errors, and access `session.user.subscriptionId` with full type safety and autocomplete throughout your app.

## Recommended Password Reset Flow

LucidAuth recommends the following password reset flow, based on the [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

### Forgot Password

When a user submits the forgot password form, there are two possibilities: the email exists in your system or it doesn't. In both cases, show the same generic message:

> "If an account exists for the email address you entered, you will receive a password reset link within a minute or so."

This prevents attackers from using the forgot password form to discover which email addresses are registered in your system (known as user enumeration).

### Reset Password

Your password reset form should have the following two input fields:

- **New Password**
- **Confirm New Password**

Validate that both fields match before submitting the form.

After the password has been successfully reset, redirect the user to a confirmation page that confirms their password has been updated and prompts them to sign in with their new password.

Additionally, send a confirmation email notifying the user that their password was changed. This alerts them in case the reset was not initiated by them.
