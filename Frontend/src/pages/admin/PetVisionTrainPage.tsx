import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { SkeletonBlock } from "@/components/common/Loading";
import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import RecognitionClassList from "@/components/features/admin/RecognitionClassList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/feedback-state";
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

const statusTone: Record<string, "neutral" | "success" | "warning" | "error" | "info"> = {
    ready: "success",
    trained: "success",
    training: "info",
    training_requested: "warning",
    failed: "error",
    not_trained: "neutral",
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
    const [refreshing, setRefreshing] = useState(false);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [manualCommand, setManualCommand] = useState("");

    const loadStatus = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            setStatus(await adminPetVisionService.getStatus());
            setError("");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            if (silent) setRefreshing(false);
            else setLoading(false);
        }
    }, []);

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

    useEffect(() => {
        if (status?.status !== "training" && status?.status !== "training_requested") return;
        let cancelled = false;
        let requestInFlight = false;
        const intervalId = window.setInterval(async () => {
            if (requestInFlight) return;
            requestInFlight = true;
            try {
                const nextStatus = await adminPetVisionService.getStatus();
                if (!cancelled) {
                    setStatus(nextStatus);
                    setError("");
                }
            } catch (requestError) {
                if (!cancelled) setError(getErrorMessage(requestError));
            } finally {
                requestInFlight = false;
            }
        }, 15000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [status?.status]);

    const classList = useMemo(() => status ? getClassList(status) : [], [status]);

    const cards = useMemo(() => {
        if (!status) return [];

        return [
            { label: "Trạng thái mô hình", value: statusLabel[status.status] ?? status.status },
            { label: "Phiên bản mô hình", value: status.modelVersion || "Chưa có" },
            { label: "File mô hình", value: status.modelFile || "Chưa có" },
            { label: "Số lớp nhận diện", value: String(status.classCount || classList.length) },
            { label: "Nguồn lớp", value: status.classSource || "Chưa có" },
            { label: "Dataset hiện tại", value: status.dataset || "Chưa có" },
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
        setTrainingLoading(true);
        setMessage("");
        setManualCommand("");
        setError("");

        try {
            const response = await adminPetVisionService.requestTraining();
            setMessage(response.message || "Đã gửi yêu cầu huấn luyện.");
            setManualCommand(response.manualCommand || "");
            if (response.status) setStatus(response.status);
            setConfirmOpen(false);
        } catch (requestError) {
            setError(
                (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
                || "Không thể gửi yêu cầu huấn luyện. Vui lòng thử lại.",
            );
        } finally {
            setTrainingLoading(false);
        }
    };

    const trainingActive = status?.status === "training" || status?.status === "training_requested";
    const trainingUnavailable = loading || refreshing || !status || Boolean(error);

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Vận hành mô hình Pet Vision" description="Theo dõi trạng thái, metadata và metrics do backend cung cấp; giao diện không suy đoán tiến độ hoặc chất lượng mô hình." actions={<Button type="button" variant="outline" loading={refreshing} disabled={loading} onClick={() => void loadStatus(true)}><RefreshCw aria-hidden="true" />Làm mới trạng thái</Button>} />

            <AdminPanel title="Trạng thái Pet Vision" description="Lớp nhận diện và metadata bên dưới được hiển thị trực tiếp từ status endpoint." action={status && <Badge tone={statusTone[status.status] ?? "neutral"}>{statusLabel[status.status] ?? status.status}</Badge>}>

                {loading && (
                    <div className="space-y-3" aria-label="Đang tải trạng thái mô hình" aria-busy="true"><SkeletonBlock className="h-16 rounded-md" /><SkeletonBlock className="h-32 rounded-md" /></div>
                )}

                {!loading && error && (
                    <ErrorState title="Không thể tải trạng thái mô hình" description={error} action={<Button type="button" variant="outline" onClick={() => void loadStatus()}>Thử lại</Button>} />
                )}

                {!loading && status && (
                    <>
                        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                            {cards.map((card) => (
                                <div key={card.label} className="border-b border-divider pb-3">
                                    <dt className="text-xs font-medium text-muted-foreground">{card.label}</dt>
                                    <dd className="mt-1 break-words text-base font-semibold text-text-strong">{card.value}</dd>
                                </div>
                            ))}
                        </dl>

                        <section className="mt-6 border-t border-divider pt-5">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-bold text-foreground">Chỉ số huấn luyện</p>
                                <p className="text-xs text-muted-foreground">Backend/ml/outputs/metrics.json</p>
                            </div>

                            {metricCards.length === 0 ? (
                                <p className="mt-4 rounded-lg bg-background px-4 py-5 text-center text-sm text-muted-foreground">
                                    Chưa có dữ liệu metrics. Hãy kiểm tra Backend/ml/outputs/metrics.json sau khi huấn luyện.
                                </p>
                            ) : (
                                    <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {metricCards.map((item) => (
                                            <div key={item.label}>
                                                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                                                <dd className="mt-1 font-semibold text-text-strong">{item.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                        </section>

                        <RecognitionClassList classes={classList} />
                    </>
                )}
            </AdminPanel>

            <AdminPanel title="Điều khiển huấn luyện" description="Backend hiện nhận yêu cầu và có thể trả về lệnh huấn luyện thủ công. Không có ETA hoặc phần trăm tiến độ trong contract hiện tại.">
                <div className="flex flex-col items-start gap-3">
                    <Button type="button" disabled={trainingActive || trainingUnavailable} onClick={() => setConfirmOpen(true)}>{trainingActive ? "Đang có yêu cầu huấn luyện" : "Gửi yêu cầu huấn luyện"}</Button>
                    {trainingActive && <p className="text-sm text-muted-foreground">Trạng thái sẽ được kiểm tra lại tối đa mỗi 15 giây và dừng tự động khi công việc kết thúc.</p>}
                    {trainingUnavailable && !trainingActive && <p className="text-sm text-muted-foreground">Cần tải thành công trạng thái hiện tại trước khi gửi yêu cầu mới.</p>}
                </div>

                {message && (
                    <div role="status" className="mt-5 rounded-md border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
                        {message}
                    </div>
                )}

                {manualCommand && (
                    <div className="mt-4 rounded-md border border-border bg-surface-subtle p-4">
                        <p className="text-sm font-semibold text-text-strong">Lệnh huấn luyện thủ công do backend trả về</p>
                        <code className="mt-2 block overflow-x-auto rounded-md bg-surface px-3 py-2 text-sm text-foreground">
                            {manualCommand}
                        </code>
                    </div>
                )}
            </AdminPanel>

            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!trainingLoading) setConfirmOpen(open); }} title="Gửi yêu cầu huấn luyện" description="Đây là thao tác vận hành có thể dẫn đến quy trình chạy dài bên ngoài request web." size="sm" closeOnBackdrop={!trainingLoading} closeOnEscape={!trainingLoading} footer={<DialogFooter><Button type="button" variant="outline" disabled={trainingLoading} onClick={() => setConfirmOpen(false)}>Hủy</Button><Button type="button" loading={trainingLoading} onClick={() => void handleTrain()}>Gửi yêu cầu</Button></DialogFooter>}>
                <p className="text-sm leading-6 text-muted-foreground">PetMart sẽ gọi đúng endpoint huấn luyện hiện tại một lần. Giao diện chỉ hiển thị status, message và manual command thực sự được backend trả về.</p>
            </Dialog>
        </div>
    );
};

export default PetVisionTrainPage;
