import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { maskEmail } from "@/components/auth/auth-display-utils";
import { AuthFormAlert, PasswordInput } from "@/components/auth/auth-form-support";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";

const OTP_TTL_SECONDS = 90;
const RESEND_COOLDOWN_SECONDS = 30;
const LEGACY_PASSWORD_RESET_FLOW_KEY = "passwordResetOtpFlow";

const forgotPasswordSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  email: z.email("Email không hợp lệ"),
  code: z.string().regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmNewPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu mới"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  path: ["confirmNewPassword"],
  message: "Mật khẩu xác nhận không khớp",
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type PasswordResetFlow = {
  username: string;
  email: string;
  expiresAt: number;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as { response?: { data?: { message?: unknown } } };
  const message = maybeError.response?.data?.message;

  if (typeof message === "string") return message;

  return fallback;
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [resetFlow, setResetFlow] = useState<PasswordResetFlow | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      username: "",
      email: "",
      code: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const isOtpStep = Boolean(resetFlow);
  const isExpired = isOtpStep && secondsLeft <= 0;
  const canResend = isOtpStep && secondsLeft <= OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS;

  useEffect(() => {
    sessionStorage.removeItem(LEGACY_PASSWORD_RESET_FLOW_KEY);

    return () => {
      sessionStorage.removeItem(LEGACY_PASSWORD_RESET_FLOW_KEY);
    };
  }, []);

  useEffect(() => {
    if (!resetFlow) return;

    const updateSecondsLeft = () => {
      setSecondsLeft(Math.max(0, Math.ceil((resetFlow.expiresAt - new Date().getTime()) / 1000)));
    };

    updateSecondsLeft();
    const timerId = window.setInterval(updateSecondsLeft, 1000);

    return () => window.clearInterval(timerId);
  }, [resetFlow]);

  useEffect(() => {
    if (isExpired) {
      setServerError((currentError) =>
        currentError || "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã."
      );
    }
  }, [isExpired]);

  const saveResetFlow = (username: string, email: string, expiresIn = OTP_TTL_SECONDS) => {
    const nextFlow = {
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      expiresAt: new Date().getTime() + expiresIn * 1000,
    };

    setResetFlow(nextFlow);
    setSecondsLeft(expiresIn);
    setValue("username", nextFlow.username);
    setValue("email", nextFlow.email);
  };

  const clearResetFlow = () => {
    sessionStorage.removeItem(LEGACY_PASSWORD_RESET_FLOW_KEY);
    setResetFlow(null);
    setSecondsLeft(OTP_TTL_SECONDS);
    setServerError("");
    setValue("code", "");
    setValue("newPassword", "");
    setValue("confirmNewPassword", "");
  };

  const handleSendCode = async () => {
    const accountInfoValid = await trigger(["username", "email"], { shouldFocus: true });
    if (!accountInfoValid) return;

    const username = getValues("username");
    const email = getValues("email");

    setSendingCode(true);
    setServerError("");
    clearResetFlow();

    try {
      const response = await authService.forgotPassword(username, email);
      if (response.success !== true) {
        setServerError(response.message || "Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      saveResetFlow(username, email, response.expiresIn || OTP_TTL_SECONDS);
      setValue("code", "");
      toast.success("Mã OTP đã được gửi đến email của bạn.");
    } catch (error) {
      setServerError(getErrorMessage(error, "Không thể gửi mã OTP lúc này. Vui lòng thử lại sau."));
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!resetFlow || !canResend) return;

    setSendingCode(true);
    setServerError("");

    try {
      const response = await authService.forgotPassword(resetFlow.username, resetFlow.email);
      if (response.success !== true) {
        setServerError(response.message || "Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      saveResetFlow(resetFlow.username, resetFlow.email, response.expiresIn || OTP_TTL_SECONDS);
      setValue("code", "");
      toast.success("Mã OTP mới đã được gửi.");
    } catch (error) {
      setServerError(getErrorMessage(error, "Không thể gửi lại mã OTP lúc này."));
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (!resetFlow) return;

    if (isExpired) {
      setServerError("Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.");
      return;
    }

    setResetting(true);
    setServerError("");

    try {
      await authService.resetPassword(
        resetFlow.username,
        resetFlow.email,
        data.code,
        data.newPassword,
        data.confirmNewPassword
      );
      clearResetFlow();
      toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
      navigate("/signin");
    } catch (error) {
      setServerError(getErrorMessage(error, "Mã OTP không đúng hoặc đã hết hạn."));
    } finally {
      setResetting(false);
    }
  };

  const expiryMessage = "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.";
  const resendWaitSeconds = Math.max(0, secondsLeft - (OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS));

  return (
    <section
      className="rounded-lg border border-border bg-surface-elevated p-6 shadow-elevation-2 sm:p-8"
      aria-labelledby="forgot-password-heading"
    >
      <header>
        <p className="text-sm font-semibold text-primary">Bước {isOtpStep ? "2" : "1"} / 2</p>
        <h1 id="forgot-password-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
          {isOtpStep ? "Tạo mật khẩu mới" : "Khôi phục mật khẩu"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isOtpStep
            ? "Nhập mã xác minh và chọn mật khẩu mới cho tài khoản của bạn."
            : "Nhập đúng tên đăng nhập và email đã dùng khi đăng ký."}
        </p>
      </header>

      {isOtpStep && resetFlow && (
        <div className="mt-6 rounded-md border border-border bg-surface-subtle px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Mã đã được gửi đến <span className="font-semibold text-text-strong">{maskEmail(resetFlow.email)}</span>
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${isExpired ? "text-destructive" : "text-text-strong"}`}
            aria-live={isExpired ? "polite" : "off"}
          >
            {isExpired ? expiryMessage : `Mã hết hạn sau ${formatTime(secondsLeft)}`}
          </p>
        </div>
      )}

      <form
        className="mt-6 space-y-5"
        onSubmit={isOtpStep
          ? handleSubmit(onSubmit)
          : (event) => {
              event.preventDefault();
              void handleSendCode();
            }}
        noValidate
      >
        {!isOtpStep && (
          <>
            <FormField label="Tên đăng nhập" error={errors.username?.message} required>
              {(controlProps) => (
                <Input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Nhập tên đăng nhập"
                  disabled={sendingCode}
                  {...controlProps}
                  {...register("username")}
                />
              )}
            </FormField>

            <FormField label="Email" error={errors.email?.message} required>
              {(controlProps) => (
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ban@example.com"
                  disabled={sendingCode}
                  {...controlProps}
                  {...register("email")}
                />
              )}
            </FormField>
          </>
        )}

        {isOtpStep && (
          <>
            <FormField
              label="Mã OTP"
              description="Nhập mã gồm 6 chữ số trong email."
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
                  disabled={isExpired || sendingCode || resetting}
                  className="font-mono text-lg tracking-[0.32em]"
                  {...controlProps}
                  {...register("code")}
                />
              )}
            </FormField>

            <FormField
              label="Mật khẩu mới"
              description="Mật khẩu cần có ít nhất 6 ký tự."
              error={errors.newPassword?.message}
              required
            >
              {(controlProps) => (
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                  disabled={isExpired || sendingCode || resetting}
                  {...controlProps}
                  {...register("newPassword")}
                />
              )}
            </FormField>

            <FormField label="Xác nhận mật khẩu mới" error={errors.confirmNewPassword?.message} required>
              {(controlProps) => (
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={isExpired || sendingCode || resetting}
                  {...controlProps}
                  {...register("confirmNewPassword")}
                />
              )}
            </FormField>
          </>
        )}

        <AuthFormAlert message={serverError === expiryMessage ? "" : serverError} />

        {!isOtpStep ? (
          <Button type="submit" className="w-full" loading={sendingCode}>
            Gửi mã OTP
          </Button>
        ) : (
          <>
            <Button type="submit" className="w-full" loading={resetting} disabled={isExpired || sendingCode}>
              Đặt lại mật khẩu
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                loading={sendingCode}
                disabled={!canResend || resetting}
              >
                {canResend ? "Gửi lại mã" : `Gửi lại sau ${formatTime(resendWaitSeconds)}`}
              </Button>
              <Button type="button" variant="ghost" onClick={clearResetFlow} disabled={sendingCode || resetting}>
                Đổi thông tin tài khoản
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 border-t border-divider pt-5 text-center text-sm text-muted-foreground">
        Đã nhớ mật khẩu?{" "}
        <Link
          to="/signin"
          className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45"
          onClick={clearResetFlow}
        >
          Đăng nhập
        </Link>
      </p>
    </section>
  );
};

export default ForgotPasswordPage;
