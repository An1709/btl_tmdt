import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
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

/** Port the Python inference HTTP server listens on (localhost only). */
const INFERENCE_SERVER_PORT = Number(process.env.PET_VISION_SERVER_PORT) || 5002;
const INFERENCE_SERVER_HOST = '127.0.0.1';

let runtimeDiagnosticsLogged = false;
let pythonDiagnosticsPromise = null;

// ---------------------------------------------------------------------------
// Inference server state
// ---------------------------------------------------------------------------

/** @type {'stopped' | 'starting' | 'ready' | 'failed'} */
let _inferenceServerState = 'stopped';
/** Resolves when the server is ready (or rejects if startup fails). */
let _inferenceServerReadyPromise = null;
let _inferenceServerProcess = null;

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

// ---------------------------------------------------------------------------
// Inference server lifecycle
// ---------------------------------------------------------------------------

/**
 * Returns the current state of the Python inference server.
 * @returns {{ state: string, port: number, host: string }}
 */
export const getInferenceServerState = () => ({
    state: _inferenceServerState,
    port: INFERENCE_SERVER_PORT,
    host: INFERENCE_SERVER_HOST,
});

/**
 * Probe the /health endpoint of the inference server.
 * Resolves true if healthy, false otherwise.
 */
export const probeInferenceServerHealth = () => new Promise((resolve) => {
    const req = http.request(
        {
            host: INFERENCE_SERVER_HOST,
            port: INFERENCE_SERVER_PORT,
            path: '/health',
            method: 'GET',
            timeout: 2000,
        },
        (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.status === 'ok');
                } catch {
                    resolve(res.statusCode === 200);
                }
            });
        },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
});

/**
 * Start the Python inference server (predict.py --serve).
 * The server loads the model once, runs a warmup prediction, then listens on
 * INFERENCE_SERVER_PORT. The returned promise resolves when the server signals
 * readiness (prints a JSON {"event":"server_ready"} line to stdout).
 *
 * If the server is already starting or ready, the same promise is returned.
 */
export const startInferenceServer = () => {
    if (_inferenceServerReadyPromise) return _inferenceServerReadyPromise;

    const readiness = getPetVisionReadiness();
    if (!readiness.ready) {
        const reason = readiness.unavailableReason;
        _inferenceServerState = 'failed';
        return Promise.reject(
            new PetVisionUnavailableError(reason.code, reason.message, {
                modelPath: readiness.modelPath,
                labelsPath: readiness.labelsPath,
            }),
        );
    }

    _inferenceServerState = 'starting';

    _inferenceServerReadyPromise = new Promise((resolve, reject) => {
        const { pythonBin, modelPath, labelsPath } = readiness;
        const scriptPath = path.resolve(backendRoot, 'ml', 'predict.py');
        const args = [
            scriptPath,
            '--serve',
            '--host', INFERENCE_SERVER_HOST,
            '--port', String(INFERENCE_SERVER_PORT),
            '--model', modelPath,
            '--labels', labelsPath,
        ];

        console.info('[PetVision:server] Starting inference server…', {
            pythonBin,
            port: INFERENCE_SERVER_PORT,
            modelPath,
            labelsPath,
        });

        const child = spawn(pythonBin, args, {
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                TF_CPP_MIN_LOG_LEVEL: process.env.TF_CPP_MIN_LOG_LEVEL || '2',
            },
            shell: false,
            windowsHide: true,
        });

        _inferenceServerProcess = child;
        let settled = false;
        let stdoutBuffer = '';

        // Startup timeout: 3 minutes (model loading + warmup can be slow)
        const STARTUP_TIMEOUT_MS = Number(process.env.PET_VISION_SERVER_STARTUP_TIMEOUT_MS) || 180000;
        const startupTimeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            _inferenceServerState = 'failed';
            child.kill('SIGKILL');
            reject(new Error('INFERENCE_SERVER_STARTUP_TIMEOUT'));
        }, STARTUP_TIMEOUT_MS);

        child.stdout.on('data', (chunk) => {
            stdoutBuffer += chunk.toString();
            // Parse newline-delimited JSON lines from stdout
            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() ?? '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.event === 'server_ready' && !settled) {
                        settled = true;
                        clearTimeout(startupTimeout);
                        _inferenceServerState = 'ready';
                        console.info('[PetVision:server] Inference server ready.', {
                            port: msg.port,
                            classCount: msg.classCount,
                        });
                        resolve({ port: msg.port, host: msg.host, classCount: msg.classCount });
                    }
                } catch {
                    // Not JSON — log and continue
                    console.info('[PetVision:server:stdout]', trimmed);
                }
            }
        });

        child.stderr.on('data', (chunk) => {
            const text = chunk.toString().trim();
            if (text) console.info('[PetVision:server:stderr]', text);
        });

        child.on('error', (error) => {
            if (!settled) {
                settled = true;
                clearTimeout(startupTimeout);
                _inferenceServerState = 'failed';
                _inferenceServerReadyPromise = null;
                _inferenceServerProcess = null;
                reject(error);
            } else {
                console.error('[PetVision:server] Process error after startup:', error.message);
                _inferenceServerState = 'failed';
                _inferenceServerProcess = null;
                _inferenceServerReadyPromise = null;
            }
        });

        child.on('close', (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(startupTimeout);
                _inferenceServerState = 'failed';
                _inferenceServerReadyPromise = null;
                _inferenceServerProcess = null;
                reject(new Error(`INFERENCE_SERVER_EXITED_CODE_${code ?? 'null'}`));
            } else {
                console.warn(`[PetVision:server] Inference server exited (code ${code}). Restarting on next request.`);
                _inferenceServerState = 'stopped';
                _inferenceServerProcess = null;
                _inferenceServerReadyPromise = null;
            }
        });
    });

    return _inferenceServerReadyPromise;
};

/**
 * Ensure the inference server is running and healthy.
 * If not started, starts it. If started but unhealthy, resets and restarts.
 * Returns a promise that resolves when ready.
 */
export const ensureInferenceServerReady = async () => {
    if (_inferenceServerState === 'ready') {
        const healthy = await probeInferenceServerHealth();
        if (healthy) return getInferenceServerState();
        // Server process died without triggering 'close' event — reset
        console.warn('[PetVision:server] Health check failed; resetting and restarting server.');
        _inferenceServerState = 'stopped';
        _inferenceServerProcess = null;
        _inferenceServerReadyPromise = null;
    }

    return startInferenceServer();
};
