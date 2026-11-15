// The title of the entry pages: the logo over a fan of cards, and a short line below it. The cards
// are decoration only, not game data.

import type { Card } from "@wildhand/shared";
import { CrownIcon } from "./CrownIcon";
import { Logo } from "./Logo";
import { PlayingCard } from "./PlayingCard";

const FAN: { card: Card; className: string }[] = [
  { card: { id: "hero-1", deckInstance: 0, kind: "number", color: "red", number: 7 }, className: "-rotate-[24deg] translate-x-[-150%] translate-y-[18%]" },
  { card: { id: "hero-2", deckInstance: 0, kind: "plus2", color: "yellow" }, className: "-rotate-[12deg] translate-x-[-80%] translate-y-[5%]" },
  { card: { id: "hero-3", deckInstance: 0, kind: "storm" }, className: "-translate-x-1/2" },
  { card: { id: "hero-4", deckInstance: 0, kind: "swap", color: "green" }, className: "rotate-[12deg] translate-x-[-20%] translate-y-[5%]" },
  { card: { id: "hero-5", deckInstance: 0, kind: "number", color: "blue", number: 3 }, className: "rotate-[24deg] translate-x-[50%] translate-y-[18%]" }
];

export function HeroBanner({ subtitle }: { subtitle: string }) {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <div aria-hidden="true" className="relative mt-6 h-24 w-full sm:h-28">
        {FAN.map(({ card, className }) => (
          <PlayingCard key={card.id} card={card} size="sm" className={`absolute! top-0 left-1/2 origin-bottom ${className}`} />
        ))}
        <CrownIcon className="absolute -top-9 left-1/2 w-14 -translate-x-1/2 -rotate-6 drop-shadow-md" />
      </div>
      <h1 className="-mt-8 animate-logo-float text-5xl sm:text-6xl">
        <Logo />
      </h1>
      <p className="max-w-sm text-lg font-medium text-ink-dark/80">{subtitle}</p>
    </header>
  );
}
