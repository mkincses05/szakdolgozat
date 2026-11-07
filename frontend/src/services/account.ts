// The account API of the backend (docs/03 section 2): registration, login, logout, and the own
// profile. The login cookie is HttpOnly, so this code never sees it; `credentials: "include"` lets
// the browser send and store it.

import { isErrorCode, type AccountProfile, type LoginPayload, type RegisterPayload } from "@wildhand/shared";
import type { ActionErrorCode } from "./actions";
import { SERVER_URL } from "./serverUrl";

export type AccountResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; code: ActionErrorCode };

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<AccountResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}/api/auth${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    return { ok: false, code: "no_response" };
  }

  try {
    const result = (await response.json()) as { ok: boolean; data?: T; code?: unknown };
    if (result.ok) {
      return result as AccountResult<T>;
    }
    return { ok: false, code: isErrorCode(result.code) ? result.code : "internal_error" };
  } catch {
    return { ok: false, code: "internal_error" };
  }
}

export function fetchProfile(): Promise<AccountResult<AccountProfile>> {
  return request("GET", "/me");
}

export function register(payload: RegisterPayload): Promise<AccountResult<AccountProfile>> {
  return request("POST", "/register", payload);
}

export function login(payload: LoginPayload): Promise<AccountResult<AccountProfile>> {
  return request("POST", "/login", payload);
}

export function logout(): Promise<AccountResult> {
  return request("POST", "/logout", {});
}
