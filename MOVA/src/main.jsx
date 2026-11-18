import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { AuthContextProvider } from "./context/AuthContext.jsx";
 
ReactDOM.createRoot(document.getElementById("root")).render( 
  <React.StrictMode> 
    <>
    <h1 className="text-center pt-4 text-3xl">
      MOVA
    </h1>
    <AuthContextProvider>
      <RouterProvider router= {router} />
    </AuthContextProvider>
    </>
  </React.StrictMode> 
);