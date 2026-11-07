interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete: string;
  maxLength?: number;
}

export function TextField({ label, value, onChange, type = "text", autoComplete, maxLength }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        className="border p-1"
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
