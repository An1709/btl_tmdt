import { useAuthStore } from "@/stores/useAuthStore";
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/utils/constants";

//file này dùng để cấu hình axios instance với các interceptor để tự động thêm token xác thực vào header của các yêu cầu và xử lý làm mới token khi hết hạn.  

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<string> | null = null;

const getRefreshedAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = api
      .post<{ accessToken: string }>("/auth/refresh", {}, { withCredentials: true })
      .then((response) => response.data.accessToken)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Skip auth routes
    if (
      requestUrl.includes("/auth/signin") ||
      requestUrl.includes("/auth/signup") ||
      requestUrl.includes("/auth/verify-email") ||
      requestUrl.includes("/auth/resend-verification-code") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // Only retry once on 401 (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const accessToken = await getRefreshedAccessToken();
        useAuthStore.getState().setAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        useAuthStore.getState().clearState();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);


export default api;
