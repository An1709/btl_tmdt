import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = 3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const defaultModelPath = path.resolve(backendRoot, 'ml', 'models', 'pet_breed_model.keras');
const defaultLabelsPath = path.resolve(backendRoot, 'ml', 'labels.json');

const SPECIES_CATEGORY_SLUG = {
    Chó: 'dog',
    Mèo: 'cat',
};

const PRODUCT_FIELDS = '_id name slug price images category stock specifications';

const parseJsonOutput = (output) => {
    const trimmed = output.trim();
    if (!trimmed) {
        throw new Error('EMPTY_INFERENCE_OUTPUT');
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    const jsonText = firstBrace >= 0 && lastBrace >= firstBrace
        ? trimmed.slice(firstBrace, lastBrace + 1)
        : trimmed;

    return JSON.parse(jsonText);
};

const normalizePredictionItem = (item) => ({
    label: item.label,
    displayName: item.displayName || item.label,
    species: item.species,
    breed: item.breed || '',
    confidence: Number(item.confidence) || 0,
});

const resolveMlPath = (value, fallback) => {
    if (!value) return fallback;
    return path.isAbsolute(value) ? value : path.resolve(backendRoot, value.replace(/^Backend[\\/]/, ''));
};

const validatePredictionPayload = (payload) => {
    if (!payload?.success) {
        const error = new Error(payload?.message || 'INFERENCE_FAILED');
        error.code = payload?.message || 'INFERENCE_FAILED';
        throw error;
    }

    if (!payload?.prediction) {
        throw new Error('INVALID_INFERENCE_PAYLOAD');
    }

    const { prediction } = payload;
    if (!prediction.label || !prediction.species || typeof prediction.confidence !== 'number') {
        throw new Error('INVALID_PREDICTION_SHAPE');
    }

    const normalized = normalizePredictionItem(prediction);
    return {
        ...normalized,
        topK: Array.isArray(prediction.topK)
            ? prediction.topK.slice(0, 3).map(normalizePredictionItem)
            : [],
    };
};

export const runPetVisionInference = (imagePath) => {
    const pythonBin = process.env.PET_VISION_PYTHON_BIN || 'python';
    const scriptPath = path.resolve(backendRoot, 'ml', 'predict.py');
    const modelPath = resolveMlPath(process.env.PET_VISION_MODEL_PATH, defaultModelPath);
    const labelsPath = resolveMlPath(process.env.PET_VISION_LABELS_PATH, defaultLabelsPath);
    const args = [scriptPath, '--image', imagePath, '--model', modelPath, '--labels', labelsPath];

    return new Promise((resolve, reject) => {
        const child = spawn(pythonBin, args, {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', TF_CPP_MIN_LOG_LEVEL: process.env.TF_CPP_MIN_LOG_LEVEL || '2' },
            shell: false,
            windowsHide: true,
        });

        let stdout = '';
        let stderr = '';
        let settled = false;

        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(new Error('INFERENCE_TIMEOUT'));
        }, DEFAULT_TIMEOUT_MS);

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            reject(error);
        });

        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);

            if (code !== 0) {
                reject(new Error(stderr.trim() || 'INFERENCE_FAILED'));
                return;
            }

            try {
                const payload = parseJsonOutput(stdout);
                resolve(validatePredictionPayload(payload));
            } catch (error) {
                reject(error);
            }
        });
    });
};

export const getSuggestedProductsForSpecies = async (species, limit = DEFAULT_LIMIT) => {
    const categorySlug = SPECIES_CATEGORY_SLUG[species];
    if (!categorySlug) return [];

    const category = await Category.findOne({ slug: categorySlug }).select('_id name slug').lean();
    if (!category) return [];

    const products = await Product.find({ category: category._id })
        .select(PRODUCT_FIELDS)
        .populate('category', 'name slug')
        .sort({ stock: -1, sold: -1, averageRating: -1, createdAt: -1 })
        .limit(Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, DEFAULT_LIMIT)))
        .lean();

    return products.map((product) => ({
        _id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: product.images || [],
        category: product.category,
        stock: product.stock,
        specifications: product.specifications || {},
    }));
};

export const cleanupPetVisionImage = async (imagePath) => {
    if (process.env.PET_VISION_KEEP_UPLOADS === 'true') return;
    if (!imagePath) return;

    try {
        await fs.unlink(imagePath);
    } catch {
        // Temporary cleanup failure should not break the prediction response.
    }
};

export const getPetVisionThreshold = () => {
    const value = Number(process.env.PET_VISION_CONFIDENCE_THRESHOLD);
    return Number.isFinite(value) ? value : 0.55;
};
