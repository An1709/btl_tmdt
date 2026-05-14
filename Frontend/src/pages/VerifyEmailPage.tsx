import { useMemo, useState } from "react";
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

const verifyEmailSchema = z.object({
  email: z.email("Email không hợp lệ"),
  code: z.string().regex(/^\d{6}$/, "Mã xác minh phải gồm 6 chữ số"),
});

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as { response?: { data?: { message?: unknown } } };
  const message = maybeError.response?.data?.message;

  if (typeof message === "string") return message;

  return fallback;
};

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
    },
  });

  const onSubmit = async (data: VerifyEmailFormValues) => {
    setSubmitting(true);
    setServerError("");

    try {
      await authService.verifyEmail(data.email, data.code);
      toast.success("Xác minh email thành công! Vui lòng đăng nhập.");
      navigate("/signin");
    } catch (error) {
      setServerError(getErrorMessage(error, "Mã xác minh không hợp lệ hoặc đã hết hạn."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const email = getValues("email");
    setResending(true);
    setServerError("");

    try {
      await authService.resendVerificationCode(email);
      toast.success("Đã gửi lại mã xác minh. Vui lòng kiểm tra email.");
    } catch (error) {
      setServerError(getErrorMessage(error, "Không thể gửi lại mã xác minh lúc này."));
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
                    <img src="/logo.svg" alt="logo" />
                  </Link>

                  <h1 className="text-2xl font-bold">Xác minh email</h1>
                  <p className="text-muted-foreground text-balance">
                    Nhập mã 6 chữ số đã được gửi đến email của bạn.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Label htmlFor="email" className="block text-sm">
                    Email
                  </Label>
                  <Input type="email" id="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-destructive text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Label htmlFor="code" className="block text-sm">
                    Mã xác minh
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    id="code"
                    placeholder="123456"
                    {...register("code")}
                  />
                  {errors.code && (
                    <p className="text-destructive text-sm">{errors.code.message}</p>
                  )}
                </div>

                {serverError && <p className="text-destructive text-sm">{serverError}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Đang xác minh..." : "Xác minh tài khoản"}
                </Button>

                <button
                  type="button"
                  className="text-center text-sm underline underline-offset-4 disabled:opacity-50"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Đang gửi lại..." : "Gửi lại mã xác minh"}
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
                src="/placeholderSignUp.png"
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
