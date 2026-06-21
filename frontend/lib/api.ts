const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export interface Material {
  id: number;
  name: string;
}

export interface Color {
  id: number;
  name: string;
  hex_code: string;
}

export interface ProductVariant {
  id: number;
  size: string | null;
  price: number; // paise
  stock: number;
  material: Material | null;
  color: Color | null;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: Category;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: Category;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductsResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductsQuery {
  categorySlug?: string;
  materialId?: number;
  colorId?: number;
  sortBy?: 'name' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export function formatPrice(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json() as Promise<Category[]>;
}

export async function getMaterials(): Promise<Material[]> {
  const res = await fetch(`${API_BASE}/materials`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Failed to fetch materials');
  return res.json() as Promise<Material[]>;
}

export async function getColors(): Promise<Color[]> {
  const res = await fetch(`${API_BASE}/colors`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Failed to fetch colors');
  return res.json() as Promise<Color[]>;
}

export async function getProducts(query: ProductsQuery = {}): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (query.categorySlug) params.set('categorySlug', query.categorySlug);
  if (query.materialId !== undefined) params.set('materialId', String(query.materialId));
  if (query.colorId !== undefined) params.set('colorId', String(query.colorId));
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));

  const url = `${API_BASE}/products${params.size > 0 ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json() as Promise<ProductsResponse>;
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${slug}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Failed to fetch product: ${slug}`);
  return res.json() as Promise<Product>;
}
