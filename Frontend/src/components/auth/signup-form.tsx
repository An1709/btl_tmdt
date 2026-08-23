import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthFormAlert, PasswordInput } from "@/components/auth/auth-form-support";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useState } from "react";

const signUpSchema = z.object({
  firstname: z.string().min(1, "Tên bắt buộc phải có"),
  lastname: z.string().min(1, "Họ bắt buộc phải có"),
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const { firstname, lastname, username, email, password } = data;

    setServerError("");

    try {
      const response = await signUp(username, password, email, firstname, lastname);
      const otpEmail = response.email || email;
      const nextExpiresAt = new Date().getTime() + (response.expiresIn || 90) * 1000;
      sessionStorage.setItem("registrationOtpEmail", otpEmail.toLowerCase());
      sessionStorage.setItem(
        `registrationOtpExpiresAt:${otpEmail.toLowerCase()}`,
        String(nextExpiresAt)
      );
      navigate(`/verify-email?email=${encodeURIComponent(otpEmail)}`);
    } catch (error) {
      const maybeError = error as { response?: { data?: { message?: unknown } } };
      const message = maybeError.response?.data?.message;
      setServerError(typeof message === "string" ? message : "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <section
      className={cn("rounded-lg border border-border bg-surface-elevated p-6 shadow-elevation-2 sm:p-8", className)}
      aria-labelledby="signup-heading"
      {...props}
    >
      <header>
        <p className="text-sm font-semibold text-primary">Tài khoản PetMart</p>
        <h1 id="signup-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
          Tạo tài khoản
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Điền thông tin bên dưới. Chúng tôi sẽ gửi mã xác minh đến email của bạn.
        </p>
      </header>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Họ" error={errors.lastname?.message} required>
            {(controlProps) => (
              <Input
                type="text"
                autoComplete="family-name"
                placeholder="Nguyễn"
                {...controlProps}
                {...register("lastname")}
              />
            )}
          </FormField>
          <FormField label="Tên" error={errors.firstname?.message} required>
            {(controlProps) => (
              <Input
                type="text"
                autoComplete="given-name"
                placeholder="An"
                {...controlProps}
                {...register("firstname")}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Tên đăng nhập"
          description="Dùng ít nhất 3 ký tự và ghi nhớ để đăng nhập."
          error={errors.username?.message}
          required
        >
          {(controlProps) => (
            <Input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="petlover"
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
              {...controlProps}
              {...register("email")}
            />
          )}
        </FormField>

        <FormField
          label="Mật khẩu"
          description="Mật khẩu cần có ít nhất 6 ký tự."
          error={errors.password?.message}
          required
        >
          {(controlProps) => (
            <PasswordInput
              autoComplete="new-password"
              placeholder="Tạo mật khẩu"
              {...controlProps}
              {...register("password")}
            />
          )}
        </FormField>

        <AuthFormAlert message={serverError} />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Tạo tài khoản
        </Button>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Khi tiếp tục, bạn đồng ý với Điều khoản và Chính sách bảo mật của PetMart.
        </p>
      </form>

      <p className="mt-6 border-t border-divider pt-5 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link to="/signin" className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}
