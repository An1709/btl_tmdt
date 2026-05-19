import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const mlRoot = path.resolve(backendRoot, 'ml');
const statusFilePath = path.resolve(mlRoot, 'model-status.json');
const labelsFilePath = path.resolve(mlRoot, 'labels.json');
const metricsFilePath = path.resolve(mlRoot, 'outputs', 'metrics.json');
const modelFilePath = path.resolve(mlRoot, 'models', 'pet_breed_model.keras');
const datasetTrainPath = path.resolve(mlRoot, 'dataset', 'train');

const PREFIX_SPECIES = {
    cho: 'Chó',
    meo: 'Mèo',
    tho: 'Thỏ',
    hamster: 'Hamster',
    vet: 'Vẹt',
    ca: 'Cá',
};

const defaultStatus = {
    enabled: true,
    mode: 'not_trained',
    modelVersion: 'v0.1',
    classCount: 0,
    labels: [],
    classes: [],
    lastTrainedAt: null,
    accuracy: null,
    dataset: 'Backend/ml/dataset',
    status: 'not_trained',
    metrics: null,
    classSource: 'none',
};

const prettifyWords = (value = '') =>
    value
        .replace(/_/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' ');

export const parsePetVisionClassName = (label, index = 0) => {
    const normalized = String(label || '').trim().replace(/\s+/g, ' ');
    const [prefix, ...rest] = normalized.split(' ');
    const species = PREFIX_SPECIES[prefix?.toLowerCase()];
    const remainder = rest.join(' ');

    if (species && remainder) {
        const breed = prettifyWords(remainder);
        return {
            index,
            label: normalized,
            displayName: `${species} ${breed}`,
            species,
            breed,
        };
    }

    if (species) {
        return {
            index,
            label: normalized,
            displayName: species,
            species,
            breed: '',
        };
    }

    const displayName = prettifyWords(normalized);
    return {
        index,
        label: normalized,
        displayName,
        species: displayName,
        breed: displayName,
    };
};

const normalizeLabelItem = (item, index) => {
    if (typeof item === 'string') {
        return parsePetVisionClassName(item, index);
    }

    const parsed = parsePetVisionClassName(item?.label, Number(item?.index ?? index));
    return {
        ...parsed,
        displayName: item?.displayName || parsed.displayName,
        species: item?.species || parsed.species,
        breed: item?.breed ?? parsed.breed,
    };
};

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
};

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

export const getClassesFromLabels = async () => {
    const data = await readJson(labelsFilePath);
    let classes = Array.isArray(data?.classes) ? data.classes : null;

    if (!classes && data && typeof data === 'object') {
        const numericKeys = Object.keys(data)
            .filter((key) => /^\d+$/.test(key))
            .sort((a, b) => Number(a) - Number(b));
        classes = numericKeys.map((key) => data[key]);
    }

    if (!Array.isArray(classes) || classes.length === 0) return [];
    return classes.map((item, index) => normalizeLabelItem(item, index));
};

export const getClassesFromDataset = async () => {
    const entries = await fs.readdir(datasetTrainPath, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry, index) => parsePetVisionClassName(entry.name, index))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
};

const getClassInfo = async () => {
    try {
        const labelClasses = await getClassesFromLabels();
        if (labelClasses.length > 0) {
            return { classes: labelClasses, source: 'labels.json', metadataError: null };
        }
    } catch (error) {
        try {
            const datasetClasses = await getClassesFromDataset();
            return { classes: datasetClasses, source: 'dataset/train', metadataError: error.message };
        } catch {
            return { classes: [], source: 'none', metadataError: error.message };
        }
    }

    try {
        const datasetClasses = await getClassesFromDataset();
        return { classes: datasetClasses, source: 'dataset/train', metadataError: null };
    } catch {
        return { classes: [], source: 'none', metadataError: null };
    }
};

const getMetrics = async () => {
    try {
        const metrics = await readJson(metricsFilePath);
        return {
            trainAccuracy: typeof metrics.trainAccuracy === 'number' ? metrics.trainAccuracy : null,
            validationAccuracy: typeof metrics.validationAccuracy === 'number' ? metrics.validationAccuracy : null,
            loss: typeof metrics.loss === 'number' ? metrics.loss : null,
            validationLoss: typeof metrics.validationLoss === 'number' ? metrics.validationLoss : null,
            classCount: typeof metrics.classCount === 'number' ? metrics.classCount : null,
            imageCount: metrics.imageCount || null,
            trainedAt: metrics.trainedAt || null,
            model: metrics.model || null,
        };
    } catch {
        return null;
    }
};

export const getModelStatus = async () => {
    let status = defaultStatus;
    let statusReadError = null;

    try {
        status = { ...defaultStatus, ...(await readJson(statusFilePath)) };
    } catch (error) {
        statusReadError = error.message;
        if (error.code !== 'ENOENT') {
            console.error('[PetVisionModel] Cannot read model status:', error.message);
        }
    }

    const modelExists = await fileExists(modelFilePath);
    const metrics = await getMetrics();
    const { classes, source, metadataError } = await getClassInfo();
    const metadataCannotBeRead = Boolean(statusReadError && !metrics && classes.length === 0);
    const resolvedStatus = metadataCannotBeRead
        ? 'failed'
        : modelExists
            ? 'ready'
            : 'not_trained';

    return {
        ...status,
        mode: modelExists ? 'trained' : 'not_trained',
        status: resolvedStatus,
        dataset: 'Backend/ml/dataset',
        modelFile: modelExists ? 'pet_breed_model.keras' : null,
        classSource: source,
        classCount: classes.length || metrics?.classCount || Number(status.classCount) || 0,
        classes,
        labels: classes.length > 0
            ? classes.map((item) => item.displayName)
            : Array.isArray(status.labels) ? status.labels : [],
        lastTrainedAt: metrics?.trainedAt || status.lastTrainedAt || null,
        accuracy: metrics?.validationAccuracy ?? status.accuracy ?? null,
        metrics,
        metadataError: metadataError || statusReadError || null,
    };
};

export const requestTraining = async () => {
    const status = await getModelStatus();

    return {
        success: true,
        message: 'Tính năng huấn luyện trực tiếp chưa được bật. Vui lòng huấn luyện local bằng script ML.',
        manualCommand: 'python Backend/ml/train.py --data Backend/ml/dataset --epochs 10 --batch-size 32',
        status,
    };
};
