import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import {
    backendRoot,
    ensurePetVisionPythonAvailable,
    ensurePetVisionReady,
} from './petVisionRuntime.js';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = 3;

const SPECIES_MATCHERS = {
    Chó: {
        exactTerms: ['chó', 'cún'],
        normalizedTerms: ['dog', 'puppy'],
    },
    Mèo: {
        exactTerms: ['mèo'],
        normalizedTerms: ['meo', 'cat', 'kitten'],
    },
};

const PRODUCT_FIELDS = '_id name slug price images category stock specifications description sold views averageRating reviewCount';

const normalizeText = (value = '') => String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const includesSpeciesTerm = (value, matcher) => {
    const rawValue = String(value || '').toLowerCase();
    const normalizedValue = normalizeText(value);

    return matcher.exactTerms.some((term) => rawValue.includes(term))
        || matcher.normalizedTerms.some((term) => normalizedValue.includes(normalizeText(term)));
};

const getSpecificationText = (specifications = {}) => {
    if (specifications instanceof Map) {
        return [...specifications.entries()].map(([key, value]) => `${key} ${value}`).join(' ');
    }

    if (typeof specifications === 'object' && specifications !== null) {
        return Object.entries(specifications).map(([key, value]) => `${key} ${value}`).join(' ');
    }

    return '';
};

const getCategoryText = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;

    return [
        category.name,
        category.slug,
        category.description,
    ].filter(Boolean).join(' ');
};

const getProductSpeciesScore = (product, matcher, matchedCategoryIds) => {
    const categoryId = String(product.category?._id || product.category || '');
    const categoryText = getCategoryText(product.category);
    const nameText = product.name || '';
    const descriptionText = product.description || '';
    const specificationText = getSpecificationText(product.specifications);

    let score = 0;
    if (categoryId && matchedCategoryIds.has(categoryId)) score += 80;
    if (includesSpeciesTerm(categoryText, matcher)) score += 80;
    if (includesSpeciesTerm(nameText, matcher)) score += 45;
    if (includesSpeciesTerm(specificationText, matcher)) score += 25;
    if (includesSpeciesTerm(descriptionText, matcher)) score += 15;

    return score;
};

const getPopularityScore = (product) => (
    (Number(product.averageRating) || 0) * 5
    + (Number(product.reviewCount) || 0) * 2
    + (Number(product.sold) || 0)
    + (Number(product.views) || 0) * 0.05
);

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

export const runPetVisionInference = async (imagePath) => {
    const readiness = ensurePetVisionReady();
    await ensurePetVisionPythonAvailable();

    const pythonBin = readiness.pythonBin;
    const scriptPath = path.resolve(backendRoot, 'ml', 'predict.py');
    const args = [scriptPath, '--image', imagePath, '--model', readiness.modelPath, '--labels', readiness.labelsPath];

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
                if (stderr.trim()) {
                    console.error('[PetVision] Inference diagnostics:', stderr.trim());
                }
                const payload = parseJsonOutput(stdout);
                resolve(validatePredictionPayload(payload));
            } catch (error) {
                reject(error);
            }
        });
    });
};

export const getSuggestedProductsForSpecies = async (species, limit = DEFAULT_LIMIT) => {
    const matcher = SPECIES_MATCHERS[species];
    if (!matcher) return [];

    const categories = await Category.find().select('_id name slug description').lean();
    const matchedCategoryIds = new Set(
        categories
            .filter((category) => includesSpeciesTerm(getCategoryText(category), matcher))
            .map((category) => String(category._id)),
    );

    const candidates = await Product.find({})
        .select(PRODUCT_FIELDS)
        .populate('category', 'name slug')
        .sort({ stock: -1, averageRating: -1, reviewCount: -1, sold: -1, views: -1, createdAt: -1 })
        .limit(500)
        .lean();

    const scoredProducts = candidates
        .map((product) => ({
            product,
            score: getProductSpeciesScore(product, matcher, matchedCategoryIds),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
            const stockDelta = Number(b.product.stock > 0) - Number(a.product.stock > 0);
            if (stockDelta !== 0) return stockDelta;

            if (b.score !== a.score) return b.score - a.score;

            return getPopularityScore(b.product) - getPopularityScore(a.product);
        });

    const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, DEFAULT_LIMIT));
    const products = scoredProducts.slice(0, safeLimit).map(({ product }) => product);

    if (process.env.NODE_ENV !== 'production') {
        console.info('[PetVision:suggestions]', {
            species,
            matchedCategoryCount: matchedCategoryIds.size,
            matchedProductCount: scoredProducts.length,
            returnedProductCount: products.length,
        });
    }

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
