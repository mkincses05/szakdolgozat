import clsx from "clsx";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete: string;
  maxLength?: number;
  /** `code` shows a short code in big, spaced capitals, for example the room code. */
  variant?: "default" | "code";
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  maxLength,
  variant = "default",
  className
}: TextFieldProps) {
  return (
    <label className={clsx("flex flex-col gap-1.5 font-semibold", className)}>
      {label}
      <input
        className={clsx(
          "min-h-12 w-full rounded-2xl border-2 border-ink-dark/10 bg-white px-4 font-medium text-ink-dark shadow-inner",
          "transition-colors outline-none focus:border-brand focus-visible:ring-4 focus-visible:ring-brand/25",
          variant === "code" && "text-center text-2xl font-bold tracking-[0.3em] uppercase"
        )}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoCapitalize={variant === "code" ? "characters" : undefined}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
