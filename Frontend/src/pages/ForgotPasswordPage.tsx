import { useState } from "react";
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

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeError = error as { response?: { data?: { message?: unknown } } };
  const message = maybeError.response?.data?.message;

  if (typeof message === "string") return message;

  return fallback;
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
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

  const handleSendCode = async () => {
    const accountInfoValid = await trigger(["username", "email"]);
    if (!accountInfoValid) return;

    setSendingCode(true);
    setServerError("");

    try {
      await authService.forgotPassword(getValues("username"), getValues("email"));
      setCodeSent(true);
      toast.success("Nếu thông tin tài khoản hợp lệ, mã xác nhận sẽ được gửi đến email của bạn.");
    } catch (error) {
      setServerError(getErrorMessage(error, "Không thể gửi mã OTP lúc này. Vui lòng thử lại sau."));
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setResetting(true);
    setServerError("");

    try {
      await authService.resetPassword(
        data.email,
        data.code,
        data.newPassword,
        data.confirmNewPassword
      );
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
                    <img src="/logo.svg" alt="logo" />
                  </Link>

                  <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
                  <p className="text-muted-foreground text-balance">
                    Nhập tên đăng nhập và email đã dùng để đăng ký.
                  </p>
                </div>

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
                  {sendingCode ? "Đang gửi OTP..." : codeSent ? "Gửi lại OTP" : "Gửi mã OTP"}
                </Button>

                {codeSent && (
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
                  </>
                )}

                {serverError && <p className="text-destructive text-sm">{serverError}</p>}

                <Button type="submit" className="w-full" disabled={!codeSent || resetting}>
                  {resetting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                </Button>

                <div className="text-center text-sm">
                  Đã nhớ mật khẩu?{" "}
                  <Link to="/signin" className="underline underline-offset-4">
                    Đăng nhập
                  </Link>
                </div>
              </div>
            </form>

            <div className="bg-muted relative hidden md:block">
              <img
                src="/placeholder.png"
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
