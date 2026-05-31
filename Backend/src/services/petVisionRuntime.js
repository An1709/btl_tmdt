import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const backendRoot = path.resolve(__dirname, '..', '..');
const backendFolderName = path.basename(backendRoot).toLowerCase();

const DEFAULT_MODEL_PATH = path.resolve(backendRoot, 'ml', 'models', 'pet_breed_model.keras');
const DEFAULT_LABELS_PATH = path.resolve(backendRoot, 'ml', 'labels.json');
const DEFAULT_UPLOAD_DIR = path.resolve(backendRoot, 'uploads', 'pet-vision', 'tmp');
const PYTHON_DIAGNOSTIC_TIMEOUT_MS = 5000;

let runtimeDiagnosticsLogged = false;
let pythonDiagnosticsPromise = null;

export class PetVisionUnavailableError extends Error {
    constructor(code, message, details = {}, statusCode = 503) {
        super(message);
        this.name = 'PetVisionUnavailableError';
        this.code = code;
        this.details = details;
        this.statusCode = statusCode;
    }
}

const normalizeEnvPath = (value) => String(value || '').trim().replace(/^["']|["']$/g, '');

export const resolvePetVisionPath = (rawValue, fallback) => {
    const value = normalizeEnvPath(rawValue);
    if (!value) return fallback;
    if (path.isAbsolute(value)) return path.normalize(value);

    const normalized = path.normalize(value);
    const segments = normalized.split(/[\\/]+/).filter(Boolean);
    const withoutBackendPrefix = segments[0]?.toLowerCase() === backendFolderName
        ? path.join(...segments.slice(1))
        : normalized;

    return path.resolve(backendRoot, withoutBackendPrefix);
};

export const getPetVisionRuntimeConfig = () => ({
    enabled: process.env.PET_VISION_ENABLED !== 'false',
    rawEnabled: process.env.PET_VISION_ENABLED,
    rawModelPath: process.env.PET_VISION_MODEL_PATH,
    rawLabelsPath: process.env.PET_VISION_LABELS_PATH,
    rawUploadDir: process.env.PET_VISION_UPLOAD_DIR,
    rawPythonBin: process.env.PET_VISION_PYTHON_BIN,
    pythonBin: process.env.PET_VISION_PYTHON_BIN || 'python',
    modelPath: resolvePetVisionPath(process.env.PET_VISION_MODEL_PATH, DEFAULT_MODEL_PATH),
    labelsPath: resolvePetVisionPath(process.env.PET_VISION_LABELS_PATH, DEFAULT_LABELS_PATH),
    uploadDir: resolvePetVisionPath(process.env.PET_VISION_UPLOAD_DIR, DEFAULT_UPLOAD_DIR),
});

export const fileExistsSync = (filePath) => {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
};

export const dirExistsSync = (dirPath) => {
    try {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
};

export const getPetVisionReadiness = () => {
    const config = getPetVisionRuntimeConfig();
    const modelExists = fileExistsSync(config.modelPath);
    const labelsExists = fileExistsSync(config.labelsPath);
    const uploadDirExists = dirExistsSync(config.uploadDir);

    let unavailableReason = null;
    if (!config.enabled) {
        unavailableReason = {
            code: 'PET_VISION_DISABLED',
            message: 'Pet Vision is disabled by PET_VISION_ENABLED.',
        };
    } else if (!modelExists) {
        unavailableReason = {
            code: 'MODEL_NOT_FOUND',
            missingFileType: 'model',
            resolvedPath: config.modelPath,
            message: 'Pet Vision model file is missing.',
        };
    } else if (!labelsExists) {
        unavailableReason = {
            code: 'LABELS_NOT_FOUND',
            missingFileType: 'labels',
            resolvedPath: config.labelsPath,
            message: 'Pet Vision labels file is missing.',
        };
    }

    return {
        ...config,
        modelExists,
        labelsExists,
        uploadDirExists,
        ready: !unavailableReason,
        unavailableReason,
    };
};

const getSafeReadinessLog = (readiness) => ({
    cwd: process.cwd(),
    PET_VISION_ENABLED: readiness.rawEnabled,
    PET_VISION_MODEL_PATH: readiness.rawModelPath,
    PET_VISION_LABELS_PATH: readiness.rawLabelsPath,
    PET_VISION_UPLOAD_DIR: readiness.rawUploadDir,
    PET_VISION_PYTHON_BIN: readiness.rawPythonBin,
    resolvedModelPath: readiness.modelPath,
    modelFileExists: readiness.modelExists,
    resolvedLabelsPath: readiness.labelsPath,
    labelsFileExists: readiness.labelsExists,
    resolvedUploadDir: readiness.uploadDir,
    uploadDirExists: readiness.uploadDirExists,
});

export const logPetVisionRuntimeDiagnosticsOnce = () => {
    if (runtimeDiagnosticsLogged) return getPetVisionReadiness();

    const readiness = getPetVisionReadiness();
    runtimeDiagnosticsLogged = true;
    console.info('[PetVision:runtime]', getSafeReadinessLog(readiness));
    return readiness;
};

export const ensurePetVisionReady = () => {
    const readiness = logPetVisionRuntimeDiagnosticsOnce();

    if (readiness.ready) return readiness;

    const reason = readiness.unavailableReason;
    throw new PetVisionUnavailableError(
        reason.code,
        reason.message,
        {
            missingFileType: reason.missingFileType,
            resolvedPath: reason.resolvedPath,
            modelPath: readiness.modelPath,
            labelsPath: readiness.labelsPath,
        },
    );
};

const runPythonVersionCheck = (pythonBin) => new Promise((resolve) => {
    const child = spawn(pythonBin, ['--version'], {
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
        resolve({
            pythonBin,
            versionCheckSucceeded: false,
            stdout,
            stderr: stderr || 'Timed out running --version',
        });
    }, PYTHON_DIAGNOSTIC_TIMEOUT_MS);

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
        resolve({
            pythonBin,
            versionCheckSucceeded: false,
            stdout,
            stderr,
            errorName: error.name,
            errorCode: error.code,
            errorMessage: error.message,
        });
    });

    child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({
            pythonBin,
            versionCheckSucceeded: code === 0,
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
        });
    });
});

export const logPetVisionPythonDiagnosticsOnce = async () => {
    if (!pythonDiagnosticsPromise) {
        const { pythonBin } = getPetVisionRuntimeConfig();
        pythonDiagnosticsPromise = runPythonVersionCheck(pythonBin).then((diagnostics) => {
            console.info('[PetVision:python]', diagnostics);
            return diagnostics;
        });
    }

    return pythonDiagnosticsPromise;
};

export const ensurePetVisionPythonAvailable = async () => {
    const diagnostics = await logPetVisionPythonDiagnosticsOnce();

    if (diagnostics.versionCheckSucceeded) return diagnostics;

    throw new PetVisionUnavailableError(
        'PYTHON_NOT_AVAILABLE',
        'Configured Pet Vision Python binary is unavailable.',
        {
            pythonBin: diagnostics.pythonBin,
            stdout: diagnostics.stdout,
            stderr: diagnostics.stderr,
            errorCode: diagnostics.errorCode,
        },
    );
};
