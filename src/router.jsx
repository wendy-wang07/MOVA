import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx";
import { Signup } from "./components/Signup";
import { Signin } from "./components/Signin";
import PrivateRoute from "./components/PrivateRoute.jsx";
import HomePage from "./pages/HomePage";
import UploadImage from "./pages/UploadImage";
import GalleryPage from "./pages/GalleryPage";
import ExerciseTracker from "./pages/ExerciseTracker"

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
      { path: "exercise", element: <ExerciseTracker/> }
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);