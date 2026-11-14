// Registration form: every field is checked with the shared schemas, so the player sees all invalid
// fields at once; uniqueness is checked by the server.

import { registerPayloadSchema, type RegisterPayload } from "@wildhand/shared";
import { useState } from "react";
import { useAccount } from "../../../hooks/useAccount";
import { useAction } from "../../../hooks/useAction";

export type RegisterField = keyof RegisterPayload;

const EMPTY: RegisterPayload = { username: "", email: "", displayName: "", password: "" };

export function useRegisterForm() {
  const { register } = useAccount();
  const [values, setValues] = useState<RegisterPayload>(EMPTY);
  const [invalidFields, setInvalidFields] = useState<RegisterField[]>([]);
  const { run, pending, error, clearError } = useAction();

  const setValue = (field: RegisterField, value: string) => setValues((current) => ({ ...current, [field]: value }));

  const submit = () => {
    clearError();
    const parsed = registerPayloadSchema.safeParse(values);
    if (!parsed.success) {
      const fields = new Set(parsed.error.issues.map((issue) => issue.path[0] as RegisterField));
      setInvalidFields((Object.keys(EMPTY) as RegisterField[]).filter((field) => fields.has(field)));
      return;
    }
    setInvalidFields([]);
    void run(() => register(parsed.data));
  };

  return { values, setValue, invalidFields, error, pending, submit };
}
