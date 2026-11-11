import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkStyle = ({ isActive }) => ({
    marginRight: 20,
    fontWeight: isActive ? "bold" : "normal",
    textDecoration: isActive ? "underline" : "none",
  });

  return (
    <nav style={{ padding: "12px 20px", borderBottom: "1px solid #ccc" }}>
      <NavLink to="/" end style={linkStyle}>Home</NavLink>
      <NavLink to="/share" style={linkStyle}>Share</NavLink>
      <NavLink to="/view" style={linkStyle}>View</NavLink>
    </nav>
  );
}