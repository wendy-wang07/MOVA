import { NavLink, useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { signOut } = UserAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try{
      await signOut();
      navigate("/signin");
    } catch (error){
      console.error("Failed to sign out: ", error);
    }
  };

  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <NavLink to="/" end className={linkClass}>Home</NavLink>
      <NavLink to="/share" className={linkClass}>Share</NavLink>
      <NavLink to="/view" className={linkClass}>View</NavLink>
      <NavLink to="/chat" className={linkClass}>Chat</NavLink>
      <NavLink to="/biometrics" className={linkClass}>Workouts</NavLink>

      <button type="button" className="nav-signout" onClick={handleSignOut}>
        Sign out
      </button>
    </nav>
  );
}