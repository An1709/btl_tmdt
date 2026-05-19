import { useEffect, useRef, useState } from "react";
import { ImagePlus, MessageCircle, Minus, Send, X } from "lucide-react";
import { useLocation } from "react-router";
import { aiService, type ChatMessage } from "@/services/aiService";
import { petVisionService, type PetVisionResponse, type PetVisionSuggestedProduct } from "@/services/petVisionService";
import { useAuthStore } from "@/stores/useAuthStore";

interface ChatUiMessage extends ChatMessage {
    imageUrl?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_TYPE_ERROR = "Vui lòng dán hoặc chọn tệp ảnh hợp lệ.";
const IMAGE_SIZE_ERROR = "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.";
const DEFAULT_IMAGE_MESSAGE = "Nhờ PetMart nhận diện giống thú cưng trong ảnh này";
const CHAT_STORAGE_PREFIX = "petmart_chat_history";
const GUEST_CHAT_STORAGE_KEY = `${CHAT_STORAGE_PREFIX}_guest`;

const greetingMessage: ChatUiMessage = {
    role: "assistant",
    content: "Xin chào! Mình có thể hỗ trợ bạn chọn sản phẩm, kiểm tra đơn hàng, hướng dẫn thanh toán hoặc nhận diện giống chó/mèo qua ảnh.",
    timestamp: new Date().toISOString(),
};

const hiddenPathPrefixes = ["/admin", "/signin", "/signup", "/verify-email", "/forgot-password"];

const getScopedChatStorageKey = (user: ReturnType<typeof useAuthStore.getState>["user"]) => {
    if (!user) return GUEST_CHAT_STORAGE_KEY;
    const identity = user._id || user.email || user.username;
    return `${CHAT_STORAGE_PREFIX}_${encodeURIComponent(identity)}`;
};

const getFreshGreeting = (): ChatUiMessage => ({
    ...greetingMessage,
    timestamp: new Date().toISOString(),
});

const loadChatHistory = (storageKey: string): ChatUiMessage[] => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [getFreshGreeting()];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [getFreshGreeting()];

        const messages = parsed
            .filter((message): message is ChatMessage =>
                (message?.role === "user" || message?.role === "assistant")
                && typeof message.content === "string"
                && typeof message.timestamp === "string",
            )
            .map((message) => ({
                role: message.role,
                content: message.content,
                timestamp: message.timestamp,
            }));

        return messages.length > 0 ? messages : [getFreshGreeting()];
    } catch {
        return [getFreshGreeting()];
    }
};

const saveChatHistory = (storageKey: string, messages: ChatUiMessage[]) => {
    try {
        const safeMessages = messages.map(({ role, content, timestamp }) => ({ role, content, timestamp }));
        localStorage.setItem(storageKey, JSON.stringify(safeMessages));
    } catch {
        // Storage quota/privacy mode failures should not break the chatbot UI.
    }
};

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể gửi tin nhắn. Vui lòng thử lại.";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("vi-VN")} đ`;

const confidencePercent = (prediction: PetVisionResponse["prediction"]) => {
    if (typeof prediction.confidencePercent === "number") {
        return `${prediction.confidencePercent.toFixed(2)}%`;
    }

    return `${(prediction.confidence * 100).toFixed(2)}%`;
};

const getSpecValue = (product: PetVisionSuggestedProduct, keys: string[]) => {
    const specs = product.specifications || {};
    const entries = Object.entries(specs);
    const match = entries.find(([key]) => keys.some((target) => key.toLowerCase().includes(target.toLowerCase())));
    return match?.[1];
};

const formatProductLine = (product: PetVisionSuggestedProduct, index: number) => {
    const brand = getSpecValue(product, ["Thương hiệu", "brand"]);
    const weight = getSpecValue(product, ["Trọng lượng", "Dung tích", "weight", "volume"]);
    const suitable = getSpecValue(product, ["Phù hợp", "suitable"]);
    const specs = [
        brand ? `Thương hiệu: ${brand}` : "",
        weight ? `Trọng lượng/Dung tích: ${weight}` : "",
        suitable ? `Phù hợp: ${suitable}` : "",
    ].filter(Boolean).slice(0, 3);

    return `${index + 1}. ${product.name} - ${formatPrice(product.price)}${specs.length ? `. ${specs.join(", ")}` : "."}`;
};

