import { getModelStatus, requestTraining } from '../services/petVisionModelService.js';

export const getPetVisionModelStatus = async (req, res) => {
    try {
        const status = await getModelStatus();
        res.json({
            success: true,
            status,
        });
    } catch (error) {
        console.error('[AdminPetVision] Status failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể tải trạng thái mô hình. Vui lòng thử lại.',
        });
    }
};

export const trainPetVisionModel = async (req, res) => {
    try {
        const result = await requestTraining();
        res.json(result);
    } catch (error) {
        console.error('[AdminPetVision] Train request failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể gửi yêu cầu huấn luyện. Vui lòng thử lại.',
        });
    }
};
