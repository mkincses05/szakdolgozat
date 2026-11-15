import { render } from "@testing-library/react";
import { Avatar, faceParts } from "./Avatar";

describe("Avatar", () => {
  it("draws the same face for the same player every time", () => {
    const first = render(<Avatar userId="user-42" isBot={false} />).container.innerHTML;
    const second = render(<Avatar userId="user-42" isBot={false} />).container.innerHTML;
    expect(second).toBe(first);
    expect(faceParts("user-42")).toEqual(faceParts("user-42"));
  });

  it("varies the face between players", () => {
    const faces = new Set(Array.from({ length: 20 }, (_, index) => JSON.stringify(faceParts(`user-${index}`))));
    expect(faces.size).toBeGreaterThan(15);
  });

  it("never dresses a player in the color of the background", () => {
    for (let index = 0; index < 200; index++) {
      const parts = faceParts(`player-${index}`);
      expect(parts.shirt).not.toBe(parts.background);
    }
  });

  it("draws a robot for a bot and hides the decoration from screen readers", () => {
    const { container } = render(<Avatar userId="bot-1" isBot crown />);
    const avatar = container.firstElementChild;
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".fill-robot")).not.toBeNull();
    expect(container.querySelector(".fill-accent")).not.toBeNull();
  });
});
