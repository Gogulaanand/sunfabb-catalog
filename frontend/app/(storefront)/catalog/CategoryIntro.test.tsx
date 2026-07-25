import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryIntro } from "./CategoryIntro";

describe("CategoryIntro", () => {
  it("renders the description when present", () => {
    render(<CategoryIntro description="Cotton bedspreads woven in India." />);
    expect(
      screen.getByText("Cotton bedspreads woven in India."),
    ).toBeInTheDocument();
  });

  it("renders nothing when the description is null", () => {
    const { container } = render(<CategoryIntro description={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the description is undefined", () => {
    const { container } = render(<CategoryIntro description={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the description is whitespace only", () => {
    const { container } = render(<CategoryIntro description={"   \n  "} />);
    expect(container).toBeEmptyDOMElement();
  });
});
