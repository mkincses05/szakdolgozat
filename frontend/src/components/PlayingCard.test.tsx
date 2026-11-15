import type { Card } from "@wildhand/shared";
import { render, screen } from "@testing-library/react";
import i18n from "../i18n";
import { PlayingCard } from "./PlayingCard";

const cards: [Card, string][] = [
  [{ id: "r7", deckInstance: 1, kind: "number", color: "red", number: 7 }, "Red 7"],
  [{ id: "y0", deckInstance: 1, kind: "number", color: "yellow", number: 0 }, "Yellow 0"],
  [{ id: "bp", deckInstance: 1, kind: "plus2", color: "blue" }, "Blue +2"],
  [{ id: "gs", deckInstance: 1, kind: "swap", color: "green" }, "Green Swap"],
  [{ id: "st", deckInstance: 1, kind: "storm" }, "Storm"],
  [{ id: "cc", deckInstance: 1, kind: "colorChange" }, "Color Change"],
  [{ id: "sp", deckInstance: 1, kind: "spy" }, "Spy"]
];

describe("PlayingCard", () => {
  afterEach(() => i18n.changeLanguage("en"));

  it.each(cards)("is an image named after the card (%o)", (card, name) => {
    render(<PlayingCard card={card} />);
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it("gives a button around it the name of the card", () => {
    render(
      <button type="button">
        <PlayingCard card={cards[0][0]} />
      </button>
    );
    expect(screen.getByRole("button", { name: "Red 7" })).toBeInTheDocument();
  });

  it("translates the color, but keeps the card kind in English", async () => {
    await i18n.changeLanguage("hu");
    render(
      <>
        <PlayingCard card={cards[2][0]} />
        <PlayingCard card={cards[4][0]} />
      </>
    );
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("aria-label"))).toEqual([
      i18n.t("common:cardLabel.colored", { color: i18n.t("common:colors.blue"), name: "+2" }),
      "Storm"
    ]);
  });
});
