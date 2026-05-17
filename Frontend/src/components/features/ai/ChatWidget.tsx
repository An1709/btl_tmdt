import { useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, Send, X } from "lucide-react";
import { useLocation } from "react-router";
import { aiService, type ChatMessage } from "@/services/aiService";

const greetingMessage: ChatMessage = {
    role: "assistant",
    content: "Xin chào! Mình có thể hỗ trợ bạn chọn sản phẩm, kiểm tra đơn hàng hoặc hướng dẫn thanh toán.",
    timestamp: new Date().toISOString(),
};

const hiddenPathPrefixes = ["/admin", "/signin", "/signup", "/verify-email", "/forgot-password"];

const getErrorMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
    || "Không thể gửi tin nhắn. Vui lòng thử lại.";

const ChatWidget = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([greetingMessage]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const hidden = hiddenPathPrefixes.some((path) => location.pathname.startsWith(path));

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

    if (hidden) return null;

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages((current) => [...current, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const reply = await aiService.sendMessage(text);
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: reply,
                    timestamp: new Date().toISOString(),
                },
            ]);
        } catch (error) {
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: getErrorMessage(error),
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
        }
    };

    return (
        <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
            {open && (
                <section className="w-[calc(100vw-2rem)] max-w-sm h-[480px] bg-white dark:bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in-up">
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
                        {messages.map((message, index) => (
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
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground shadow-sm">
                                    <span className="sr-only">Đang trả lời...</span>
                                    <div className="flex items-center gap-2">
                                        <span>Đang trả lời</span>
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

                    <form
                        className="p-3 border-t border-border bg-white dark:bg-card flex gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void sendMessage();
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn..."
                            rows={1}
                            className="flex-1 min-h-10 max-h-24 px-3 py-2 rounded-xl border border-border bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="w-10 h-10 rounded-xl bg-[var(--pet-coral)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                            aria-label="Gửi"
                        >
                            <Send className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </form>
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
