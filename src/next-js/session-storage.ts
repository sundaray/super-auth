import { ResultAsync } from 'neverthrow';
import { cookies } from 'next/headers';
import type { CookieOptions, SessionStorage } from '../core/session/types';
import {
  DeleteUserSessionError,
  GetUserSessionError,
  SaveUserSessionError,
} from '../core/session/errors';

export class NextJsSessionStorage implements SessionStorage<undefined> {
  private cookieName: string;
  private cookieOptions: CookieOptions;

  constructor(cookieName: string, cookieOptions: CookieOptions) {
    this.cookieName = cookieName;
    this.cookieOptions = cookieOptions;
  }

  getSession(
    context: undefined,
  ): ResultAsync<string | null, GetUserSessionError> {
    return ResultAsync.fromPromise(
      (async () => {
        const cookieStore = await cookies();
        const cookie = cookieStore.get(this.cookieName);
        return cookie?.value ?? null;
      })(),
      (error) => new GetUserSessionError({ cause: error }),
    );
  }

  saveSession(
    context: undefined,
    session: string,
  ): ResultAsync<void, SaveUserSessionError> {
    return ResultAsync.fromPromise(
      (async () => {
        const cookieStore = await cookies();

        cookieStore.set(this.cookieName, session, {
          ...this.cookieOptions,
        });
      })(),
      (error) => new SaveUserSessionError({ cause: error }),
    );
  }

  deleteSession(context: undefined): ResultAsync<void, DeleteUserSessionError> {
    return ResultAsync.fromPromise(
      (async () => {
        const cookieStore = await cookies();
        cookieStore.delete({
          name: this.cookieName,
          path: this.cookieOptions.path,
          secure: this.cookieOptions.secure,
          sameSite: this.cookieOptions.sameSite,
        });
      })(),
      (error) => new DeleteUserSessionError({ cause: error }),
    );
  }
}
