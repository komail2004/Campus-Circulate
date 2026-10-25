import { NavLink, Outlet } from "react-router";

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "font-bold text-blue-600" : "text-gray-600";
}

export default function Layout() {
  return (
    <div>
      <nav className="flex gap-6 border-b p-4">
        <NavLink to="/" end className={linkClass}>
          Browse
        </NavLink>
        <NavLink to="/sell" className={linkClass}>
          Sell
        </NavLink>
        <NavLink to="/login" className={linkClass}>
          Login
        </NavLink>
        <NavLink to="/deals" className={linkClass}>
          Deals
        </NavLink>
        <NavLink to="/sell" className={linkClass}>
          Messages
        </NavLink>
        <NavLink to="/sell" className={linkClass}>
          Profile
        </NavLink>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
