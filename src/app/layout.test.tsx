import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders page content inside the application document", () => {
    render(
      <RootLayout>
        <p>FreshPin content</p>
      </RootLayout>
    );

    expect(screen.getByText("FreshPin content")).toBeInTheDocument();
  });
});
