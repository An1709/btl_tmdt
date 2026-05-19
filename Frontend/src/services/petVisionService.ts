import api from "@/lib/axios";

export interface PetVisionPredictionItem {
    label: string;
    displayName?: string;
    species: string;
    breed?: string;
    confidence: number;
    confidencePercent?: number;
    isLowConfidence?: boolean;
}

export interface PetVisionPrediction extends PetVisionPredictionItem {
    topK: PetVisionPredictionItem[];
}

export interface PetVisionSuggestedProduct {
    _id: string;
    name: string;
    slug?: string;
    price: number;
    images?: string[];
    category?: {
        _id?: string;
        name?: string;
        slug?: string;
    };
    stock?: number;
    specifications?: Record<string, string>;
}

export interface PetVisionResponse {
    success: boolean;
    prediction: PetVisionPrediction;
    suggestedProducts: PetVisionSuggestedProduct[];
    confidenceThreshold?: number;
    message?: string;
    warning?: string;
}

export const petVisionService = {
    predict: async (image: File): Promise<PetVisionResponse> => {
        const formData = new FormData();
        formData.append("image", image);

        const response = await api.post<PetVisionResponse>("/pet-vision/predict", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return response.data;
    },
};
