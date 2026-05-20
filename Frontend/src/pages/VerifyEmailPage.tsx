import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
      navigate("/signin");
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

                  <h1 className="text-2xl font-bold">Xác minh email</h1>
                  <p className="text-muted-foreground text-balance">
                    Nhập mã 6 chữ số đã được gửi đến email của bạn.
                  </p>
                  <p className="text-sm font-medium break-all">
                    Mã OTP đã được gửi đến: {email}
                  </p>
                  <p className={isExpired ? "text-destructive text-sm" : "text-sm font-medium"}>
                    {isExpired
                      ? "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã."
                      : `Mã OTP hết hạn sau ${formatTime(secondsLeft)}`}
                  </p>
                </div>

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

                {serverError && <p className="text-destructive text-sm">{serverError}</p>}

                <Button type="submit" className="w-full" disabled={submitting || isExpired}>
                  {submitting ? "Đang xác minh..." : "Xác minh tài khoản"}
                </Button>

                <button
                  type="button"
                  className="text-center text-sm underline underline-offset-4 disabled:opacity-50"
                  onClick={handleResend}
                  disabled={resending || !canResend}
                >
                  {resending ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                </button>

                <div className="text-center text-sm">
                  Đã xác minh?{" "}
                  <Link to="/signin" className="underline underline-offset-4">
                    Đăng nhập
                  </Link>
                </div>
              </div>
            </form>

            <div className="bg-muted relative hidden md:block">
              <img
                src={IMAGE_ASSETS.placeholderSignUp}
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

export default VerifyEmailPage;
