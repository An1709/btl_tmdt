import { forwardRef, useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-12", className)}
          disabled={disabled}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-strong"
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={disabled}
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

function AuthFormAlert({ message }: { message: string }) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) alertRef.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="flex gap-2.5 rounded-md border border-destructive/30 bg-destructive-subtle px-3.5 py-3 text-sm leading-5 text-destructive-subtle-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export { AuthFormAlert, PasswordInput };
