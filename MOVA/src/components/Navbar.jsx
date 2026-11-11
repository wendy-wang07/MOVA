import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <NavLink to="/" end className={linkClass}>Home</NavLink>
      <NavLink to="/share" className={linkClass}>Share</NavLink>
      <NavLink to="/view" className={linkClass}>View</NavLink>
    </nav>
  );
}