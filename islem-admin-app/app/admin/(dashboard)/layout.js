import "../admin.css";
import Link from "next/link";
import { logoutAction } from "../logoutAction";

// Everything under this route group already passed middleware.js,
// which redirects unauthenticated requests to /admin/login before
// this layout (or any page inside it) ever renders.
export default function DashboardLayout({ children }) {
  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="brand">I. Z. — Admin</div>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/photos">Photographs</Link>
        <Link href="/admin/categories">Categories</Link>
        <Link href="/admin/projects">Projects</Link>
        <Link href="/admin/about">About</Link>
        <form action={logoutAction} className="logout">
          <button className="logout-btn" type="submit">Log out</button>
        </form>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
