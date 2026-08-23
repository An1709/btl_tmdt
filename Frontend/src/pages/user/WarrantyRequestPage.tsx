import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import Sidebar from "@/components/common/Sidebar";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { orderService } from "@/services/orderService";
import { warrantyService } from "@/services/warrantyService";
import type { Order } from "@/types/order";

const ISSUES = ["Thú cưng bị ốm", "Sản phẩm lỗi", "Giao hàng sai", "Chất lượng kém", "Khác"];

type WarrantyForm = {
    orderId: string;
    productId: string;
    issue: string;
    description: string;
};

type WarrantyFormErrors = Partial<Record<"orderId" | "productId" | "description", string>>;

const MAX_EVIDENCE_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === "string" ? message : fallback;
};

const WarrantyRequestPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState<WarrantyForm>({ orderId: "", productId: "", issue: ISSUES[0], description: "" });
    const [images, setImages] = useState<File[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<WarrantyFormErrors>({});
    const [submitError, setSubmitError] = useState("");
    const imageInputRef = useRef<HTMLInputElement>(null);

    const selectClassName = "border-border-strong h-11 w-full rounded-md border bg-surface px-3 py-2 text-sm text-text-strong shadow-elevation-1 transition-[color,background-color,border-color,box-shadow] duration-base ease-standard outline-none focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

    useEffect(() => {
        let active = true;

        orderService.getMyOrders()
            .then((data) => {
                if (active) setOrders(data);
            })
            .catch(() => {
                if (active) setOrdersError("Không thể tải đơn hàng của bạn. Vui lòng tải lại trang để thử lại.");
            })
            .finally(() => {
                if (active) setOrdersLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const selectedOrder = useMemo(
        () => orders.find((order) => order._id === form.orderId),
        [form.orderId, orders],
    );

    const updateForm = <Key extends keyof WarrantyForm>(key: Key, value: WarrantyForm[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
            ...(key === "orderId" ? { productId: "" } : {}),
        }));
        if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
        if (key === "orderId") setErrors((current) => ({ ...current, productId: undefined }));
        setSubmitError("");
    };

    const handleImageChange = (files: FileList | null) => {
        const nextImages = Array.from(files ?? []);

        if (nextImages.length > MAX_EVIDENCE_IMAGES) {
            setSubmitError(`Chỉ được chọn tối đa ${MAX_EVIDENCE_IMAGES} ảnh minh chứng.`);
            if (imageInputRef.current) imageInputRef.current.value = "";
            return;
        }

        const invalidImage = nextImages.find(
            (file) => !ACCEPTED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE,
        );
        if (invalidImage) {
            setSubmitError("Mỗi ảnh phải là JPG, PNG hoặc WebP và nhỏ hơn 5MB.");
            if (imageInputRef.current) imageInputRef.current.value = "";
            return;
        }

        setImages(nextImages);
        setSubmitError("");
    };

    const removeImage = (index: number) => {
        setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextErrors: WarrantyFormErrors = {
            orderId: form.orderId ? undefined : "Vui lòng chọn đơn hàng.",
            productId: form.productId ? undefined : "Vui lòng chọn sản phẩm trong đơn hàng.",
            description: form.description.trim() ? undefined : "Vui lòng mô tả vấn đề cần hỗ trợ.",
        };

        if (Object.values(nextErrors).some(Boolean)) {
            setErrors(nextErrors);
            toast.error("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        try {
            const data = new FormData();
            data.append("orderId", form.orderId);
            data.append("productId", form.productId);
            data.append("reason", `${form.issue}: ${form.description.trim()}`);
            images.forEach((img) => data.append("images", img));
            await warrantyService.createRequest(data);
            toast.success("Yêu cầu bảo hành đã được gửi!");
            navigate("/orders");
        } catch (error) {
            const message = getErrorMessage(error, "Không thể gửi yêu cầu. Vui lòng thử lại.");
            setSubmitError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
            <Sidebar mode="user" />
            <section className="min-w-0 flex-1">
                <header className="mb-6 max-w-3xl">
                    <div className="flex items-center gap-2 text-primary"><ShieldCheck aria-hidden="true" className="size-5" /><span className="text-sm font-semibold">Hỗ trợ sau mua</span></div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">Yêu cầu bảo hành</h1>
                    <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">Cung cấp thông tin đơn hàng và sản phẩm để PetMart kiểm tra yêu cầu của bạn.</p>
                </header>

                <section className="max-w-3xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="warranty-form-title">
                    <h2 id="warranty-form-title" className="text-base font-semibold text-text-strong">Thông tin yêu cầu</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Các trường có dấu * là thông tin hiện cần để gửi yêu cầu.</p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                        {submitError && <p role="alert" className="border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>}

                        {ordersError && <p role="alert" className="border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{ordersError}</p>}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField label="Đơn hàng" required error={errors.orderId} description="Chọn đúng đơn hàng đã mua sản phẩm cần hỗ trợ.">
                                {({ id, ...fieldProps }) => (
                                    <select {...fieldProps} id={id} className={selectClassName} value={form.orderId} onChange={(event) => updateForm("orderId", event.target.value)} disabled={ordersLoading || Boolean(ordersError)}>
                                        <option value="">{ordersLoading ? "Đang tải đơn hàng..." : orders.length ? "Chọn đơn hàng" : "Bạn chưa có đơn hàng"}</option>
                                        {orders.map((order) => <option key={order._id} value={order._id}>Đơn #{order._id.slice(-8).toUpperCase()} · {order.orderItems.length} sản phẩm</option>)}
                                    </select>
                                )}
                            </FormField>
                            <FormField label="Sản phẩm" required error={errors.productId} description="Danh sách này lấy trực tiếp từ đơn hàng đã chọn.">
                                {({ id, ...fieldProps }) => (
                                    <select {...fieldProps} id={id} className={selectClassName} value={form.productId} onChange={(event) => updateForm("productId", event.target.value)} disabled={!selectedOrder}>
                                        <option value="">{selectedOrder ? "Chọn sản phẩm" : "Chọn đơn hàng trước"}</option>
                                        {selectedOrder?.orderItems.map((item) => <option key={item.product} value={item.product}>{item.name} · SL {item.qty}</option>)}
                                    </select>
                                )}
                            </FormField>
                        </div>

                        <FormField label="Loại vấn đề">
                            {({ id, ...fieldProps }) => (
                                <select {...fieldProps} id={id} className={selectClassName} value={form.issue} onChange={(event) => updateForm("issue", event.target.value)}>
                                    {ISSUES.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                                </select>
                            )}
                        </FormField>

                        <FormField label="Mô tả chi tiết" required error={errors.description} description="Hãy mô tả rõ tình trạng để bộ phận hỗ trợ kiểm tra.">
                            {({ id, ...fieldProps }) => <Textarea {...fieldProps} id={id} rows={5} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Mô tả vấn đề bạn gặp phải..." />}
                        </FormField>

                        <FormField label="Ảnh minh chứng" description="Tối đa 5 ảnh JPG, PNG hoặc WebP; mỗi ảnh nhỏ hơn 5MB.">
                            {({ id, ...fieldProps }) => <Input {...fieldProps} ref={imageInputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handleImageChange(event.target.files)} />}
                        </FormField>

                        {images.length > 0 && (
                            <ul className="space-y-2" aria-label="Ảnh minh chứng đã chọn">
                                {images.map((image, index) => (
                                    <li key={`${image.name}-${image.lastModified}-${index}`} className="flex min-h-11 items-center justify-between gap-3 border border-divider bg-surface-subtle px-3 py-2 text-sm">
                                        <span className="flex min-w-0 items-center gap-2 text-text-strong"><ImagePlus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{image.name}</span></span>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)} aria-label={`Bỏ ảnh ${image.name}`}><X aria-hidden="true" className="size-4" />Bỏ</Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>Hủy</Button>
                            <Button type="submit" loading={submitting} disabled={ordersLoading || Boolean(ordersError) || orders.length === 0}>Gửi yêu cầu</Button>
                        </div>
                    </form>
                </section>
            </section>
        </div>
    );
};

export default WarrantyRequestPage;
