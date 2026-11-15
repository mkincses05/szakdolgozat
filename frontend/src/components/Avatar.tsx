// A friendly cartoon face generated from the user ID: the same player always gets the same face, on
// every page and for every viewer. Bots get a robot face. Decorative: the name is shown next to it.

import clsx from "clsx";
import { memo, type ReactNode } from "react";
import { hashString } from "../utils/hashString";
import { CrownIcon } from "./CrownIcon";

const BACKGROUNDS = [
  "fill-card-red-light",
  "fill-card-yellow-light",
  "fill-card-green-light",
  "fill-card-blue-light",
  "fill-card-wild-light",
  "fill-accent-light"
];
const SHIRTS = ["fill-card-red", "fill-card-yellow", "fill-card-green", "fill-card-blue", "fill-card-wild", "fill-brand"];
const SKINS = ["fill-skin-1", "fill-skin-2", "fill-skin-3", "fill-skin-4", "fill-skin-5"];
const HAIRS = ["fill-hair-1", "fill-hair-2", "fill-hair-3", "fill-hair-4", "fill-hair-5"];
const HAIR_STYLES = 6;
const EYE_STYLES = 3;
const MOUTH_STYLES = 3;
const ACCESSORIES = 4;

const SIZE_CLASSES = {
  sm: "size-9",
  md: "size-14",
  lg: "size-20"
} as const;

/** The parts of a face, each picked from a different part of the hash. */
export interface FaceParts {
  background: number;
  shirt: number;
  skin: number;
  hair: number;
  hairStyle: number;
  eyes: number;
  mouth: number;
  accessory: number;
}

export function faceParts(userId: string): FaceParts {
  const hash = hashString(userId);
  const pick = (shift: number, count: number) => (hash >>> shift) % count;
  const background = pick(0, BACKGROUNDS.length);
  return {
    background,
    // Never the same color as the background.
    shirt: (background + 1 + pick(4, SHIRTS.length - 1)) % SHIRTS.length,
    skin: pick(8, SKINS.length),
    hair: pick(12, HAIRS.length),
    hairStyle: pick(16, HAIR_STYLES),
    eyes: pick(20, EYE_STYLES),
    mouth: pick(23, MOUTH_STYLES),
    accessory: pick(26, ACCESSORIES)
  };
}

interface AvatarProps {
  userId: string;
  isBot: boolean;
  size?: keyof typeof SIZE_CLASSES;
  /** The host in the lobby or the winner in the results. */
  crown?: boolean;
  /** A player who is disconnected, has left, or forfeited. */
  dimmed?: boolean;
  className?: string;
}

export const Avatar = memo(function Avatar({
  userId,
  isBot,
  size = "md",
  crown = false,
  dimmed = false,
  className
}: AvatarProps) {
  const parts = faceParts(userId);

  return (
    <span aria-hidden="true" className={clsx("relative inline-block shrink-0", SIZE_CLASSES[size], className)}>
      <svg
        viewBox="0 0 64 64"
        className={clsx(
          "size-full overflow-hidden rounded-full bg-white shadow-md ring-[3px] ring-white",
          dimmed && "opacity-60 grayscale"
        )}
      >
        <rect width="64" height="64" className={BACKGROUNDS[parts.background]} />
        {isBot ? <RobotFace /> : <HumanFace parts={parts} />}
      </svg>
      {crown && <CrownIcon className="absolute -top-[38%] left-1/2 w-[62%] -translate-x-1/2 -rotate-6 drop-shadow" />}
    </span>
  );
});

function HumanFace({ parts }: { parts: FaceParts }) {
  const skin = SKINS[parts.skin];
  const hair = HAIRS[parts.hair];

  return (
    <>
      {parts.hairStyle === 3 && <path className={hair} d="M15 31c0-13 7-20 17-20s17 7 17 20v18H15z" />}
      <path className={SHIRTS[parts.shirt]} d="M9 66c0-14 10-21 23-21s23 7 23 21z" />
      <rect className={skin} x="27" y="38" width="10" height="9" rx="3" />
      <circle className={skin} cx="18.5" cy="31" r="3.2" />
      <circle className={skin} cx="45.5" cy="31" r="3.2" />
      <circle className={skin} cx="32" cy="29" r="14" />
      <Hair style={parts.hairStyle} className={hair} />
      <Eyes style={parts.eyes} />
      <circle className="fill-blush" opacity="0.55" cx="23.5" cy="34" r="2.3" />
      <circle className="fill-blush" opacity="0.55" cx="40.5" cy="34" r="2.3" />
      <Mouth style={parts.mouth} />
      <Accessory kind={parts.accessory} />
    </>
  );
}

