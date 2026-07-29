import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SpaceCanvas } from "./space-canvas";

const kitchenImage = {
  alt: "厨房空间",
  height: 240,
  src: "/kitchen.jpg",
  width: 400
};

describe("SpaceCanvas", () => {
  it("converts a pointer click within the displayed image to a normalized location", () => {
    const onCreateLocation = vi.fn();

    render(
      <SpaceCanvas
        image={kitchenImage}
        locations={[]}
        onCreateLocation={onCreateLocation}
      />
    );

    const image = screen.getByAltText("厨房空间");
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue({
      bottom: 280,
      height: 240,
      left: 100,
      right: 500,
      toJSON: () => ({}),
      top: 40,
      width: 400,
      x: 100,
      y: 40
    });

    fireEvent.click(image, { clientX: 250, clientY: 100 });

    expect(onCreateLocation).toHaveBeenCalledWith({
      xRatio: 0.375,
      yRatio: 0.25
    });
  });

  it("creates a centered location when its native button is activated by keyboard", async () => {
    const user = userEvent.setup();
    const onCreateLocation = vi.fn();

    render(
      <SpaceCanvas
        image={kitchenImage}
        locations={[]}
        onCreateLocation={onCreateLocation}
      />
    );

    const createLocation = screen.getByRole("button", {
      name: "在空间图片中创建位置"
    });

    expect(createLocation).toHaveAccessibleDescription(
      "点击图片可在对应位置创建；使用 Enter 或空格键时将在图片中心创建位置。"
    );

    await user.tab();
    expect(createLocation).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onCreateLocation).toHaveBeenCalledWith({ xRatio: 0.5, yRatio: 0.5 });
  });

  it("renders an unselected marker as a meaningful non-interactive sibling", () => {
    render(
      <SpaceCanvas
        image={kitchenImage}
        locations={[
          {
            id: "left-edge",
            name: "冷藏第一层",
            xRatio: 0,
            yRatio: 1
          }
        ]}
      />
    );

    const createLocation = screen.getByRole("button", {
      name: "在空间图片中创建位置"
    });
    const marker = screen.getByRole("img", { name: "位置标记：冷藏第一层" });

    expect(marker).toHaveStyle({ left: "0%", top: "100%" });
    expect(marker.parentElement).toBe(createLocation.parentElement);
    expect(marker.parentElement).not.toHaveClass("overflow-hidden");
    expect(
      screen.queryByRole("button", { name: "选择位置：冷藏第一层" })
    ).not.toBeInTheDocument();
  });

  it("makes a marker selectable only when an onSelectLocation callback is provided", () => {
    const onSelectLocation = vi.fn();

    render(
      <SpaceCanvas
        image={kitchenImage}
        locations={[
          {
            id: "fridge-top-shelf",
            name: "冷藏第一层",
            xRatio: 0.625,
            yRatio: 0.3125
          }
        ]}
        onSelectLocation={onSelectLocation}
      />
    );

    const marker = screen.getByRole("button", { name: "选择位置：冷藏第一层" });
    fireEvent.click(marker);

    expect(marker).toHaveStyle({ left: "62.5%", top: "31.25%" });
    expect(onSelectLocation).toHaveBeenCalledWith({
      id: "fridge-top-shelf",
      name: "冷藏第一层",
      xRatio: 0.625,
      yRatio: 0.3125
    });
  });

  it("ignores malformed runtime location entries", () => {
    render(
      <SpaceCanvas
        image={kitchenImage}
        locations={
          [
            null,
            { id: 42, name: "错误标记", xRatio: 0.5, yRatio: 0.5 },
            { id: "bad-coordinate", name: "越界标记", xRatio: 1.5, yRatio: 0.5 },
            { id: "valid", name: "有效标记", xRatio: 0.5, yRatio: 0.5 }
          ] as never
        }
      />
    );

    expect(screen.getByRole("img", { name: "位置标记：有效标记" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "位置标记：错误标记" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "位置标记：越界标记" })).not.toBeInTheDocument();
  });

  it("treats non-array and uninspectable location values as empty", () => {
    const { rerender } = render(
      <SpaceCanvas image={kitchenImage} locations={{} as never} />
    );

    expect(
      screen.queryByRole("img", { name: /位置标记：/ })
    ).not.toBeInTheDocument();

    const { proxy, revoke } = Proxy.revocable([], {});
    revoke();

    expect(() => {
      rerender(<SpaceCanvas image={kitchenImage} locations={proxy as never} />);
    }).not.toThrow();
    expect(
      screen.queryByRole("img", { name: /位置标记：/ })
    ).not.toBeInTheDocument();
  });
});
