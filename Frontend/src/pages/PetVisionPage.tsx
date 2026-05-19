import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router";
import { petVisionService, type PetVisionResponse, type PetVisionSuggestedProduct } from "@/services/petVisionService";
import { formatCurrency } from "@/utils/format";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FALLBACK_IMAGE = "https://placehold.co/400x400/1f2937/f9fafb?text=PetMart";
const SPECIES_CATEGORY_QUERY: Record<string, string> = {
    "Chó": "dog",
    "Mèo": "cat",
};

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể nhận diện ảnh. Vui lòng thử lại.";

const getProductImage = (product: PetVisionSuggestedProduct) => {
    const firstImage = product.images?.[0];
    if (!firstImage) return FALLBACK_IMAGE;
    if (/^https?:\/\//i.test(firstImage)) return firstImage;
    return firstImage.startsWith("/") ? firstImage : `/${firstImage}`;
};

const confidencePercent = (confidence: number, apiPercent?: number) => {
    if (typeof apiPercent === "number" && Number.isFinite(apiPercent)) {
        return `${apiPercent.toFixed(2)}%`;
    }

    return `${(confidence * 100).toFixed(2)}%`;
};

const PetVisionPage = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [result, setResult] = useState<PetVisionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const confidenceThreshold = result?.confidenceThreshold ?? 0.55;
    const isLowConfidence = useMemo(
        () => Boolean(result && (result.prediction.isLowConfidence ?? result.prediction.confidence < confidenceThreshold)),
        [confidenceThreshold, result],
    );

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setResult(null);
        setError("");

        if (!file) {
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
            setError("Chỉ chấp nhận ảnh jpg, jpeg, png hoặc webp.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
            setError("Ảnh tải lên không được vượt quá 5MB.");
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedFile) {
            setError("Vui lòng tải lên ảnh thú cưng.");
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

    return (
        <main className="min-h-screen bg-background">
            <section className="container mx-auto px-4 py-10 lg:py-14">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--pet-coral)]">
                        Pet Vision
                    </p>
                    <h1 className="section-title mt-2">Nhận diện giống thú cưng</h1>
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                        Tải lên ảnh chó hoặc mèo rõ nét để PetMart dự đoán giống và gợi ý sản phẩm phù hợp.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                    >
                        <label
                            htmlFor="pet-vision-image"
                            className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition hover:border-[var(--pet-coral)]"
                        >
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Ảnh thú cưng đã chọn"
                                    className="max-h-[360px] w-full rounded-lg object-contain"
                                />
                            ) : (
                                <div>
                                    <div className="mb-4 text-5xl">🐾</div>
                                    <p className="text-base font-bold text-foreground">Chọn ảnh thú cưng</p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Hỗ trợ jpg, jpeg, png, webp. Dung lượng tối đa 5MB.
                                    </p>
                                </div>
                            )}
                        </label>

                        <input
                            id="pet-vision-image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="sr-only"
                        />

                        {error && (
                            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                                {error}
                            </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                            <label
                                htmlFor="pet-vision-image"
                                className="btn-pet-secondary cursor-pointer px-5 py-2 text-sm"
                            >
                                Tải ảnh lên
                            </label>
                            <button
                                type="submit"
                                disabled={!selectedFile || loading}
                                className="btn-pet-primary px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Đang phân tích ảnh..." : "Nhận diện"}
                            </button>
                        </div>
                    </form>

                    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <h2 className="text-xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            Kết quả
                        </h2>

                        {!result && !loading && (
                            <p className="mt-4 text-sm text-muted-foreground">
                                Kết quả dự đoán sẽ hiển thị sau khi bạn chọn ảnh và bấm nhận diện.
                            </p>
                        )}

                        {loading && (
                            <p className="mt-4 text-sm font-semibold text-[var(--pet-coral)]">
                                Đang phân tích ảnh...
                            </p>
                        )}

                        {result && (
                            <div className="mt-5 space-y-5">
                                <div className="rounded-xl bg-muted/30 p-4">
                                    <p className="text-sm text-muted-foreground">Kết quả dự đoán</p>
                                    <p className="mt-1 text-2xl font-black text-foreground">
                                        {result.prediction.displayName || result.prediction.label}
                                    </p>
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Loài</p>
                                            <p className="font-bold text-foreground">{result.prediction.species}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Độ tin cậy</p>
                                            <p className="font-bold text-foreground">
                                                {confidencePercent(result.prediction.confidence, result.prediction.confidencePercent)}
                                            </p>
                                        </div>
                                    </div>
                                    {result.prediction.breed && (
                                        <div className="mt-3 text-sm">
                                            <p className="text-muted-foreground">Giống</p>
                                            <p className="font-bold text-foreground">{result.prediction.breed}</p>
                                        </div>
                                    )}
                                </div>

                                {isLowConfidence && (
                                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
                                        {result.warning || "Mình chưa đủ chắc chắn về giống thú cưng này. Bạn có thể thử ảnh rõ hơn."}
                                    </p>
                                )}

                                {result.prediction.topK.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-foreground">Top 3 dự đoán</h3>
                                        <div className="mt-3 space-y-2">
                                            {result.prediction.topK.slice(0, 3).map((item, index) => (
                                                <div
                                                    key={`${item.label}-${index}`}
                                                    className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-sm"
                                                >
                                                    <span className="font-semibold text-foreground">
                                                        {index + 1}. {item.displayName || item.label}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {confidencePercent(item.confidence, item.confidencePercent)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>

                {result && (
                    <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                                    Sản phẩm gợi ý
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Gợi ý dựa trên loài thú cưng được nhận diện.
                                </p>
                            </div>
                            <Link
                                to={`/shop?cat=${SPECIES_CATEGORY_QUERY[result.prediction.species] ?? ""}`}
                                className="text-sm font-semibold text-[var(--pet-coral)] hover:underline"
                            >
                                Xem thêm
                            </Link>
                        </div>

                        {result.suggestedProducts.length === 0 ? (
                            <p className="rounded-lg bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                                Chưa có sản phẩm phù hợp.
                            </p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {result.suggestedProducts.slice(0, 3).map((product) => (
                                    <Link
                                        key={product._id}
                                        to={`/product/${product._id}`}
                                        className="group overflow-hidden rounded-xl border border-border bg-background transition hover:border-[var(--pet-coral)]"
                                    >
                                        <div className="aspect-square bg-muted/30">
                                            <img
                                                src={getProductImage(product)}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.src = FALLBACK_IMAGE;
                                                }}
                                            />
                                        </div>
                                        <div className="p-4">
                                            <p className="line-clamp-2 font-bold text-foreground group-hover:text-[var(--pet-coral)]">
                                                {product.name}
                                            </p>
                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <span className="font-black text-[var(--pet-coral)]">
                                                    {formatCurrency(product.price)}
                                                </span>
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${Number(product.stock) > 0
                                                    ? "bg-emerald-500/10 text-emerald-600"
                                                    : "bg-red-500/10 text-red-500"
                                                    }`}
                                                >
                                                    {Number(product.stock) > 0 ? "Còn hàng" : "Hết hàng"}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </section>
        </main>
    );
};

export default PetVisionPage;
