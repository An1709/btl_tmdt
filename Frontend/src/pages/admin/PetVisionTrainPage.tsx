import { useEffect, useMemo, useState } from "react";
import { adminPetVisionService, type PetVisionClassInfo, type PetVisionModelStatus } from "@/services/adminPetVisionService";
import { formatDateTime } from "@/utils/format";

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể tải trạng thái mô hình. Vui lòng thử lại.";

const statusLabel: Record<string, string> = {
    not_trained: "Chưa huấn luyện",
    training_requested: "Đã yêu cầu huấn luyện",
    training: "Đang huấn luyện",
    trained: "Đã huấn luyện",
    ready: "Đã huấn luyện",
    failed: "Lỗi mô hình",
};

const statusBadgeClass: Record<string, string> = {
    ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    trained: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    training: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    training_requested: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    failed: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300",
    not_trained: "bg-muted text-muted-foreground",
};

const formatPercent = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "Chưa có";
    return `${(value * 100).toFixed(2)}%`;
};

const formatNumber = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "Chưa có";
    return value.toFixed(4);
};

const formatTrainingDate = (value: string | null | undefined) => value ? formatDateTime(value) : "Chưa có";

const getClassList = (status: PetVisionModelStatus): PetVisionClassInfo[] => {
    if (Array.isArray(status.classes) && status.classes.length > 0) return status.classes;
    return status.labels.map((label, index) => ({
        index,
        label,
        displayName: label,
        species: label.startsWith("Chó") ? "Chó" : label.startsWith("Mèo") ? "Mèo" : label,
        breed: label.replace(/^Chó\s+|^Mèo\s+/, ""),
    }));
};

