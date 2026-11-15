// The one button style of the game: big, rounded, with a 3D edge that is pressed in on click.
// `aria-pressed` buttons (toggles and choices) get a gold ring when they are on.

import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-linear-to-b from-brand-light to-brand text-ink shadow-button",
  secondary: "bg-white text-ink-dark shadow-button",
  danger: "bg-linear-to-b from-card-red-light to-danger text-ink shadow-button",
  ghost: "bg-surface/15 text-current ring-2 ring-current/30 ring-inset"
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-14 px-8 text-xl"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", type = "button", className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold",
        "cursor-pointer transition-transform duration-100 select-none",
        "hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95",
        "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "aria-pressed:ring-4 aria-pressed:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
