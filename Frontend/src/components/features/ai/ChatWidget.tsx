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
    const inputRef = useRef<HTMLInputElement>(null);

    // scroll xuống cuối
    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open, typing]);

    // auto focus khi mở chat
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const sendMessage = async () => {
        if (typing) return; // ❗ chặn spam

        const text = input.trim();
        if (!text) return;

        const userMsg: ChatMessage = {
            role: "user",
            content: text,
            timestamp: new Date().toISOString()
        };

        // ❗ fix bug history
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setTyping(true);

        try {
            // ❗ giới hạn history (10 tin nhắn gần nhất)
            const history = newMessages.slice(-10);

            const reply = await aiService.sendMessage({
                message: text,
                history
            });

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: reply,
                    timestamp: new Date().toISOString()
                }
            ]);
        } catch (error: any) {
            console.error("AI ERROR:", error); // ❗ debug

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Lỗi: " +
                        (error?.response?.data?.message || error.message || "Không xác định"),
                    timestamp: new Date().toISOString(),
                }
            ]);
        } finally {
            setTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {open && (
                <div className="w-80 h-[420px] bg-white dark:bg-card rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in-up">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[var(--pet-coral)] to-[var(--pet-mint)] p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🐾</div>
                        <div>
                            <p className="font-bold text-white text-sm">PetBot</p>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                                <span className="text-white/70 text-xs">Đang hoạt động</span>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white">
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm
                                    ${m.role === "user"
                                            ? "bg-[var(--pet-coral)] text-white"
                                            : "bg-muted text-foreground"
                                        }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {typing && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl px-4 py-3 flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border flex gap-2">
                        <input
                            ref={inputRef} // ❗ auto focus
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                            placeholder="Nhập câu hỏi..."
                            className="flex-1 px-3 py-2 rounded-xl border border-border text-sm"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || typing}
                            className="p-2 bg-[var(--pet-coral)] text-white rounded-xl disabled:opacity-40"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Button */}
            <button
                onClick={() => setOpen((p) => !p)}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--pet-coral)] to-[var(--pet-mint)] text-white text-2xl"
            >
                {open ? "✕" : "🐾"}
            </button>
        </div>
    );
};

export default ChatWidget;