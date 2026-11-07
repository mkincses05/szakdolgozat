// The account API (docs/03 section 2). Responses use the same shape as Socket.IO acknowledgements:
// `{ ok: true, data }` or `{ ok: false, code }` with a code from ERROR_CODES.

import { loginPayloadSchema, registerPayloadSchema, type ErrorCode } from "@wildhand/shared";
import { Router, type Request, type Response } from "express";
import type { AuthService, LoginSession } from "../auth/auth-service.js";
import { clearedLoginCookie, loginCookie, readLoginCookie } from "../auth/cookies.js";
import type { Logger } from "../logger.js";

const STATUS: Partial<Record<ErrorCode, number>> = {
  invalid_payload: 400,
  invalid_credentials: 401,
  not_logged_in: 401,
  username_taken: 409,
  email_taken: 409,
  database_unavailable: 503
};

export interface AuthRouteOptions {
  auth: AuthService;
  logger: Logger;
  secureCookies: boolean;
  now: () => number;
}

export function createAuthRouter({ auth, logger, secureCookies, now }: AuthRouteOptions): Router {
  const router = Router();

  const fail = (response: Response, code: ErrorCode) => {
    response.status(STATUS[code] ?? 500).json({ ok: false, code });
  };

  const sendSession = (response: Response, session: LoginSession, status: number) => {
    response.setHeader("Set-Cookie", loginCookie(session.token, session.expiresAt, now(), secureCookies));
    response.status(status).json({ ok: true, data: session.profile });
  };

  /** Turns an unexpected error into `internal_error` without leaking details. */
  const handle =
    (name: string, run: (request: Request, response: Response) => Promise<void>) =>
    async (request: Request, response: Response) => {
      try {
        await run(request, response);
      } catch (error) {
        logger.error(`Unexpected error in ${name}`, error);
        fail(response, "internal_error");
      }
    };

  router.post(
    "/register",
    handle("register", async (request, response) => {
      const parsed = registerPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return fail(response, "invalid_payload");
      }
      const result = await auth.register(parsed.data);
      return result.ok ? sendSession(response, result.data, 201) : fail(response, result.code);
    })
  );

  router.post(
    "/login",
    handle("login", async (request, response) => {
      const parsed = loginPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return fail(response, "invalid_payload");
      }
      const result = await auth.login(parsed.data);
      return result.ok ? sendSession(response, result.data, 200) : fail(response, result.code);
    })
  );

  router.post(
    "/logout",
    handle("logout", async (request, response) => {
      await auth.logout(readLoginCookie(request.headers.cookie));
      response.setHeader("Set-Cookie", clearedLoginCookie(secureCookies));
      response.json({ ok: true });
    })
  );

  router.get(
    "/me",
    handle("me", async (request, response) => {
      const token = readLoginCookie(request.headers.cookie);
      const result = await auth.profile(token);
      if (!result.ok) {
        if (result.code === "not_logged_in" && token) {
          // The cookie belongs to an expired or deleted session.
          response.setHeader("Set-Cookie", clearedLoginCookie(secureCookies));
        }
        return fail(response, result.code);
      }
      if (token && result.data.renewedUntil) {
        response.setHeader("Set-Cookie", loginCookie(token, result.data.renewedUntil, now(), secureCookies));
      }
      response.json({ ok: true, data: result.data.profile });
    })
  );

  return router;
}
