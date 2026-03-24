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

// Static category list — used by ProductFilter and HomePage
export const petCategories: PetCategory[] = [
    { id: "all", label: "Tất Cả", emoji: "🐾" },
    { id: "dog", label: "Chó", emoji: "🐕" },
    { id: "cat", label: "Mèo", emoji: "🐈" },
    { id: "rabbit", label: "Thỏ", emoji: "🐇" },
    { id: "hamster", label: "Hamster", emoji: "🐹" },
    { id: "parrot", label: "Vẹt", emoji: "🦜" },
    { id: "fish", label: "Cá", emoji: "🐟" },
    { id: "accessory", label: "Phụ Kiện", emoji: "🛍️" },
];
