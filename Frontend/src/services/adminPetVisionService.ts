import api from "@/lib/axios";

export interface PetVisionClassInfo {
    index: number;
    label: string;
    displayName: string;
    species: string;
    breed?: string;
}

export interface PetVisionMetrics {
    trainAccuracy: number | null;
    validationAccuracy: number | null;
    loss: number | null;
    validationLoss: number | null;
    classCount: number | null;
    imageCount?: {
        train?: number;
        val?: number;
        total?: number;
    } | null;
    trainedAt: string | null;
    model: string | null;
}

export interface PetVisionModelStatus {
    enabled: boolean;
    mode: string;
    modelVersion: string;
    classCount: number;
    labels: string[];
    classes?: PetVisionClassInfo[];
    lastTrainedAt: string | null;
    accuracy: number | null;
    dataset?: string | null;
    status: string;
    modelFile?: string | null;
    classSource?: string;
    metrics?: PetVisionMetrics | null;
    metadataError?: string | null;
}

export interface PetVisionModelStatusResponse {
    success: boolean;
    status: PetVisionModelStatus;
}

export interface PetVisionTrainResponse {
    success: boolean;
    message: string;
    manualCommand?: string;
    status?: PetVisionModelStatus;
}

export const adminPetVisionService = {
    getStatus: async (): Promise<PetVisionModelStatus> => {
        const response = await api.get<PetVisionModelStatusResponse>("/admin/pet-vision/model/status");
        return response.data.status;
    },

    requestTraining: async (): Promise<PetVisionTrainResponse> => {
        const response = await api.post<PetVisionTrainResponse>("/admin/pet-vision/model/train");
        return response.data;
    },
};
