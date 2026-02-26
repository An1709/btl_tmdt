export type ProductCategory = "dog" | "cat" | "rabbit" | "hamster" | "parrot" | "fish" | "accessory";
export type ProductBadge = "new" | "hot" | "sale";

export interface Product {
    id: string;
    name: string;
    breed: string;
    age: string;
    price: number;
    originalPrice?: number;
    image: string;
    category: ProductCategory;
    rating: number;
    reviewCount: number;
    badge?: ProductBadge;
    description: string;
    inStock: boolean;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface PetCategory {
    id: string;
    label: string;
    emoji: string;
}