const PetVisionTrainPage = () => {
    const [status, setStatus] = useState<PetVisionModelStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [manualCommand, setManualCommand] = useState("");

    useEffect(() => {
        let cancelled = false;

        adminPetVisionService.getStatus()
            .then((modelStatus) => {
                if (!cancelled) {
                    setStatus(modelStatus);
                    setError("");
                }
            })
            .catch((requestError) => {
                if (!cancelled) setError(getErrorMessage(requestError));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const classList = useMemo(() => status ? getClassList(status) : [], [status]);

    const cards = useMemo(() => {
        if (!status) return [];

        return [
            { label: "Trạng thái mô hình", value: statusLabel[status.status] ?? status.status },
            { label: "Phiên bản mô hình", value: status.modelVersion || "Chưa có" },
            { label: "File mô hình", value: status.modelFile || "Chưa có" },
            { label: "Số lớp nhận diện", value: String(status.classCount || classList.length) },
            { label: "Nguồn lớp", value: status.classSource === "labels.json" ? "labels.json" : "dataset/train" },
            { label: "Dataset hiện tại", value: status.dataset || "Backend/ml/dataset" },
        ];
    }, [classList.length, status]);

    const metricCards = useMemo(() => {
        if (!status?.metrics) return [];

        return [
            { label: "Accuracy", value: formatPercent(status.metrics.trainAccuracy) },
            { label: "Validation accuracy", value: formatPercent(status.metrics.validationAccuracy) },
            { label: "Loss", value: formatNumber(status.metrics.loss) },
            { label: "Validation loss", value: formatNumber(status.metrics.validationLoss) },
            { label: "Ảnh train", value: String(status.metrics.imageCount?.train ?? "Chưa có") },
            { label: "Ảnh validation", value: String(status.metrics.imageCount?.val ?? "Chưa có") },
            { label: "Tổng ảnh", value: String(status.metrics.imageCount?.total ?? "Chưa có") },
            { label: "Huấn luyện lúc", value: formatTrainingDate(status.metrics.trainedAt || status.lastTrainedAt) },
        ];
    }, [status]);

    const handleTrain = async () => {
        const confirmed = window.confirm("Quá trình huấn luyện có thể mất nhiều thời gian. Bạn có chắc muốn tiếp tục?");
        if (!confirmed) return;

        setTrainingLoading(true);
        setMessage("");
        setManualCommand("");
        setError("");

        try {
            const response = await adminPetVisionService.requestTraining();
            setMessage(response.message || "Đã gửi yêu cầu huấn luyện.");
            setManualCommand(response.manualCommand || "");
            if (response.status) setStatus(response.status);
        } catch (requestError) {
            setError(
                (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
                || "Không thể gửi yêu cầu huấn luyện. Vui lòng thử lại.",
            );
        } finally {
            setTrainingLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--pet-coral)]">
                    Pet Vision
                </p>
                <h1 className="section-title mt-2">Huấn luyện mô hình</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    Theo dõi trạng thái mô hình nhận diện giống chó/mèo, danh sách lớp breed-level và chỉ số huấn luyện hiện có.
                </p>
            </div>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            Trạng thái Pet Vision
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Lớp nhận diện được đọc từ labels.json; nếu thiếu, hệ thống sẽ quét Backend/ml/dataset/train.
                        </p>
                    </div>
                    {status && (
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass[status.status] ?? "bg-muted text-muted-foreground"}`}>
                            {statusLabel[status.status] ?? status.status}
                        </span>
                    )}
                </div>

                {loading && (
                    <div className="mt-6 rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                        Đang tải trạng thái mô hình...
                    </div>
                )}

                {!loading && error && (
                    <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                        {error}
                    </div>
                )}

                {!loading && status && (
                    <>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {cards.map((card) => (
                                <div key={card.label} className="rounded-xl border border-border bg-background p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {card.label}
                                    </p>
                                    <p className="mt-2 text-lg font-black text-foreground">
                                        {card.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-xl bg-muted/20 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-bold text-foreground">Chỉ số huấn luyện</p>
                                <p className="text-xs text-muted-foreground">Backend/ml/outputs/metrics.json</p>
                            </div>

                            {metricCards.length === 0 ? (
                                <p className="mt-4 rounded-lg bg-background px-4 py-5 text-center text-sm text-muted-foreground">
                                    Chưa có dữ liệu metrics. Hãy kiểm tra Backend/ml/outputs/metrics.json sau khi huấn luyện.
                                </p>
                            ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {metricCards.map((item) => (
                                        <div key={item.label} className="rounded-xl border border-border bg-background p-3">
                                            <p className="text-xs text-muted-foreground">{item.label}</p>
                                            <p className="mt-1 font-bold text-foreground">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 rounded-xl bg-muted/20 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-bold text-foreground">Các lớp nhận diện</p>
                                <p className="text-xs text-muted-foreground">{classList.length} lớp</p>
                            </div>

                            {classList.length === 0 ? (
                                <p className="mt-4 rounded-lg bg-background px-4 py-5 text-center text-sm text-muted-foreground">
                                    Chưa tìm thấy lớp nhận diện. Hãy kiểm tra Backend/ml/dataset/train hoặc labels.json.
                                </p>
                            ) : (
                                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-background p-3">
                                    <div className="flex flex-wrap gap-2">
                                        {classList.map((item) => (
                                            <span
                                                key={`${item.index}-${item.label}`}
                                                className="rounded-full bg-[var(--pet-coral)]/10 px-3 py-1 text-xs font-semibold text-[var(--pet-coral)]"
                                                title={item.label}
                                            >
                                                {item.displayName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:bg-card">
                <h2 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Điều khiển huấn luyện
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Không chạy TensorFlow/PyTorch nặng trực tiếp trong request web. Hãy huấn luyện local rồi triển khai file model đã xuất.
                </p>

                <button
                    type="button"
                    onClick={handleTrain}
                    disabled={trainingLoading}
                    className="btn-pet-primary mt-5 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {trainingLoading ? "Đang gửi yêu cầu..." : "Bắt đầu huấn luyện"}
                </button>

                {message && (
                    <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {message}
                    </div>
                )}

                {manualCommand && (
                    <div className="mt-4 rounded-xl bg-muted/30 p-4">
                        <p className="text-sm font-bold text-foreground">Lệnh huấn luyện thủ công</p>
                        <code className="mt-2 block overflow-x-auto rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
                            {manualCommand}
                        </code>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PetVisionTrainPage;
