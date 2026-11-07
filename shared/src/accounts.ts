// Registered accounts (docs/03 section 2): the HTTP payloads of the account API and the profile
// returned to the logged-in user. The schemas validate structure only; uniqueness and credentials
// are checked by the server.

import { z } from "zod";
import { displayNameSchema } from "./schemas.js";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;
/** An upper bound keeps password hashing cheap for the server. */
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

/** Letters, digits, `.`, `_`, and `-`; never `@`, so a login can tell usernames and emails apart. */
export const usernameSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^[A-Za-z0-9._-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`));

export const emailSchema = z.string().trim().max(EMAIL_MAX_LENGTH).pipe(z.email());

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const registerPayloadSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  displayName: displayNameSchema,
  password: passwordSchema
});

export const loginPayloadSchema = z.object({
  /** A username or an email address. */
  login: z.string().trim().min(1).max(EMAIL_MAX_LENGTH),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH)
});

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;

/** The logged-in user's own account; never sent to other players. */
export interface AccountProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  xp: number;
  matchesPlayed: number;
  wins: number;
  forfeits: number;
}
