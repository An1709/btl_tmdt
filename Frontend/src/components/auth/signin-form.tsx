import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthFormAlert, PasswordInput } from "@/components/auth/auth-form-support";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const signInSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInLocationState {
  from?: string;
  routeState?: unknown;
}

const getSafeReturnPath = (state: SignInLocationState | null) => {
  const returnPath = state?.from;
  return typeof returnPath === "string"
    && returnPath.startsWith("/")
    && !returnPath.startsWith("//")
    ? returnPath
    : null;
};

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signIn } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormValues) => {
    const { username, password } = data;
    setServerError("");

    try {
      await signIn(username, password);
      const currentUser = useAuthStore.getState().user;
      const returnState = location.state as SignInLocationState | null;
      const returnPath = getSafeReturnPath(returnState);

      if (returnPath) {
        navigate(returnPath, { replace: true, state: returnState?.routeState });
      } else if (currentUser?.role === "admin" || currentUser?.role === "staff") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      const authError = (error as {
        response?: { data?: { code?: string; email?: string; message?: unknown } };
      }).response?.data;

      if (authError?.code === "EMAIL_NOT_VERIFIED" && authError.email) {
        const normalizedEmail = authError.email.toLowerCase();
        sessionStorage.setItem("registrationOtpEmail", normalizedEmail);
        sessionStorage.setItem(`registrationOtpExpiresAt:${normalizedEmail}`, String(new Date().getTime()));
        navigate(`/verify-email?email=${encodeURIComponent(authError.email)}`, {
          state: location.state,
        });
        return;
      }

      setServerError(
        typeof authError?.message === "string"
          ? authError.message
          : "Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại."
      );
    }
  };

  return (
    <section
      className={cn("rounded-lg border border-border bg-surface-elevated p-6 shadow-elevation-2 sm:p-8", className)}
      aria-labelledby="signin-heading"
      {...props}
    >
      <header>
        <p className="text-sm font-semibold text-primary">Tài khoản PetMart</p>
        <h1 id="signin-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
          Chào mừng bạn quay lại
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Đăng nhập để tiếp tục mua sắm và quản lý đơn hàng của bạn.
        </p>
      </header>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Tên đăng nhập" error={errors.username?.message} required>
          {(controlProps) => (
            <Input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Nhập tên đăng nhập"
              {...controlProps}
              {...register("username")}
            />
          )}
        </FormField>

        <FormField label="Mật khẩu" error={errors.password?.message} required>
          {(controlProps) => (
            <PasswordInput
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              {...controlProps}
              {...register("password")}
            />
          )}
        </FormField>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45">
            Quên mật khẩu?
          </Link>
        </div>

        <AuthFormAlert message={serverError} />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 border-t border-divider pt-5 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link to="/signup" className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45">
          Đăng ký
        </Link>
      </p>
    </section>
  );
}
