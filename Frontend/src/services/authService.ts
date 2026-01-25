import api from "@/lib/axios";

//file này dùng để tương tác với các API liên quan đến xác thực người dùng như đăng ký, đăng nhập, đăng xuất và lấy thông tin người dùng hiện tại.

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstname: string,
    lastname: string
  ) => {
    const response = await api.post("/auth/signup", {
      username,
      password,
      email,
      firstName: firstname,
      lastName: lastname
    });
    return response.data;
  },

  signIn: async (username: string, password: string) => {
    const response = await api.post("/auth/signin", {username, password}, {withCredentials: true});
    return response.data; // Return the entire response data
  },

  signOut: async () => {
    return api.post("/auth/signout", {}, {withCredentials: true});
  },
  
  fetchMe: async () => {
    const response = await api.get("/users/me", {withCredentials: true}); // lấy thông tin người dùng hiện tại
    return response.data; // Gửi về dữ liệu người dùng cho store
  },

  refresh: async () => {
    const response = await api.post("/auth/refresh", {}, {withCredentials: true});
    return response.data.accessToken; // Return the entire response data
  }
};
