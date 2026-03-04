import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Sidebar />
      <main className="min-h-[calc(100vh-3.5rem)] flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
