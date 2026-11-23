import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx";
import { Signup } from "./components/Signup";
import { Signin } from "./components/Signin";
import PrivateRoute from "./components/PrivateRoute.jsx";
import HomePage from "./pages/HomePage";
import UploadImage from "./pages/UploadImage";
import GalleryPage from "./pages/GalleryPage";
import ChatPage from "./pages/ChatPage";
import BiometricsPage from "./pages/BiometricsPage";

export const router = createBrowserRouter([
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },

  {
    path: "/",
    element: (
      <PrivateRoute>
        <App />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "share", element: <UploadImage /> },
      { path: "view", element: <GalleryPage /> },
      { path: "chat", element: <ChatPage />},
      { path: "biometrics", element: <BiometricsPage /> },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);