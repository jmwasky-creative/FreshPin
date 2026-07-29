import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "./page";

describe("FreshPin landing page", () => {
  it("explains the three questions the MVP helps users answer", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        name: "知道物品在哪，才不会错过它的保质期"
      })
    ).toBeInTheDocument();
    expect(screen.getByText("物品是什么？")).toBeInTheDocument();
    expect(screen.getByText("物品放在哪里？")).toBeInTheDocument();
    expect(screen.getByText("物品什么时候过期？")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "管理我的空间" })
    ).toHaveAttribute("href", "/spaces");
  });
});
