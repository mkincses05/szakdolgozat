// The login cookie. It is `HttpOnly`, so page scripts cannot read it, and `SameSite=Lax`, so other
// sites cannot send it with their requests.

export const LOGIN_COOKIE = "wildhand_session";

export function readLoginCookie(header: string | undefined): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator).trim() === LOGIN_COOKIE) {
      const value = part.slice(separator + 1).trim();
      // Tokens are base64url; anything else is not a token this server issued.
      return /^[A-Za-z0-9_-]+$/.test(value) ? value : undefined;
    }
  }
  return undefined;
}

export function loginCookie(token: string, expiresAt: Date, now: number, secure: boolean): string {
  const maxAge = Math.max(0, Math.round((expiresAt.getTime() - now) / 1000));
  return attributes(`${LOGIN_COOKIE}=${token}`, maxAge, secure);
}

export function clearedLoginCookie(secure: boolean): string {
  return attributes(`${LOGIN_COOKIE}=`, 0, secure);
}

function attributes(value: string, maxAge: number, secure: boolean): string {
  return [value, "Path=/", `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax", ...(secure ? ["Secure"] : [])].join("; ");
}
