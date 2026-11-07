// Passwords and login tokens (docs/03 section 2). Passwords are stored as argon2id hashes; a login
// token is random, sent to the browser once, and stored only as its SHA-256 hash.

import { hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";

export function hashPassword(password: string): Promise<string> {
  // The library defaults are argon2id with the parameters recommended by OWASP.
  return hash(password);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

/** A valid hash of a random password, verified when a login names no account, so both cases take as long. */
let dummyHash: Promise<string> | null = null;
export function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= hash(randomBytes(16).toString("hex"));
  return dummyHash.then((value) => verify(value, password));
}

export function newLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashLoginToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}
