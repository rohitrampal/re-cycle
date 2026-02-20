import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="min-h-[calc(100vh-3.5rem)] flex-1">
        <Outlet />
      </main>
    </>
  );
}