function Hair({ style, className }: { style: number; className: string }) {
  const shapes: ReactNode[] = [
    <path d="M18 27c0-10 6-15.5 14-15.5S46 17 46 27c-3-5-8-7.5-14-7.5S21 22 18 27z" />,
    <path d="M17 28c-1-11 7-17.5 16-16.5 8 .8 14 7 13 16.5-4-6.5-10-8.5-17-6.5-5 1.3-8 3.3-12 6.5z" />,
    <>
      <circle cx="19.5" cy="22" r="5" />
      <circle cx="25" cy="16.5" r="5.5" />
      <circle cx="32" cy="14.5" r="6" />
      <circle cx="39" cy="16.5" r="5.5" />
      <circle cx="44.5" cy="22" r="5" />
    </>,
    <path d="M18 27c2-8.5 8-12.5 14-12.5S44 18.5 46 27c-5-3.5-9-4.5-14-4.5S23 23.5 18 27z" />,
    <>
      <circle cx="32" cy="11" r="6" />
      <path d="M18 27c0-10 6-15 14-15s14 5 14 15c-3-5-8-7.5-14-7.5S21 22 18 27z" />
    </>,
    <path d="M18 27l1.5-10 4.5 4 3-8 4.5 6 4-7 3 8 4.5-4 1.5 11c-4-4.5-9-6.5-14.5-6.5S22 22.5 18 27z" />
  ];
  return <g className={className}>{shapes[style]}</g>;
}

function Eyes({ style }: { style: number }) {
  const dot = (cx: number) => <circle className="fill-ink-dark" cx={cx} cy="29.5" r="1.9" />;
  const arc = (cx: number) => (
    <path className="stroke-ink-dark" fill="none" strokeWidth="1.8" strokeLinecap="round" d={`M${cx - 2.2} 30.5q2.2-2.8 4.4 0`} />
  );
  if (style === 0) {
    return (
      <>
        {dot(27)}
        {dot(37)}
      </>
    );
  }
  if (style === 1) {
    return (
      <>
        {arc(27)}
        {arc(37)}
      </>
    );
  }
  return (
    <>
      {dot(27)}
      {arc(37)}
    </>
  );
}

function Mouth({ style }: { style: number }) {
  if (style === 0) {
    return <path className="stroke-ink-dark" fill="none" strokeWidth="1.8" strokeLinecap="round" d="M28 35.5q4 4 8 0" />;
  }
  if (style === 1) {
    return (
      <path className="fill-white stroke-ink-dark" strokeWidth="1.5" strokeLinejoin="round" d="M27.5 34.5h9q-.8 5.5-4.5 5.5t-4.5-5.5z" />
    );
  }
  return <ellipse className="fill-ink-dark" cx="32" cy="37" rx="2" ry="1.6" />;
}

function Accessory({ kind }: { kind: number }) {
  if (kind === 1) {
    return (
      <g className="stroke-ink-dark" fill="none" strokeWidth="1.6">
        <circle cx="27" cy="29.5" r="4.6" />
        <circle cx="37" cy="29.5" r="4.6" />
        <path d="M31.6 29.5h0.8" />
      </g>
    );
  }
  if (kind === 2) {
    return (
      <g className="fill-hair-3" opacity="0.7">
        <circle cx="24.5" cy="31.5" r="0.7" />
        <circle cx="26.5" cy="32.8" r="0.7" />
        <circle cx="37.5" cy="32.8" r="0.7" />
        <circle cx="39.5" cy="31.5" r="0.7" />
      </g>
    );
  }
  return null;
}

function RobotFace() {
  return (
    <>
      <path className="fill-robot-dark" d="M9 66c0-14 10-21 23-21s23 7 23 21z" />
      <rect className="fill-robot-dark" x="27" y="38" width="10" height="9" rx="2" />
      <path className="stroke-robot-dark" strokeWidth="2" d="M32 17V10" />
      <circle className="fill-card-red" cx="32" cy="9" r="2.8" />
      <rect className="fill-robot-dark" x="13.5" y="25" width="5" height="10" rx="2" />
      <rect className="fill-robot-dark" x="45.5" y="25" width="5" height="10" rx="2" />
      <rect className="fill-robot stroke-robot-dark" strokeWidth="1.5" x="17" y="16" width="30" height="27" rx="8" />
      <rect className="fill-surface-sunken" x="21" y="22" width="22" height="11" rx="5.5" />
      <circle className="fill-robot-eye" cx="27" cy="27.5" r="2.6" />
      <circle className="fill-robot-eye" cx="37" cy="27.5" r="2.6" />
      <rect className="fill-robot-dark" x="26" y="36" width="12" height="3" rx="1.5" />
    </>
  );
}
