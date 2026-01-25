import Logout from "@/components/auth/Logout";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

const HomePage = () => {
  const user = useAuthStore((state) => state.user);

  const handleOnClick = async () => {
    try {
      await api.get("/users/test", { withCredentials: true });
      toast.success("API test successful!");
    } catch (error) {
      console.error("API test failed:", error);
      toast.error("API test failed. Please try again.");
    }
  };

  return (
    <div>
      {user?.username}, welcome to Home Page!
      <Logout />
      <button onClick={handleOnClick}>Test API</button>
    </div>
  );
};

export default HomePage;
