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

### 1. Setting Up Environment Variables

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

## Next.js Integration Guide

Follow the steps below to integrate Google OAuth and Email/Password authentication in your Next.js app.

### 1. Setting Up Environment Variables

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

ou can generate a secure `SESSION_SECRET` by running the following command in your terminal:

```bash
openssl rand -base64 32
```

> **⚠️ Important:** When configuring your OAuth Client in the Google Cloud Console, you **must** set the **Authorized Redirect URI** to:
> `http://localhost:3000/api/auth/callback/google`
>
> LucidAuth internally expects this exact URI to verify and process the authorization code sent from the Google authorization server.
