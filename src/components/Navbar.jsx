import { NavLink } from "react-router-dom";
import { UserAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { signOut } = UserAuth();

  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <NavLink to="/" end className={linkClass}>Home</NavLink>
      <NavLink to="/share" className={linkClass}>Share</NavLink>
      <NavLink to="/view" className={linkClass}>View</NavLink>
      <NavLink to="/exercise" className={linkClass}>Track Exercise</NavLink>

      <button type="button" className="nav-signout" onClick={signOut}>
        Sign out
      </button>
    </nav>
  );
}