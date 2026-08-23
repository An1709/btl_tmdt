import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authService } from "@/services/authService";
import { maskEmail } from "@/components/auth/auth-display-utils";
import { AuthFormAlert } from "@/components/auth/auth-form-support";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số"),
});

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as { response?: { data?: { message?: unknown } } };
  const message = maybeError.response?.data?.message;

  if (typeof message === "string") return message;

  return fallback;
};

const OTP_TTL_SECONDS = 90;
const RESEND_COOLDOWN_SECONDS = 30;

const getStoredExpiresAt = (email: string) => {
  if (!email) return new Date().getTime() + OTP_TTL_SECONDS * 1000;

  const storedValue = sessionStorage.getItem(`registrationOtpExpiresAt:${email.toLowerCase()}`);
  const storedExpiresAt = Number(storedValue);

  return Number.isFinite(storedExpiresAt) && storedExpiresAt > 0
    ? storedExpiresAt
    : new Date().getTime() + OTP_TTL_SECONDS * 1000;
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const registrationEmail = useMemo(
    () => sessionStorage.getItem("registrationOtpEmail") || "",
    []
  );
  const email = registrationEmail || emailFromQuery;
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => getStoredExpiresAt(email));
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((getStoredExpiresAt(email) - new Date().getTime()) / 1000))
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  const isExpired = secondsLeft <= 0;
  const canResend = secondsLeft <= OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS;

  useEffect(() => {
    if (!registrationEmail || (emailFromQuery && emailFromQuery.toLowerCase() !== registrationEmail)) {
      navigate("/signup", { replace: true });
    }
  }, [emailFromQuery, navigate, registrationEmail]);

  useEffect(() => {
    const updateSecondsLeft = () => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - new Date().getTime()) / 1000)));
    };

    updateSecondsLeft();
    const timerId = window.setInterval(updateSecondsLeft, 1000);

    return () => window.clearInterval(timerId);
  }, [expiresAt]);

  useEffect(() => {
    if (isExpired) {
      setServerError((currentError) =>
        currentError || "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã."
      );
    }
  }, [isExpired]);

  const onSubmit = async (data: VerifyEmailFormValues) => {
    if (isExpired) {
      setServerError("Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.");
      return;
    }

    setSubmitting(true);
    setServerError("");

    try {
      await authService.verifyEmail(email, data.code);
      sessionStorage.removeItem("registrationOtpEmail");
      sessionStorage.removeItem(`registrationOtpExpiresAt:${email.toLowerCase()}`);
      toast.success("Xác thực email thành công. Tài khoản của bạn đã được tạo.");
      navigate("/signin", { state: location.state });
    } catch (error) {
      setServerError(getErrorMessage(error, "Mã OTP không hợp lệ."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    setResending(true);
    setServerError("");

    try {
      const response = await authService.resendVerificationCode(email);
      const nextExpiresAt = new Date().getTime() + (response.expiresIn || OTP_TTL_SECONDS) * 1000;
      sessionStorage.setItem(`registrationOtpExpiresAt:${email.toLowerCase()}`, String(nextExpiresAt));
      setExpiresAt(nextExpiresAt);
      setSecondsLeft(OTP_TTL_SECONDS);
      setValue("code", "");
      toast.success(response.message || "Mã OTP mới đã được gửi.");
    } catch (error) {
      setServerError(getErrorMessage(error, "Không thể gửi lại mã OTP lúc này."));
    } finally {
      setResending(false);
    }
  };

  const expiryMessage = "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.";
  const resendWaitSeconds = Math.max(0, secondsLeft - (OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS));

  return (
    <section
      className="rounded-lg border border-border bg-surface-elevated p-6 shadow-elevation-2 sm:p-8"
      aria-labelledby="verify-email-heading"
    >
      <header>
        <p className="text-sm font-semibold text-primary">Bước cuối cùng</p>
        <h1 id="verify-email-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
          Xác minh email
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Nhập mã gồm 6 chữ số để hoàn tất việc tạo tài khoản.
        </p>
      </header>

      <div className="mt-6 rounded-md border border-border bg-surface-subtle px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Mã đã được gửi đến <span className="font-semibold text-text-strong">{maskEmail(email)}</span>
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${isExpired ? "text-destructive" : "text-text-strong"}`}
          aria-live={isExpired ? "polite" : "off"}
        >
          {isExpired ? expiryMessage : `Mã hết hạn sau ${formatTime(secondsLeft)}`}
        </p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Mã OTP"
          description="Bạn có thể dán toàn bộ mã từ email."
          error={errors.code?.message}
          required
        >
          {(controlProps) => (
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              disabled={isExpired || submitting || resending}
              className="font-mono text-lg tracking-[0.32em]"
              {...controlProps}
              {...register("code")}
            />
          )}
        </FormField>

        <AuthFormAlert message={serverError === expiryMessage ? "" : serverError} />

        <Button type="submit" className="w-full" loading={submitting} disabled={isExpired || resending}>
          Xác minh tài khoản
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={handleResend}
          loading={resending}
          disabled={!canResend || submitting}
        >
          {canResend ? "Gửi lại mã OTP" : `Có thể gửi lại sau ${formatTime(resendWaitSeconds)}`}
        </Button>
      </form>

      <p className="mt-6 border-t border-divider pt-5 text-center text-sm text-muted-foreground">
        Đã xác minh?{" "}
        <Link to="/signin" state={location.state} className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
};

export default VerifyEmailPage;
