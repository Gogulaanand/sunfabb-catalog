import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/ui/provider";
import { CategoriesClient } from "./categories-client";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const createCategoryAction = vi.fn();
vi.mock("./actions", () => ({
  createCategoryAction: (...args: unknown[]) => createCategoryAction(...args),
  updateCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
}));

const categories = [
  { id: 1, name: "Bedspreads", slug: "bedspreads", description: "Cozy", image_url: null },
];

function renderClient() {
  return render(
    <Provider>
      <CategoriesClient categories={categories} />
    </Provider>
  );
}

describe("CategoriesClient", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createCategoryAction.mockClear();
  });

  it("renders existing categories in the table", () => {
    renderClient();
    expect(screen.getByText("Bedspreads")).toBeInTheDocument();
    expect(screen.getByText("bedspreads")).toBeInTheDocument();
  });

  it("blocks submission when name/slug are missing (native required validation)", async () => {
    const user = userEvent.setup();
    renderClient();
    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));

    // jsdom enforces the inputs' `required` attribute, so the form's onSubmit
    // handler (and its own name/slug guard) never even runs.
    expect(createCategoryAction).not.toHaveBeenCalled();
  });

  it("submits the form and refreshes on success", async () => {
    createCategoryAction.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.type(await screen.findByLabelText("Name"), "Towels");
    await user.type(screen.getByLabelText("Slug"), "towels");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(createCategoryAction).toHaveBeenCalledWith({
        name: "Towels",
        slug: "towels",
        description: undefined,
        image_url: undefined,
      })
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("surfaces the server error and does not refresh on failure", async () => {
    createCategoryAction.mockResolvedValue({ ok: false, error: "slug already exists" });
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.type(await screen.findByLabelText("Name"), "Towels");
    await user.type(screen.getByLabelText("Slug"), "bedspreads");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("slug already exists")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
