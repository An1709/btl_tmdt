import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, ImagePlus, LoaderCircle, MessageCircle, Minus, RefreshCw, Send, X } from "lucide-react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiService, type ChatMessage } from "@/services/aiService";
import { petVisionService, type PetVisionResponse, type PetVisionSuggestedProduct } from "@/services/petVisionService";
import { useAuthStore } from "@/stores/useAuthStore";

interface ChatUiMessage extends ChatMessage {
    imageUrl?: string;
}

type RetryAction =
    | { kind: "text"; text: string }
    | { kind: "image"; file: File; caption: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 2000;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_FILE_EXTENSION = /\.(jpe?g|png|webp)$/i;
const IMAGE_TYPE_ERROR = "Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WebP.";
const IMAGE_SIZE_ERROR = "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.";
const MESSAGE_LENGTH_ERROR = `Tin nhắn quá dài. Vui lòng nhập tối đa ${MAX_MESSAGE_LENGTH.toLocaleString("vi-VN")} ký tự.`;
const DEFAULT_IMAGE_MESSAGE = "Nhờ PetMart nhận diện giống thú cưng trong ảnh này";
const CHAT_STORAGE_PREFIX = "petmart_chat_history";
const GUEST_CHAT_STORAGE_KEY = `${CHAT_STORAGE_PREFIX}_guest`;

const greetingMessage: ChatUiMessage = {
    role: "assistant",
    content: "Xin chào! Mình có thể hỗ trợ bạn chọn sản phẩm, kiểm tra đơn hàng, hướng dẫn thanh toán hoặc nhận diện chó, mèo, thỏ, hamster, vẹt và cá qua ảnh.",
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
    const productLines = result.suggestedProducts.slice(0, 3).map(formatProductLine);
    const parts = [
        `Mình dự đoán đây là ${predictionName} với độ tin cậy ${confidencePercent(result.prediction)}.`,
    ];

    if (result.prediction.isLowConfidence || result.warning) {
        parts.push(result.warning || "Kết quả chưa đủ chắc chắn. Bạn có thể thử ảnh rõ hơn, đủ sáng và thấy trọn khuôn mặt thú cưng.");
    }

    if (productLines.length > 0) {
        parts.push(result.recommendationNote
            ? `${result.recommendationNote}\n${productLines.join("\n")}`
            : `Sản phẩm phù hợp:\n${productLines.join("\n")}`);
    } else {
        parts.push(result.recommendationNote || "Hiện tại chưa có sản phẩm gợi ý phù hợp.");
    }

    return parts.join("\n\n");
};

const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const ChatWidget = () => {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const authInitialized = useAuthStore((state) => state.initialized);
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [messages, setMessages] = useState<ChatUiMessage[]>([getFreshGreeting()]);
    const [activeChatStorageKey, setActiveChatStorageKey] = useState("");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState("Đang trả lời");
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState("");
    const [composerError, setComposerError] = useState("");
    const [requestError, setRequestError] = useState("");
    const [retryAction, setRetryAction] = useState<RetryAction | null>(null);

    const bottomRef = useRef<HTMLLIElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const sentImageUrlsRef = useRef<string[]>([]);
    const requestGuardRef = useRef(0);

    const hidden = hiddenPathPrefixes.some((path) => location.pathname.startsWith(path));
    const chatStorageKey = authInitialized && !authLoading ? getScopedChatStorageKey(user) : "";
    const visibleMessages = chatStorageKey && activeChatStorageKey === chatStorageKey
        ? messages
        : [getFreshGreeting()];

    useEffect(() => {
        if (!open) return;
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        bottomRef.current?.scrollIntoView({ behavior });
    }, [messages, open, loading]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
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
        setComposerError("");
        setRequestError("");
        setRetryAction(null);
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

    if (hidden || dismissed) return null;

    const addAssistantMessage = (content: string) => {
        setMessages((current) => [
            ...current,
            { role: "assistant", content, timestamp: new Date().toISOString() },
        ]);
    };

    const clearSelectedImage = () => {
        if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
        setSelectedImageFile(null);
        setSelectedImagePreviewUrl("");
        setComposerError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const validateImageFile = (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_FILE_EXTENSION.test(file.name)) return IMAGE_TYPE_ERROR;
        if (file.size > MAX_FILE_SIZE) return IMAGE_SIZE_ERROR;
        return "";
    };

    const selectImageFile = (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            clearSelectedImage();
            setComposerError(validationError);
            return;
        }

        clearSelectedImage();
        setSelectedImageFile(file);
        setSelectedImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (file) selectImageFile(file);
    };

    const sendTextMessage = async (textOverride?: string, appendUserMessage = true) => {
        const text = (textOverride ?? input).trim();
        if (!text || loading || !chatStorageKey) return;
        if (text.length > MAX_MESSAGE_LENGTH) {
            setComposerError(MESSAGE_LENGTH_ERROR);
            return;
        }
        const requestId = ++requestGuardRef.current;
        const requestStorageKey = chatStorageKey;

        if (appendUserMessage) {
            setMessages((current) => [...current, { role: "user", content: text, timestamp: new Date().toISOString() }]);
            setInput("");
        }
        setLoading(true);
        setLoadingLabel("Đang trả lời…");
        setRequestError("");
        setRetryAction(null);

        try {
            const reply = await aiService.sendMessage(text);
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(reply);
            }
        } catch (error) {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                const message = getErrorMessage(error);
                setRequestError(message);
                setRetryAction({ kind: "text", text });
            }
        } finally {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) setLoading(false);
        }
    };

    const sendImageFile = async (file: File, fallbackCaption: string, appendUserMessage = true) => {
        if (loading || !chatStorageKey) return;

        const validationError = validateImageFile(file);
        if (validationError) {
            setComposerError(validationError);
            return;
        }

        const requestId = ++requestGuardRef.current;
        const requestStorageKey = chatStorageKey;
        const caption = appendUserMessage ? input.trim() || fallbackCaption : fallbackCaption;

        if (appendUserMessage) {
            const imageUrl = URL.createObjectURL(file);
            sentImageUrlsRef.current.push(imageUrl);
            setMessages((current) => [...current, { role: "user", content: caption, imageUrl, timestamp: new Date().toISOString() }]);
            setInput("");
            setSelectedImageFile(null);
            if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
            setSelectedImagePreviewUrl("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }

        setLoading(true);
        setLoadingLabel("Đang phân tích ảnh…");
        setRequestError("");
        setRetryAction(null);

        try {
            const result = await petVisionService.predict(file);
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                addAssistantMessage(buildVisionReply(result));
            }
        } catch (error) {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) {
                const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    || "Không thể nhận diện ảnh. Vui lòng thử lại.";
                setRequestError(message);
                setRetryAction({ kind: "image", file, caption });
            }
        } finally {
            if (requestGuardRef.current === requestId && chatStorageKey === requestStorageKey) setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (input.trim().length > MAX_MESSAGE_LENGTH) {
            setComposerError(MESSAGE_LENGTH_ERROR);
            return;
        }

        if (selectedImageFile) {
            await sendImageFile(selectedImageFile, DEFAULT_IMAGE_MESSAGE);
            return;
        }
        await sendTextMessage();
    };

    const retryLastRequest = async () => {
        const action = retryAction;
        if (!action || loading) return;
        if (action.kind === "text") await sendTextMessage(action.text, false);
        else await sendImageFile(action.file, action.caption, false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing) return;
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
                setComposerError(IMAGE_TYPE_ERROR);
            }
            return;
        }

        event.preventDefault();
        if (!loading) selectImageFile(pastedImage);
    };

    const minimizeChat = () => {
        setOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
    };

    const hasMessageLengthError = composerError === MESSAGE_LENGTH_ERROR;

    return (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-assistant sm:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:right-[calc(env(safe-area-inset-right)+1.5rem)]">
            {open ? (
                <section
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="petmart-assistant-title"
                    onKeyDown={(event) => { if (event.key === "Escape") minimizeChat(); }}
                    className="grid h-[min(38rem,calc(100dvh-7rem-env(safe-area-inset-bottom)))] w-[min(24rem,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-elevation-3 sm:h-[min(38rem,calc(100dvh-3rem-env(safe-area-inset-bottom)))]"
                >
                    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary"><Bot aria-hidden="true" className="size-5" /></span>
                        <div className="min-w-0 flex-1">
                            <h2 id="petmart-assistant-title" className="truncate text-sm font-semibold text-text-strong">Trợ lý PetMart</h2>
                            <p className="truncate text-xs text-muted-foreground">Hỗ trợ mua sắm và nhận diện ảnh</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" aria-label="Thu nhỏ trò chuyện" onClick={minimizeChat}><Minus aria-hidden="true" /></Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Đóng trợ lý" onClick={() => { setOpen(false); setDismissed(true); }}><X aria-hidden="true" /></Button>
                    </header>

                    <ol role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 space-y-3 overflow-y-auto overscroll-contain bg-surface-subtle p-4">
                        {visibleMessages.map((message, index) => {
                            const messageTime = formatMessageTime(message.timestamp);
                            return (
                                <li key={`${message.timestamp}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`min-w-0 max-w-[86%] rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-foreground"}`}>
                                        <span className="sr-only">{message.role === "user" ? "Bạn" : "Trợ lý PetMart"}: </span>
                                        {message.imageUrl && <img src={message.imageUrl} alt="Ảnh thú cưng đã gửi" className="mb-2 block max-h-44 w-full max-w-[220px] rounded-lg object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                        {messageTime && <time dateTime={message.timestamp} className={`mt-1 block text-[11px] ${message.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{messageTime}</time>}
                                    </div>
                                </li>
                            );
                        })}

                        {loading && (
                            <li className="flex justify-start" role="status">
                                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /><span>{loadingLabel}</span></div>
                            </li>
                        )}
                        <li ref={bottomRef} aria-hidden="true" />
                    </ol>

                    <div className="border-t border-border bg-surface">
                        {requestError && (
                            <div role="alert" className="flex items-start gap-2 border-b border-border bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                                <div className="min-w-0 flex-1"><p>Yêu cầu gần nhất không hoàn tất.</p><p className="mt-0.5 text-xs">{requestError}</p></div>
                                {retryAction && <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={loading} onClick={() => void retryLastRequest()}><RefreshCw aria-hidden="true" />Thử lại</Button>}
                            </div>
                        )}

                        {selectedImagePreviewUrl && (
                            <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
                                <img src={selectedImagePreviewUrl} alt="Ảnh chờ gửi" className="size-16 rounded-lg border border-border object-cover" />
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text-strong">{selectedImageFile?.name || "Ảnh đã dán"}</p><p className="text-xs text-muted-foreground">Ảnh sẽ được phân tích khi gửi.</p></div>
                                <Button type="button" variant="ghost" size="icon" disabled={loading} aria-label="Xóa ảnh đã chọn" onClick={clearSelectedImage}><X aria-hidden="true" /></Button>
                            </div>
                        )}

                        {composerError && <p id="chat-composer-error" role="alert" className="border-b border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">{composerError}</p>}

                        <form className="flex items-end gap-2 p-3" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
                            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-label="Chọn ảnh thú cưng gửi cho trợ lý" onChange={handleImageChange} className="sr-only" />
                            <Button type="button" variant="outline" size="icon" disabled={loading || !chatStorageKey} aria-label="Chọn ảnh thú cưng" aria-describedby={composerError && !hasMessageLengthError ? "chat-composer-error" : undefined} onClick={() => fileInputRef.current?.click()}><ImagePlus aria-hidden="true" /></Button>
                            <Textarea ref={inputRef} value={input} maxLength={MAX_MESSAGE_LENGTH} aria-label="Tin nhắn cho trợ lý PetMart" aria-invalid={hasMessageLengthError} onChange={(event) => { setInput(event.target.value); setComposerError(""); }} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder={chatStorageKey ? "Nhập tin nhắn…" : "Đang khởi tạo phiên…"} rows={1} disabled={!chatStorageKey} aria-describedby={`chat-composer-hint${hasMessageLengthError ? " chat-composer-error" : ""}`} className="min-h-11 max-h-28 flex-1 resize-none" />
                            <Button type="submit" size="icon" loading={loading} disabled={(!input.trim() && !selectedImageFile) || input.trim().length > MAX_MESSAGE_LENGTH || !chatStorageKey} aria-label="Gửi tin nhắn"><Send aria-hidden="true" /></Button>
                        </form>
                        <p id="chat-composer-hint" className="px-3 pb-3 text-[11px] leading-4 text-muted-foreground">Tối đa 2.000 ký tự · Enter để gửi · Shift+Enter xuống dòng · Ảnh JPG, PNG, WebP tối đa 5 MB. AI có thể trả lời chưa chính xác.</p>
                    </div>
                </section>
            ) : (
                <button ref={launcherRef} type="button" onClick={() => setOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-elevation-2 transition-colors duration-base hover:bg-primary-hover active:bg-primary-active" aria-label="Mở trợ lý PetMart">
                    <MessageCircle aria-hidden="true" className="size-5" /><span className="hidden sm:inline">Trợ lý PetMart</span>
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
