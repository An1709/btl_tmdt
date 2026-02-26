import { useEffect, type RefObject } from "react";

/**
 * Fires `callback` when a click occurs outside `ref`.
 * Useful for closing dropdowns and modals.
 */
export const useClickOutside = <T extends HTMLElement>(
    ref: RefObject<T>,
    callback: () => void
): void => {
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, callback]);
};