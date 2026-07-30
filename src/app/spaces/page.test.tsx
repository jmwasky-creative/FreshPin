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

  it("discloses that the space preview is local and resets outside the active session", () => {
    render(<SpacesPage />);

    expect(
      screen.getByRole("heading", { name: "本地空间预览" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "本地原型：关闭或刷新页面后，图片、位置标记和物品记录都会丢失。"
      )
    ).toBeInTheDocument();
  });
});
