import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SpacesPage from "./page";

describe("SpacesPage", () => {
  it("keeps a return-home link available from the space area", () => {
    render(<SpacesPage />);

    expect(
      screen.getByRole("link", { name: "返回首页" })
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("heading", { name: "我的空间" })
    ).toBeInTheDocument();
  });
});
