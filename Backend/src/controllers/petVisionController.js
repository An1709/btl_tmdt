import {
    cleanupPetVisionImage,
    getPetVisionThreshold,
    getSuggestedProductsForSpecies,
    runPetVisionInference,
} from '../services/petVisionService.js';

const getPredictionErrorMessage = (error) => {
    const code = error?.code || error?.message;

    if (
        code === 'MODEL_NOT_FOUND'
        || code === 'LABELS_NOT_FOUND'
        || code === 'INVALID_LABELS'
        || code === 'TENSORFLOW_NOT_INSTALLED'
    ) {
        return {
            status: 503,
            code: 'MODEL_NOT_READY',
            message: 'Mô hình nhận diện chưa sẵn sàng. Vui lòng huấn luyện mô hình trước.',
        };
    }

    return {
        status: 500,
        code: 'INFERENCE_FAILED',
        message: 'Không thể nhận diện ảnh. Vui lòng thử lại.',
    };
};

const normalizeApiPrediction = (prediction, confidenceThreshold) => {
    const confidence = Number(prediction.confidence) || 0;
    return {
        ...prediction,
        confidence,
        confidencePercent: Math.round(confidence * 10000) / 100,
        topK: Array.isArray(prediction.topK) ? prediction.topK : [],
        isLowConfidence: confidence < confidenceThreshold,
    };
};

export const predictPet = async (req, res) => {
    if (process.env.PET_VISION_ENABLED === 'false') {
        return res.status(503).json({
            success: false,
            message: 'Tính năng nhận diện thú cưng đang tạm tắt.',
        });
    }

    const uploadedPath = req.file?.path;

    if (!uploadedPath) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng tải lên ảnh thú cưng.',
        });
    }

    try {
        const confidenceThreshold = getPetVisionThreshold();
        const rawPrediction = await runPetVisionInference(uploadedPath);
        const prediction = normalizeApiPrediction(rawPrediction, confidenceThreshold);
        const suggestedProducts = await getSuggestedProductsForSpecies(prediction.species, 3);
        const message = prediction.isLowConfidence
            ? 'Mình chưa đủ chắc chắn về giống thú cưng này. Bạn có thể thử ảnh rõ hơn.'
            : 'Nhận diện thành công.';

        return res.json({
            success: true,
            prediction,
            confidenceThreshold,
            message,
            warning: prediction.isLowConfidence ? message : undefined,
            suggestedProducts,
        });
    } catch (error) {
        console.error('[PetVision] Prediction failed:', error?.message || error);
        const response = getPredictionErrorMessage(error);
        return res.status(response.status).json({
            success: false,
            code: response.code,
            message: response.message,
        });
    } finally {
        await cleanupPetVisionImage(uploadedPath);
    }
};
