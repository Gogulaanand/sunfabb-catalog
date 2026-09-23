import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerifiedProductFacts } from "./VerifiedProductFacts";

describe("VerifiedProductFacts", () => {
  it("renders measured dimensions and the exact recorded set contents", () => {
    render(
      <dl>
        <VerifiedProductFacts
          measuredWidthCm={240.5}
          measuredLengthCm={260}
          setContents="1 bedspread and 2 pillow covers"
        />
      </dl>,
    );

    expect(screen.getByText("240.5 × 260 cm")).toBeInTheDocument();
    expect(
      screen.getByText("1 bedspread and 2 pillow covers"),
    ).toBeInTheDocument();
  });
});
