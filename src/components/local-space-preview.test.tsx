import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalSpacePreview } from "./local-space-preview";

const createObjectURL = vi.fn(() => "blob:local-kitchen");
const revokeObjectURL = vi.fn();

describe("LocalSpacePreview", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL
    });
  });

  afterEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.unstubAllGlobals();
  });

  it("creates a canvas preview from a selected local image", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);

    expect(createObjectURL).toHaveBeenCalledWith(image);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 900 },
      naturalWidth: { configurable: true, value: 1200 }
    });
    fireEvent.load(imageLoader);

    expect(screen.getByAltText("本地空间图片：kitchen.png")).toHaveAttribute(
      "src",
      "blob:local-kitchen"
    );
    expect(
      screen.getByRole("button", { name: "在空间图片中创建位置" })
    ).toBeInTheDocument();
  });

  it("uses the entered space name for the active local workspace", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    const spaceNameInput = screen.getByRole("textbox", { name: "空间名称" });
    await user.clear(spaceNameInput);
    await user.type(spaceNameInput, "冷藏柜");
    await user.upload(screen.getByLabelText("选择空间图片"), image);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 900 },
      naturalWidth: { configurable: true, value: 1200 }
    });
    fireEvent.load(imageLoader);

    expect(screen.getByText("当前空间：冷藏柜")).toBeInTheDocument();
  });

  it("requires a valid space name before creating a local image URL", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    await user.clear(screen.getByRole("textbox", { name: "空间名称" }));
    await user.upload(screen.getByLabelText("选择空间图片"), image);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请输入 1–50 个字符的空间名称。"
    );
  });

  it("adds a trimmed named marker after clicking the preview image", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 240 },
      naturalWidth: { configurable: true, value: 400 }
    });
    fireEvent.load(imageLoader);

    const previewImage = screen.getByAltText("本地空间图片：kitchen.png");
    vi.spyOn(previewImage, "getBoundingClientRect").mockReturnValue({
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

    fireEvent.click(previewImage, { clientX: 250, clientY: 100 });

    await user.type(screen.getByRole("textbox", { name: "位置名称" }), "  牛奶  ");
    await user.click(screen.getByRole("button", { name: "保存位置" }));

    const marker = screen.getByRole("button", { name: "选择位置：牛奶" });
    expect(marker).toHaveStyle({ left: "37.5%", top: "25%" });

    await user.click(marker);
    expect(screen.getByRole("status")).toHaveTextContent("已选择位置：牛奶");
  });

  it("records an item for a selected marker and shows its Chinese expiry state", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview today="2026-02-01" />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 240 },
      naturalWidth: { configurable: true, value: 400 }
    });
    fireEvent.load(imageLoader);

    const previewImage = screen.getByAltText("本地空间图片：kitchen.png");
    vi.spyOn(previewImage, "getBoundingClientRect").mockReturnValue({
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
    fireEvent.click(previewImage, { clientX: 250, clientY: 100 });

    await user.type(screen.getByRole("textbox", { name: "位置名称" }), "冷藏层");
    await user.click(screen.getByRole("button", { name: "保存位置" }));
    await user.click(screen.getByRole("button", { name: "选择位置：冷藏层" }));

    await user.type(screen.getByLabelText("物品名称"), "酸奶");
    await user.type(screen.getByLabelText("到期日（可选）"), "2026-02-03");
    await user.click(screen.getByRole("button", { name: "保存物品" }));

    expect(screen.getByText("酸奶")).toBeInTheDocument();
    expect(screen.getByText("到期状态：临期")).toBeInTheDocument();
  });

  it("rejects an unsupported local file before creating an object URL", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const file = new File(["not-an-image"], "notes.txt", {
      type: "text/plain"
    });

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), file);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。"
    );
  });

  it("rejects a local image larger than 5 MiB before creating an object URL", async () => {
    const user = userEvent.setup();
    const file = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "oversized.png",
      { type: "image/png" }
    );

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), file);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请选择 JPEG、PNG 或 WebP 格式且不超过 5 MiB 的图片。"
    );
  });

  it("clears the file input after a valid selection so the same image can be selected again", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    const fileInput = screen.getByLabelText("选择空间图片");
    await user.upload(fileInput, image);

    expect(fileInput).toHaveValue("");
  });

  it("mounts a new loader when a second image replaces one that is still loading", async () => {
    createObjectURL
      .mockReturnValueOnce("blob:first-pending")
      .mockReturnValueOnce("blob:second-pending");

    const user = userEvent.setup();
    const firstImage = new File(["first"], "first.png", {
      type: "image/png"
    });
    const secondImage = new File(["second"], "second.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    const fileInput = screen.getByLabelText("选择空间图片");
    await user.upload(fileInput, firstImage);
    const firstLoader = screen.getByAltText("正在加载空间图片");

    await user.upload(fileInput, secondImage);
    const secondLoader = screen.getByAltText("正在加载空间图片");

    expect(secondLoader).not.toBe(firstLoader);
    expect(secondLoader).toHaveAttribute("src", "blob:second-pending");
  });

  it("releases a selected object URL when the preview unmounts", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    const { unmount } = render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-kitchen");
  });

  it("returns focus to the canvas create control after canceling location naming", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "kitchen.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 240 },
      naturalWidth: { configurable: true, value: 400 }
    });
    fireEvent.load(imageLoader);

    const createLocation = screen.getByRole("button", {
      name: "在空间图片中创建位置"
    });
    await user.click(createLocation);

    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(createLocation).toHaveFocus();
  });

  it("releases the previous object URL and clears markers and items when replacing an image", async () => {
    createObjectURL
      .mockReturnValueOnce("blob:first-kitchen")
      .mockReturnValueOnce("blob:second-kitchen");

    const user = userEvent.setup();
    const firstImage = new File(["first"], "first.png", {
      type: "image/png"
    });
    const replacementImage = new File(["second"], "second.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    const fileInput = screen.getByLabelText("选择空间图片");
    await user.upload(fileInput, firstImage);

    const imageLoader = screen.getByAltText("正在加载空间图片");
    Object.defineProperties(imageLoader, {
      naturalHeight: { configurable: true, value: 240 },
      naturalWidth: { configurable: true, value: 400 }
    });
    fireEvent.load(imageLoader);

    const firstPreview = screen.getByAltText("本地空间图片：first.png");
    vi.spyOn(firstPreview, "getBoundingClientRect").mockReturnValue({
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
    fireEvent.click(firstPreview, { clientX: 250, clientY: 100 });
    await user.type(screen.getByRole("textbox", { name: "位置名称" }), "牛奶");
    await user.click(screen.getByRole("button", { name: "保存位置" }));
    const milkMarker = screen.getByRole("button", { name: "选择位置：牛奶" });
    expect(milkMarker).toBeInTheDocument();

    await user.click(milkMarker);
    await user.type(screen.getByLabelText("物品名称"), "酸奶");
    await user.click(screen.getByRole("button", { name: "保存物品" }));
    expect(screen.getByText("酸奶")).toBeInTheDocument();

    await user.upload(fileInput, replacementImage);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first-kitchen");
    expect(
      screen.queryByRole("button", { name: "选择位置：牛奶" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("酸奶")).not.toBeInTheDocument();
  });

  it("releases an unreadable image URL and reports a recoverable error", async () => {
    const user = userEvent.setup();
    const image = new File(["image-bytes"], "broken.png", {
      type: "image/png"
    });

    render(<LocalSpacePreview />);

    await user.upload(screen.getByLabelText("选择空间图片"), image);
    fireEvent.error(screen.getByAltText("正在加载空间图片"));

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-kitchen");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "这张图片无法在浏览器中预览，请选择另一张图片。"
    );
    expect(
      screen.queryByRole("button", { name: "在空间图片中创建位置" })
    ).not.toBeInTheDocument();
  });
});
