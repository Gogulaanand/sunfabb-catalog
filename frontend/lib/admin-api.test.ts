import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const getMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: getMock })),
}));

import {
  AdminApiError,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  listColors,
  createColor,
  updateColor,
  deleteColor,
  getAdminProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addImage,
  deleteImage,
  uploadImage,
} from "./admin-api";

describe("admin-api", () => {
  const fetchMock = vi.fn();
  const adminProductFixture = {
    id: "product-1",
    name: "Royal Bedspread",
    slug: "royal-bedspread",
    description: null,
    care_instructions: null,
    category_id: "category-1",
    is_active: true,
    category: { name: "Bedspreads", slug: "bedspreads" },
    variants: [
      {
        id: "variant-1",
        material_id: "material-1",
        color_id: "color-1",
        size: "Queen",
        price: 125000,
        stock_quantity: 4,
        sku: "BSP-QUEEN-RED",
        is_active: true,
        material: { name: "Cotton" },
        color: { name: "Red", hex_code: "#ff0000" },
      },
    ],
    images: [
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        alt_text: null,
        sort_order: 0,
        is_primary: true,
        variant_id: "variant-1",
        image_role: "GALLERY",
      },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getMock.mockReturnValue({ value: "test-jwt" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    getMock.mockReset();
  });

  it("attaches the Authorization header from the admin_token cookie", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await listCategories();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-jwt");
  });

  it("omits Authorization when there is no cookie", async () => {
    getMock.mockReturnValue(undefined);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await listCategories();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws AdminApiError with the response status and message on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "slug already exists" }),
    });

    await expect(createCategory({ name: "Bedspreads", slug: "bedspreads" })).rejects.toMatchObject({
      status: 400,
      message: "slug already exists",
    });
  });

  it("preserves Nest validation message arrays on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        message: [
          "variant_id must be a UUID",
          "image_role must be one of the following values: GALLERY, SWATCH",
        ],
      }),
    });

    await expect(
      createCategory({ name: "Bedspreads", slug: "bedspreads" }),
    ).rejects.toMatchObject({
      status: 400,
      message:
        "variant_id must be a UUID; image_role must be one of the following values: GALLERY, SWATCH",
    });
  });

  it("falls back to statusText when the error body isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    const error = (await createCategory({ name: "x", slug: "x" }).catch((e) => e)) as AdminApiError;
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error.status).toBe(500);
  });

  it("returns undefined for 204 No Content responses", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    await expect(deleteCategory("1")).resolves.toBeUndefined();
  });

  it.each([
    ["updateCategory", () => updateCategory("1", { name: "x" }), "/categories/1", "PATCH"],
    ["listMaterials", () => listMaterials(), "/materials", "GET"],
    ["createMaterial", () => createMaterial({ name: "Cotton" }), "/materials", "POST"],
    ["updateMaterial", () => updateMaterial("1", { name: "x" }), "/materials/1", "PATCH"],
    ["deleteMaterial", () => deleteMaterial("1"), "/materials/1", "DELETE"],
    ["listColors", () => listColors(), "/colors", "GET"],
    ["createColor", () => createColor({ name: "Indigo" }), "/colors", "POST"],
    ["updateColor", () => updateColor("1", { name: "x" }), "/colors/1", "PATCH"],
    ["deleteColor", () => deleteColor("1"), "/colors/1", "DELETE"],
    ["getAdminProducts", () => getAdminProducts(), "/products/admin?limit=100", "GET"],
    [
      "createProduct",
      () => createProduct({ name: "x", slug: "x", category_id: "1" }),
      "/products",
      "POST",
    ],
    ["updateProduct", () => updateProduct("1", { name: "x" }), "/products/1", "PATCH"],
    ["deleteProduct", () => deleteProduct("1"), "/products/1", "DELETE"],
    [
      "addVariant",
      () =>
        addVariant("1", {
          material_id: "1",
          color_id: "1",
          size: "M",
          price: 100,
          stock_quantity: 1,
          sku: "SKU-1",
        }),
      "/products/1/variants",
      "POST",
    ],
    ["updateVariant", () => updateVariant("1", { price: 200 }), "/variants/1", "PATCH"],
    ["deleteVariant", () => deleteVariant("1"), "/variants/1", "DELETE"],
    ["addImage", () => addImage("1", { url: "https://x" }), "/products/1/images", "POST"],
    ["deleteImage", () => deleteImage("1"), "/images/1", "DELETE"],
  ] as const)("%s calls %s with method %s", async (_name, fn, path, method) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await fn();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(path);
    expect(init.method ?? "GET").toBe(method);
  });

  it("runtime-validates the admin product detail response", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => adminProductFixture });

    await expect(getAdminProduct("royal-bedspread")).resolves.toEqual(adminProductFixture);
  });

  it("rejects an admin product detail response with malformed image metadata", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...adminProductFixture,
        images: [{ ...adminProductFixture.images[0], image_role: "THUMBNAIL" }],
      }),
    });

    await expect(getAdminProduct("royal-bedspread")).rejects.toThrow();
  });

  it("uploadImage sends multipart form data with the bearer token, no Content-Type override", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: "x", public_id: "y" }) });
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await uploadImage(file);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/admin/images/upload");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-jwt");
  });

  it("uploadImage throws AdminApiError on failure", async () => {
    getMock.mockReturnValue(undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      json: async () => ({ message: "file too large" }),
    });

    await expect(uploadImage(new File(["x"], "a.jpg"))).rejects.toMatchObject({ status: 413 });
  });
});
