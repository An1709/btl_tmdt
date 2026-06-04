import {
    cleanupPetVisionImage,
    getPetVisionThreshold,
    getSuggestedProductsForPrediction,
    runPetVisionInference,
} from '../services/petVisionService.js';
import { PetVisionUnavailableError } from '../services/petVisionRuntime.js';

const getPredictionErrorMessage = (error) => {
    const code = error?.code || error?.message;

    if (error instanceof PetVisionUnavailableError) {
        return {
            status: error.statusCode || 503,
            code,
            message: code === 'PET_VISION_DISABLED'
                ? 'Tính năng nhận diện thú cưng đang tạm tắt.'
                : 'Mô hình nhận diện chưa sẵn sàng. Vui lòng kiểm tra cấu hình Pet Vision.',
            details: error.details,
        };
    }

    if (code === 'TENSORFLOW_NOT_INSTALLED' || code === 'PYTHON_DEPENDENCY_MISSING') {
        return {
            status: 503,
            code,
            message: 'MÃ´ hÃ¬nh nháº­n diá»‡n chÆ°a sáºµn sÃ ng. Vui lÃ²ng kiá»ƒm tra Python dependencies.',
        };
    }

    if (
        code === 'INFERENCE_TIMEOUT'
        || code === 'PYTHON_PROCESS_FAILED'
        || code === 'PYTHON_JSON_PARSE_FAILED'
        || code === 'MODEL_LOAD_FAILED'
        || code === 'IMAGE_PREPROCESS_FAILED'
    ) {
        return {
            status: 503,
            code,
            message: 'KhÃ´ng thá»ƒ nháº­n diá»‡n áº£nh. Vui lÃ²ng kiá»ƒm tra logs Pet Vision.',
            details: error?.details,
        };
    }

    if (
        code === 'MODEL_NOT_FOUND'
        || code === 'LABELS_NOT_FOUND'
        || code === 'INVALID_LABELS'
        || code === 'PYTHON_NOT_AVAILABLE'
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
        const {
            products: suggestedProducts,
            recommendationNote,
        } = await getSuggestedProductsForPrediction(prediction, 3);
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
            recommendationNote,
        });
    } catch (error) {
        console.error('[PetVision] Prediction failed:', {
            code: error?.code,
            message: error?.message,
            details: error?.details,
        });
        const response = getPredictionErrorMessage(error);
        return res.status(response.status).json({
            success: false,
            code: response.code,
            message: response.message,
            details: response.details,
        });
    } finally {
        await cleanupPetVisionImage(uploadedPath);
    }
};
