import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
// import "./App.css";
//TESTINGNGNGNGGNBGNN
import "./pages/pages.css";

export default function App() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}