interface LoadingProps {
    text?: string;
    fullPage?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-[3px]",
    lg: "w-14 h-14 border-4",
};

export const Spinner = ({ text = "Đang tải...", size = "md", className = "" }: Omit<LoadingProps, "fullPage">) => (
    <div
        className={`flex flex-col items-center gap-3 ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
    >
        <div
            aria-hidden="true"
            className={`${sizeMap[size]} rounded-full border-primary border-t-transparent animate-spin`}
        />
        {text && <p className="text-sm text-muted-foreground font-medium">{text}</p>}
    </div>
);

export const SectionLoading = ({ text = "Đang tải...", size = "md", className = "" }: Omit<LoadingProps, "fullPage">) => (
    <div className={`flex items-center justify-center py-12 ${className}`}>
        <Spinner text={text} size={size} />
    </div>
);

const Loading = ({ text = "Đang tải...", fullPage = false, size = "md", className = "" }: LoadingProps) => {

    if (fullPage) {
        return (
            <div className={`fixed inset-0 z-overlay flex items-center justify-center bg-background/85 ${className}`}>
                <Spinner text={text} size={size} />
            </div>
        );
    }

    return <SectionLoading text={text} size={size} className={className} />;
};

/** Skeleton shimmer block */
export const SkeletonBlock = ({
    className = "",
}: {
    className?: string;
}) => (
    <div className={`rounded-lg bg-muted animate-pulse ${className}`} />
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
