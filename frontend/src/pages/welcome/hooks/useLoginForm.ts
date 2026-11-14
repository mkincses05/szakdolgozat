// Login form: a username or email and a password, checked with the shared schema before sending.

import { loginPayloadSchema } from "@wildhand/shared";
import { useState } from "react";
import { useAccount } from "../../../hooks/useAccount";
import { useAction } from "../../../hooks/useAction";

export function useLoginForm() {
  const { login } = useAccount();
  const [values, setValues] = useState({ login: "", password: "" });
  const [missingInput, setMissingInput] = useState(false);
  const { run, pending, error, clearError } = useAction();

  const setValue = (field: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  const submit = () => {
    clearError();
    const parsed = loginPayloadSchema.safeParse(values);
    setMissingInput(!parsed.success);
    if (parsed.success) {
      void run(() => login(parsed.data));
    }
  };

  return {
    values,
    setLogin: setValue("login"),
    setPassword: setValue("password"),
    missingInput,
    error,
    pending,
    submit
  };
}
