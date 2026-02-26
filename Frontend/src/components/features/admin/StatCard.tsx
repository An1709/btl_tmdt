interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    trend?: number; // percentage change
    color?: "coral" | "mint" | "amber" | "purple";
}

const colorMap = {
    coral: { bg: "from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/20", border: "border-red-100 dark:border-red-900/30", icon: "bg-[var(--pet-coral)] text-white" },
    mint: { bg: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20", border: "border-teal-100 dark:border-teal-900/30", icon: "bg-[var(--pet-mint)] text-white" },
    amber: { bg: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20", border: "border-amber-100 dark:border-amber-900/30", icon: "bg-amber-400 text-white" },
    purple: { bg: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20", border: "border-purple-100 dark:border-purple-900/30", icon: "bg-violet-500 text-white" },
};

const StatCard = ({ label, value, icon, trend, color = "coral" }: StatCardProps) => {
    const c = colorMap[color];
    const trendUp = trend !== undefined && trend >= 0;

    return (
        <div className={`p-5 rounded-2xl border bg-gradient-to-br ${c.bg} ${c.border}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.icon}`}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {trendUp ? "▲" : "▼"} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {value}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
    );
};

export default StatCard;