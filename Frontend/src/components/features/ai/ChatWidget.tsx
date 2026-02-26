import { useState, useRef, useEffect } from "react";
import { aiService, type ChatMessage } from "@/services/aiService";

const ChatWidget = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Xin chào! 🐾 Tôi là PetBot, trợ lý thú cưng của PetMart. Tôi có thể giúp gì cho bạn?",
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open, typing]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text) return;

        const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setTyping(true);

        try {
            const reply = await aiService.sendMessage({ message: text, history: messages });
            setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: new Date().toISOString() }]);
        } catch {
            setMessages((prev) => [...prev, {
                role: "assistant",
                content: "Xin lỗi, tôi gặp sự cố. Vui lòng thử lại! 🐾",
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Chat window */}
            {open && (
                <div className="w-80 h-[420px] bg-white dark:bg-card rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🐾</div>
                        <div>
                            <p className="font-bold text-white text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>PetBot</p>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                                <span className="text-white/70 text-xs">Đang hoạt động</span>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                    ${m.role === "user"
                                            ? "bg-[var(--pet-coral)] text-white rounded-br-sm"
                                            : "bg-muted text-foreground rounded-bl-sm"
                                        }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {typing && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                            placeholder="Nhập câu hỏi..."
                            className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]
                         placeholder:text-muted-foreground transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || typing}
                            className="p-2 bg-[var(--pet-coral)] text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Bubble button */}
            <button
                id="chat-widget-btn"
                onClick={() => setOpen((p) => !p)}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] text-white
                   shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl
                   relative"
                aria-label="PetBot chat"
            >
                {open ? "✕" : "🐾"}
                {!open && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>
        </div>
    );
};

export default ChatWidget;