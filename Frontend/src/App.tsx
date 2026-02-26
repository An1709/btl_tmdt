import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import AppRoutes from "@/routes/AppRoutes";
import ChatWidget from "@/components/features/ai/ChatWidget";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import AuthLayout from "./layouts/AuthLayout";

function App() {
  return (
    <>
      <Toaster position="top-right" richColors expand />
      <BrowserRouter>
        <Routes>
          {/* Auth routes use AuthLayout */}
          <Route element={<AuthLayout />}>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Route>

          {/* All other routes handled by AppRoutes */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>

        {/* Floating AI chat bubble */}
        <ChatWidget />
      </BrowserRouter>
    </>
  );
}

export default App;
