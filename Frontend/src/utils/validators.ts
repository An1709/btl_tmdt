// src/utils/validators.ts

/**
 * Kiểm tra định dạng Email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Kiểm tra số điện thoại Việt Nam (10 số, bắt đầu bằng 0)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
  return phoneRegex.test(phone);
};

/**
 * Kiểm tra độ mạnh mật khẩu (Tối thiểu 6 ký tự)
 * Có thể mở rộng thêm: phải có chữ hoa, số, ký tự đặc biệt
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Kiểm tra chuỗi rỗng
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Helper để validate form đăng ký
 */
export const validateRegisterForm = (values: any) => {
  const errors: Record<string, string> = {};

  if (!values.username) errors.username = "Username không được để trống";
  if (!isValidEmail(values.email)) errors.email = "Email không hợp lệ";
  if (!isValidPassword(values.password)) errors.password = "Mật khẩu phải từ 6 ký tự";
  if (!isValidPhone(values.phone)) errors.phone = "Số điện thoại không hợp lệ";
  if (values.password !== values.confirmPassword) errors.confirmPassword = "Mật khẩu nhập lại không khớp";

  return errors;
};