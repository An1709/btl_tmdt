import { useAuthStore } from "@/stores/useAuthStore";
import axios from "axios";

//file này dùng để cấu hình axios instance với các interceptor để tự động thêm token xác thực vào header của các yêu cầu và xử lý làm mới token khi hết hạn.  

const api = axios.create({
    baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
    withCredentials: true,
});

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
  async (error) => {
    const originalRequest = error.config;

    //những api không cần check
    if(originalRequest.url.includes("/auth/signin") || originalRequest.url.includes("/auth/signup") || originalRequest.url.includes("/auth/refresh")){ 
      return Promise.reject(error);
    }

    originalRequest._retryCount = originalRequest._retryCount || 0;

    if (error.response.status === 403 && originalRequest._retryCount < 5) {
      originalRequest._retryCount += 1;

      console.log("refresh", originalRequest._retryCount);

      try {
        const res = await api.post("/auth/refresh", {}, { withCredentials: true });
        const { accessToken } = res.data.accessToken; 

        useAuthStore.getState().setAccessToken(accessToken);
      }
      catch (err) {
        useAuthStore.getState().clearState();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);


export default api;