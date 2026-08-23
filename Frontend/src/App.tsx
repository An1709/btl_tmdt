import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import AppRoutes from "@/routes/AppRoutes";
import ChatWidget from "@/components/features/ai/ChatWidget";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const clearLocalCart = useCartStore((state) => state.clearLocalCart);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!initialized) return;

    if (user?._id) {
      void fetchCart(user._id);
    } else {
      clearLocalCart();
    }
  }, [clearLocalCart, fetchCart, initialized, user?._id]);

  return (
    <>
      <Toaster position="top-right" richColors expand toastOptions={{ duration: 4500 }} />
      <BrowserRouter>
        <AppRoutes />

        {/* Floating AI chat bubble */}
        <ChatWidget />
      </BrowserRouter>
    </>
  );
}

export default App;