const buildVisionReply = (result: PetVisionResponse) => {
    const predictionName = result.prediction.displayName || result.prediction.label;
    const alternatives = result.prediction.topK
        .slice(1, 3)
        .map((item) => item.displayName || item.label)
        .filter(Boolean);
    const productLines = result.suggestedProducts.slice(0, 3).map(formatProductLine);
    const parts = [
        `Mình đoán đây là ${predictionName} với độ tin cậy khoảng ${confidencePercent(result.prediction)}.`,
    ];

    if (result.prediction.isLowConfidence || result.warning) {
        parts.push(result.warning || "Mình chưa đủ chắc chắn về giống thú cưng này. Bạn có thể thử ảnh rõ hơn.");
    }

    if (alternatives.length > 0) {
        parts.push(`Khả năng khác: ${alternatives.join(", ")}.`);
    }

    if (productLines.length > 0) {
        parts.push(`Sản phẩm phù hợp:\n${productLines.join("\n")}`);
    }

    return parts.join("\n\n");
};

const ChatWidget = () => {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const authInitialized = useAuthStore((state) => state.initialized);
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatUiMessage[]>([getFreshGreeting()]);
    const [activeChatStorageKey, setActiveChatStorageKey] = useState("");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState("Đang trả lời");
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState("");

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sentImageUrlsRef = useRef<string[]>([]);
    const requestGuardRef = useRef(0);

    const hidden = hiddenPathPrefixes.some((path) => location.pathname.startsWith(path));
    const chatStorageKey = authInitialized && !authLoading ? getScopedChatStorageKey(user) : "";
    const visibleMessages = chatStorageKey && activeChatStorageKey === chatStorageKey
        ? messages
        : [getFreshGreeting()];

    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, open, loading]);

    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        }
    }, [open]);

    useEffect(() => () => {
        if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
    }, [selectedImagePreviewUrl]);

    useEffect(() => () => {
        sentImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    }, []);

    useEffect(() => {
        requestGuardRef.current += 1;
        setLoading(false);
        setInput("");
        setSelectedImageFile(null);
        setSelectedImagePreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return "";
        });
        sentImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        sentImageUrlsRef.current = [];
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (!chatStorageKey) {
            setActiveChatStorageKey("");
            setMessages([getFreshGreeting()]);
            return;
        }

        setMessages(loadChatHistory(chatStorageKey));
        setActiveChatStorageKey(chatStorageKey);
    }, [chatStorageKey]);

    useEffect(() => {
        if (!chatStorageKey || activeChatStorageKey !== chatStorageKey) return;
        saveChatHistory(chatStorageKey, messages);
    }, [activeChatStorageKey, chatStorageKey, messages]);

    if (hidden) return null;

    const addAssistantMessage = (content: string) => {
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content,
                timestamp: new Date().toISOString(),
            },
        ]);
    };

    const clearSelectedImage = () => {
        if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
        setSelectedImageFile(null);
        setSelectedImagePreviewUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const validateImageFile = (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return IMAGE_TYPE_ERROR;
        }

        if (file.size > MAX_FILE_SIZE) {
            return IMAGE_SIZE_ERROR;
        }

        return "";
    };

    const selectImageFile = (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            clearSelectedImage();
            addAssistantMessage(validationError);
            return;
        }

        clearSelectedImage();
        setSelectedImageFile(file);
        setSelectedImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) return;
        selectImageFile(file);
    };

    const sendTextMessage = async () => {
        const text = input.trim();
        if (!text || loading || !chatStorageKey) return;
        const requestId = ++requestGuardRef.current;
        const requestStorageKey = chatStorageKey;

        const userMessage: ChatUiMessage = {
            role: "user",
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages((current) => [...current, userMessage]);
        setInput("");
        setLoading(true);
        setLoadingLabel("Đang trả lời");

        try {
            const reply = await aiService.sendMessage(text);
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(reply);
            }
        } catch (error) {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(getErrorMessage(error));
            }
        } finally {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                setLoading(false);
            }
        }
    };

    const sendImageFile = async (file: File, fallbackCaption: string) => {
        if (loading || !chatStorageKey) return;

        const validationError = validateImageFile(file);
        if (validationError) {
            addAssistantMessage(validationError);
            return;
        }

        const requestId = ++requestGuardRef.current;
        const requestStorageKey = chatStorageKey;
        const imageUrl = URL.createObjectURL(file);
        sentImageUrlsRef.current.push(imageUrl);
        const userMessage: ChatUiMessage = {
            role: "user",
            content: input.trim() || fallbackCaption,
            imageUrl,
            timestamp: new Date().toISOString(),
        };

        setMessages((current) => [...current, userMessage]);
        setInput("");
        setSelectedImageFile(null);
        if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
        setSelectedImagePreviewUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setLoading(true);
        setLoadingLabel("Đang phân tích ảnh thú cưng...");

        try {
            const result = await petVisionService.predict(file);
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(buildVisionReply(result));
            }
        } catch (error) {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(
                    (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    || "Không thể nhận diện ảnh. Vui lòng thử lại.",
                );
            }
        } finally {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                setLoading(false);
            }
        }
    };

    const sendImageMessage = async () => {
        if (!selectedImageFile) return;
        await sendImageFile(selectedImageFile, DEFAULT_IMAGE_MESSAGE);
    };

    const sendMessage = async () => {
        if (selectedImageFile) {
            await sendImageMessage();
            return;
        }

        await sendTextMessage();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
        }
    };

    const getImageFileFromClipboard = (items: DataTransferItemList) => {
        const imageItem = Array.from(items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
        const file = imageItem?.getAsFile();

        if (!file) return null;

        const extension = file.type.split("/")[1] || "png";
        return new File([file], file.name || `pasted-pet-image.${extension}`, { type: file.type });
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const hasFileItem = Array.from(event.clipboardData.items).some((item) => item.kind === "file");
        const pastedImage = getImageFileFromClipboard(event.clipboardData.items);

        if (!pastedImage) {
            if (hasFileItem) {
                event.preventDefault();
                addAssistantMessage(IMAGE_TYPE_ERROR);
            }
            return;
        }

        event.preventDefault();

        if (loading) return;

        selectImageFile(pastedImage);
    };

    return (
        <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
            {open && (
                <section className="w-[calc(100vw-2rem)] max-w-sm h-[520px] bg-white dark:bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in-up">
                    <header className="bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                            <MessageCircle className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-white text-sm">Trợ lý PetMart</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                                <span className="text-white/80 text-xs">Bạn cần hỗ trợ gì?</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                            aria-label="Thu nhỏ trò chuyện"
                        >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-muted/20 dark:bg-background/20">
                        {visibleMessages.map((message, index) => (
                            <div
                                key={`${message.timestamp}-${index}`}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                                    ${message.role === "user"
                                            ? "bg-[var(--pet-coral)] text-white rounded-br-md"
                                            : "bg-white dark:bg-card text-foreground border border-border rounded-bl-md"
                                        }`}
                                >
                                    {message.imageUrl && (
                                        <img
                                            src={message.imageUrl}
                                            alt="Ảnh thú cưng đã gửi"
                                            className="mb-2 max-h-40 rounded-xl object-cover"
                                        />
                                    )}
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                    <span className="sr-only">{loadingLabel}</span>
                                    <div className="flex items-center gap-2">
                                        <span>{loadingLabel}</span>
                                        <span className="flex gap-1">
                                            {[0, 1, 2].map((item) => (
                                                <span
                                                    key={item}
                                                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                                    style={{ animationDelay: `${item * 0.15}s` }}
                                                />
                                            ))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className="shrink-0 border-t border-border bg-white dark:bg-card">
                        {selectedImagePreviewUrl && (
                            <div className="px-3 pt-3">
                                <div className="relative inline-block max-w-full">
                                    <img
                                        src={selectedImagePreviewUrl}
                                        alt="Ảnh xem trước"
                                        className="h-24 w-24 max-h-[120px] max-w-full rounded-xl border border-border object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={clearSelectedImage}
                                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                                        aria-label="Xóa ảnh đã chọn"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <form
                            className="p-3 flex gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void sendMessage();
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                                className="sr-only"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="w-10 h-10 shrink-0 rounded-xl border border-border text-muted-foreground flex items-center justify-center hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                aria-label="Tải ảnh thú cưng"
                            >
                                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Nhập tin nhắn hoặc dán ảnh..."
                                rows={1}
                                className="flex-1 min-h-10 max-h-24 px-3 py-2 rounded-xl border border-border bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all placeholder:text-muted-foreground"
                            />
                            <button
                                type="submit"
                                disabled={(!input.trim() && !selectedImageFile) || loading || !chatStorageKey}
                                className="w-10 h-10 shrink-0 rounded-xl bg-[var(--pet-coral)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                aria-label="Gửi"
                            >
                                <Send className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </form>
                        <p className="px-3 pb-3 -mt-1 text-[11px] text-muted-foreground">
                            Bạn có thể tải lên hoặc dán ảnh vào khung chat.
                        </p>
                    </div>
                </section>
            )}

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] text-white shadow-glow flex items-center justify-center hover:-translate-y-0.5 active:scale-95 transition-all"
                aria-label={open ? "Đóng trợ lý PetMart" : "Mở trợ lý PetMart"}
            >
                {open ? <X className="w-6 h-6" aria-hidden="true" /> : <MessageCircle className="w-6 h-6" aria-hidden="true" />}
            </button>
        </div>
    );
};

export default ChatWidget;
