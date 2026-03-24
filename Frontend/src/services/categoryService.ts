import api from "@/lib/axios";

export interface DbCategory {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    description?: string;
}

// Module-level session cache
let categoryCache: DbCategory[] | null = null;

const fetchAll = async (): Promise<DbCategory[]> => {
    const res = await api.get<DbCategory[]>("/categories");
    categoryCache = res.data;
    return categoryCache;
};

export const categoryService = {
    /** Returns all DB categories. Result is cached for the page session. */
    getAll: async (): Promise<DbCategory[]> => {
        if (categoryCache) return categoryCache;
        return fetchAll();
    },

    /**
     * Resolves a category slug/name to its MongoDB ObjectId string.
     * Returns `null` when the slug cannot be matched — callers should
     * skip the category filter in that case rather than sending an
     * unresolvable string (which causes a Mongoose CastError → 500).
     */
    resolveId: async (slugOrName: string): Promise<string | null> => {
        const categories = await categoryService.getAll();
        const lower = slugOrName.toLowerCase();
        const match = categories.find(
            (c) => c.slug === lower || c.slug === slugOrName || c.name.toLowerCase() === lower,
        );
        return match ? match._id : null;
    },
};
