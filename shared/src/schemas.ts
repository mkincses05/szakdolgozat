// zod schemas of client action payloads.
// The schemas validate payload structure only. Game-rule validation (R4–R17) is done by the engine
// against the authoritative state.

import { z } from "zod";
import { CARD_COLORS } from "./cards.js";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  HAND_LIMIT,
  ROOM_CODE_LENGTH
} from "./constants.js";

const idSchema = z.string().min(1).max(64);

export const cardColorSchema = z.enum(CARD_COLORS);

export const displayNameSchema = z.string().trim().min(DISPLAY_NAME_MIN_LENGTH).max(DISPLAY_NAME_MAX_LENGTH);

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`));

/** Every client action carries a client-generated UUID for duplicate detection. */
const actionSchema = z.object({
  actionId: z.uuid()
});

/** Gameplay actions also carry the state version the client last received. */
const gameActionSchema = actionSchema.extend({
  stateVersion: z.int().min(0)
});

export const roomCreatePayloadSchema = actionSchema.extend({
  displayName: displayNameSchema
});

export const roomJoinPayloadSchema = actionSchema.extend({
  roomCode: roomCodeSchema,
  displayName: displayNameSchema
});

export const roomLeavePayloadSchema = actionSchema;

export const roomStartPayloadSchema = actionSchema;

export const gamePlayPayloadSchema = gameActionSchema
  .extend({
    cardIds: z.array(idSchema).min(1).max(HAND_LIMIT),
    chosenColor: cardColorSchema.optional(),
    targetPlayerId: idSchema.optional(),
    swapCardId: idSchema.optional(),
    targetCardPosition: z.int().min(0).max(HAND_LIMIT - 1).optional()
  })
  .refine((payload) => new Set(payload.cardIds).size === payload.cardIds.length, {
    message: "cardIds must be unique",
    path: ["cardIds"]
  })
  .refine((payload) => payload.swapCardId === undefined || !payload.cardIds.includes(payload.swapCardId), {
    message: "swapCardId must not be one of the played cards",
    path: ["swapCardId"]
  })
  .refine((payload) => (payload.swapCardId === undefined) === (payload.targetCardPosition === undefined), {
    message: "swapCardId and targetCardPosition must be sent together",
    path: ["targetCardPosition"]
  });

export const gameDrawPayloadSchema = gameActionSchema;

export const sessionResumePayloadSchema = z.object({
  reconnectToken: z.string().min(1).max(256)
});

export type RoomCreatePayload = z.infer<typeof roomCreatePayloadSchema>;
export type RoomJoinPayload = z.infer<typeof roomJoinPayloadSchema>;
export type RoomLeavePayload = z.infer<typeof roomLeavePayloadSchema>;
export type RoomStartPayload = z.infer<typeof roomStartPayloadSchema>;
export type GamePlayPayload = z.infer<typeof gamePlayPayloadSchema>;
export type GameDrawPayload = z.infer<typeof gameDrawPayloadSchema>;
export type SessionResumePayload = z.infer<typeof sessionResumePayloadSchema>;
