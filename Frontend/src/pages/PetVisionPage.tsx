import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { AlertTriangle, ImagePlus, ScanLine, ShieldCheck, UploadCloud, X } from "lucide-react";
import { Link } from "react-router";
import ProductList from "@/components/features/product/ProductList";
import { SectionLoading } from "@/components/common/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-state";
import { petVisionService, type PetVisionResponse } from "@/services/petVisionService";
import { mapProduct } from "@/services/productService";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FILE_EXTENSION = /\.(jpe?g|png|webp)$/i;
const SPECIES_CATEGORY_QUERY: Record<string, string> = {
    "Chó": "dog",
    "Mèo": "cat",
    "Thỏ": "rabbit",
    "Hamster": "hamster",
    "Vẹt": "parrot",
    "Cá": "fish",
};

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể nhận diện ảnh. Vui lòng thử lại.";

const getConfidenceValue = (result: PetVisionResponse) => {
    const rawValue = typeof result.prediction.confidencePercent === "number"
        ? result.prediction.confidencePercent
        : result.prediction.confidence * 100;

    return Math.min(100, Math.max(0, rawValue));
};

const formatFileSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const PetVisionPage = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [result, setResult] = useState<PetVisionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const confidenceThreshold = result?.confidenceThreshold ?? 0.55;
    const isLowConfidence = useMemo(
        () => Boolean(result && (result.prediction.isLowConfidence ?? result.prediction.confidence < confidenceThreshold)),
        [confidenceThreshold, result],
    );
    const suggestedProducts = useMemo(
        () => result?.suggestedProducts.slice(0, 3).map(mapProduct) ?? [],
        [result],
    );

    const clearSelection = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl("");
        setResult(null);
        setError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const selectFile = (file: File | null) => {
        setResult(null);
        setError("");

        if (!file) {
            clearSelection();
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_FILE_EXTENSION.test(file.name)) {
            clearSelection();
            setError("Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WebP.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            clearSelection();
            setError("Ảnh tải lên không được vượt quá 5 MB.");
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        selectFile(event.target.files?.[0] ?? null);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        if (loading) return;
        selectFile(event.dataTransfer.files?.[0] ?? null);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedFile) {
            setError("Vui lòng chọn ảnh thú cưng trước khi nhận diện.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const response = await petVisionService.predict(selectedFile);
            setResult(response);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    };

    const confidenceValue = result ? getConfidenceValue(result) : 0;
    const predictionName = result?.prediction.displayName || result?.prediction.label;
    const suggestedProductsLink = result && SPECIES_CATEGORY_QUERY[result.prediction.species]
        ? `/shop?cat=${SPECIES_CATEGORY_QUERY[result.prediction.species]}`
        : "/shop";

    return (
        <div className="min-h-screen bg-background">
            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <header className="mb-8 max-w-3xl">
                    <Badge tone="info">Pet Vision</Badge>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-strong sm:text-4xl">Nhận diện giống thú cưng từ ảnh</h1>
                    <p className="mt-3 max-w-[70ch] text-sm leading-6 text-muted-foreground sm:text-base">
                        Tải lên ảnh chó, mèo, thỏ, hamster, vẹt hoặc cá rõ nét. PetMart sẽ hiển thị dự đoán và độ tin cậy do hệ thống cung cấp; kết quả chỉ mang tính tham khảo.
                    </p>
                </header>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-text-strong">Chọn ảnh để phân tích</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Định dạng JPG, JPEG, PNG hoặc WebP · Tối đa 5 MB.</p>
                        </div>

                        <div
                            onDragEnter={(event) => { event.preventDefault(); if (!loading) setDragging(true); }}
                            onDragOver={(event) => event.preventDefault()}
                            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
                            onDrop={handleDrop}
                            className={`relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-5 text-center transition-colors duration-base ${dragging ? "border-primary bg-primary-subtle" : "border-border-strong bg-surface-subtle"}`}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Ảnh thú cưng đã chọn" className="max-h-[380px] w-full object-contain" onError={() => setError("Không thể hiển thị ảnh đã chọn. Vui lòng thử một ảnh khác.")} />
                            ) : (
                                <div className="flex max-w-sm flex-col items-center">
                                    <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary"><UploadCloud aria-hidden="true" className="size-6" /></span>
                                    <p className="font-semibold text-text-strong">Kéo thả ảnh vào đây</p>
                                    <p className="mt-1 text-sm text-muted-foreground">hoặc chọn ảnh từ thiết bị của bạn</p>
                                    <Button type="button" variant="outline" className="mt-5" disabled={loading} onClick={() => fileInputRef.current?.click()}><ImagePlus aria-hidden="true" />Chọn ảnh</Button>
                                </div>
                            )}
                        </div>

                        <input ref={fileInputRef} id="pet-vision-image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-label="Chọn ảnh thú cưng để nhận diện" onChange={handleFileChange} className="sr-only" />

                        {selectedFile && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                                <div className="min-w-0 text-left"><p className="truncate text-sm font-medium text-text-strong">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p></div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => fileInputRef.current?.click()}>Thay ảnh</Button>
                                    <Button type="button" variant="ghost" size="icon" disabled={loading} aria-label="Xóa ảnh đã chọn" onClick={clearSelection}><X aria-hidden="true" /></Button>
                                </div>
                            </div>
                        )}

                        {error && <p id="pet-vision-error" role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <Button type="submit" loading={loading} disabled={!selectedFile} aria-describedby={error ? "pet-vision-error" : undefined}><ScanLine aria-hidden="true" />Nhận diện ảnh</Button>
                            <p className="text-xs leading-5 text-muted-foreground">Quá trình phân tích không cung cấp phần trăm tiến độ.</p>
                        </div>
                    </form>

                    <aside className="rounded-xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="pet-vision-result-heading">
                        <h2 id="pet-vision-result-heading" className="text-lg font-semibold text-text-strong">Kết quả nhận diện</h2>

                        {!result && !loading && <EmptyState className="min-h-64 px-0" icon={<ScanLine className="size-7" />} title="Chưa có kết quả" description="Chọn một ảnh hợp lệ rồi bấm Nhận diện ảnh để bắt đầu." />}

                        {loading && <SectionLoading className="min-h-64" text="Đang phân tích ảnh…" />}

                        {result && (
                            <div className="mt-5 space-y-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm text-muted-foreground">Dự đoán</p>
                                        <Badge tone={isLowConfidence ? "warning" : "success"}>{isLowConfidence ? "Dưới ngưỡng tin cậy" : "Đạt ngưỡng tin cậy"}</Badge>
                                    </div>
                                    <p className="mt-2 text-2xl font-semibold leading-tight text-text-strong">{predictionName}</p>
                                </div>

                                <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
                                    <div><dt className="text-muted-foreground">Loài</dt><dd className="mt-1 font-semibold text-text-strong">{result.prediction.species}</dd></div>
                                    <div><dt className="text-muted-foreground">Giống</dt><dd className="mt-1 font-semibold text-text-strong">{result.prediction.breed || "Không có dữ liệu"}</dd></div>
                                </dl>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Độ tin cậy</span><strong className="text-text-strong">{confidenceValue.toFixed(2)}%</strong></div>
                                    <div role="meter" aria-label="Độ tin cậy của kết quả" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(confidenceValue.toFixed(2))} className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${isLowConfidence ? "bg-warning" : "bg-success"}`} style={{ width: `${confidenceValue}%` }} /></div>
                                </div>

                                {isLowConfidence ? (
                                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm leading-6 text-warning"><div className="flex items-start gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{result.warning || "Kết quả chưa đủ chắc chắn. Hãy thử ảnh rõ hơn, đủ sáng và thấy trọn khuôn mặt thú cưng."}</p></div></div>
                                ) : (
                                    <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm leading-6 text-success"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>Kết quả đạt ngưỡng tin cậy do hệ thống trả về.</p></div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>

                {result && (
                    <section className="mt-10" aria-label="Sản phẩm được gợi ý">
                        {result.recommendationNote && <p className="mb-5 rounded-lg bg-surface-subtle px-4 py-3 text-sm leading-6 text-muted-foreground">{result.recommendationNote}</p>}
                        {suggestedProducts.length > 0 ? (
                            <ProductList products={suggestedProducts} title="Sản phẩm gợi ý" subtitle="Gợi ý dựa trên dữ liệu nhận diện hiện có." viewAllLink={suggestedProductsLink} />
                        ) : (
                            <EmptyState title="Chưa có sản phẩm phù hợp" description="Bạn vẫn có thể khám phá toàn bộ sản phẩm trong cửa hàng PetMart." action={<Button asChild variant="outline"><Link to="/shop">Khám phá cửa hàng</Link></Button>} />
                        )}
                    </section>
                )}
            </section>
        </div>
    );
};

export default PetVisionPage;
