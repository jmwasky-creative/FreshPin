import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemEntryPanel } from "./item-entry-panel";

const fridgeLocation = {
  id: "fridge-door",
  name: "冰箱门"
};

describe("ItemEntryPanel", () => {
  it("prevents submission and explains that a location must be selected first", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ItemEntryPanel onSubmit={onSubmit} selectedLocation={null} />);

    expect(screen.getByText("请先选择一个位置")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "保存物品" });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the selected location and submits the validator-normalized item", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ItemEntryPanel onSubmit={onSubmit} selectedLocation={fridgeLocation} />);

    expect(screen.getByText("已选择位置：冰箱门")).toBeInTheDocument();

    await user.type(screen.getByLabelText("物品名称"), "  牛奶  ");
    await user.type(screen.getByLabelText("到期日（可选）"), "2026-02-03");
    await user.click(screen.getByRole("button", { name: "保存物品" }));

    expect(onSubmit).toHaveBeenCalledWith({
      expiryDate: "2026-02-03",
      locationId: "fridge-door",
      name: "牛奶"
    });
  });

  it("normalizes an empty expiry date to null before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ItemEntryPanel onSubmit={onSubmit} selectedLocation={fridgeLocation} />);

    await user.type(screen.getByLabelText("物品名称"), "鸡蛋");
    await user.click(screen.getByRole("button", { name: "保存物品" }));

    expect(onSubmit).toHaveBeenCalledWith({
      expiryDate: null,
      locationId: "fridge-door",
      name: "鸡蛋"
    });
  });

  it("shows a Chinese validation error instead of submitting invalid input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ItemEntryPanel onSubmit={onSubmit} selectedLocation={fridgeLocation} />);

    await user.click(screen.getByRole("button", { name: "保存物品" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "请输入 1–100 个字符的物品名称。"
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
