interface LoadingProps {
    text?: string;
    fullPage?: boolean;
    size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-[3px]",
    lg: "w-14 h-14 border-4",
};

const Loading = ({ text = "Đang tải...", fullPage = false, size = "md" }: LoadingProps) => {
    const spinner = (
        <div className="flex flex-col items-center gap-3">
            <div
                className={`${sizeMap[size]} rounded-full border-[var(--pet-coral)] border-t-transparent animate-spin`}
            />
            {text && <p className="text-sm text-muted-foreground font-medium">{text}</p>}
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {spinner}
        </div>
    );
};

/** Skeleton shimmer block */
export const SkeletonBlock = ({
    className = "",
}: {
    className?: string;
}) => (
    <div
        className={`bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse rounded-xl ${className}`}
        style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
        }}
    />
);

/** Skeleton card for loading product grids */
export const ProductCardSkeleton = () => (
    <div className="pet-card overflow-hidden">
        <SkeletonBlock className="aspect-square rounded-none" />
        <div className="p-4 flex flex-col gap-3">
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-8 w-full mt-2" />
        </div>
    </div>
);

export default Loading;