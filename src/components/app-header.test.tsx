import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./app-header";

describe("AppHeader", () => {
  it("offers an accessible link back to the home page", () => {
    render(<AppHeader />);

    expect(
      screen.getByRole("link", { name: "返回首页" })
    ).toHaveAttribute("href", "/");
  });

  it("shows a clear return-home label to sighted users", () => {
    render(<AppHeader />);

    expect(screen.getByRole("link", { name: "返回首页" })).toHaveTextContent(
      "返回首页"
    );
  });
});
