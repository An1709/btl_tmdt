/**
 * @deprecated Kept for backwards-compatibility only.
 * Import types and petCategories from "@/types/product" instead.
 * No page component should import fakeProducts for data anymore.
 */
export type { Product, PetCategory, ProductCategory, ProductBadge } from "@/types/product";
export { petCategories } from "@/types/product";

// Empty shim — real data comes from the API via productService.
export const fakeProducts: import("@/types/product").Product[] = [];
