import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("suppresses one-level hydration warnings at the document root", () => {
    const documentRoot = RootLayout({ children: null });

    expect(documentRoot.props.suppressHydrationWarning).toBe(true);
  });

  it("renders page content inside the application document", () => {
    render(
      <RootLayout>
        <p>FreshPin content</p>
      </RootLayout>
    );

    expect(screen.getByText("FreshPin content")).toBeInTheDocument();
  });
});
