import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IMAGE_ASSETS } from "@/utils/constants";

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
    const accountInfoValid = await trigger(["username", "email"]);
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden p-0 border-border">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <Link to="/" className="mx-auto block w-fit text-center">
                    <img src={IMAGE_ASSETS.logo} alt="logo" />
                  </Link>

                  <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
                  <p className="text-muted-foreground text-balance">
                    {isOtpStep
                      ? "Mã OTP đã được gửi đến email của bạn."
                      : "Nhập tên đăng nhập và email đã dùng để đăng ký."}
                  </p>
                  {isOtpStep && (
                    <>
                      <p className="text-sm font-medium break-all">
                        Mã OTP đã được gửi đến: {resetFlow?.email}
                      </p>
                      <p className={isExpired ? "text-destructive text-sm" : "text-sm font-medium"}>
                        {isExpired
                          ? "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã."
                          : `Mã OTP hết hạn sau ${formatTime(secondsLeft)}`}
                      </p>
                    </>
                  )}
                </div>

                {!isOtpStep && (
                  <>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="username" className="block text-sm">
                        Tên đăng nhập
                      </Label>
                      <Input type="text" id="username" placeholder="username" {...register("username")} />
                      {errors.username && (
                        <p className="text-destructive text-sm">{errors.username.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label htmlFor="email" className="block text-sm">
                        Email
                      </Label>
                      <Input type="email" id="email" placeholder="email@example.com" {...register("email")} />
                      {errors.email && (
                        <p className="text-destructive text-sm">{errors.email.message}</p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={sendingCode}
                      onClick={handleSendCode}
                    >
                      {sendingCode ? "Đang gửi OTP..." : "Gửi mã OTP"}
                    </Button>
                  </>
                )}

                {isOtpStep && (
                  <>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="code" className="block text-sm">
                        Mã OTP
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        id="code"
                        placeholder="123456"
                        disabled={isExpired}
                        {...register("code")}
                      />
                      {errors.code && (
                        <p className="text-destructive text-sm">{errors.code.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label htmlFor="newPassword" className="block text-sm">
                        Mật khẩu mới
                      </Label>
                      <Input type="password" id="newPassword" {...register("newPassword")} />
                      {errors.newPassword && (
                        <p className="text-destructive text-sm">{errors.newPassword.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label htmlFor="confirmNewPassword" className="block text-sm">
                        Xác nhận mật khẩu mới
                      </Label>
                      <Input
                        type="password"
                        id="confirmNewPassword"
                        {...register("confirmNewPassword")}
                      />
                      {errors.confirmNewPassword && (
                        <p className="text-destructive text-sm">
                          {errors.confirmNewPassword.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="text-center text-sm underline underline-offset-4 disabled:opacity-50"
                      onClick={handleResendCode}
                      disabled={sendingCode || !canResend}
                    >
                      {sendingCode ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                    </button>
                  </>
                )}

                {serverError && <p className="text-destructive text-sm">{serverError}</p>}

                <Button type="submit" className="w-full" disabled={!isOtpStep || resetting || isExpired}>
                  {resetting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                </Button>

                <div className="text-center text-sm">
                  Đã nhớ mật khẩu?{" "}
                  <Link to="/signin" className="underline underline-offset-4" onClick={clearResetFlow}>
                    Đăng nhập
                  </Link>
                </div>
              </div>
            </form>

            <div className="bg-muted relative hidden md:block">
              <img
                src={IMAGE_ASSETS.placeholder}
                alt="Image"
                className="absolute top-1/2 -translate-y-1/2 object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
