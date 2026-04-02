import { useState } from "react";
import AdminWorkspace from "./components/Admin/AdminWorkspace";
import AuthPage from "./components/Auth/AuthPage";
import UserWorkspace from "./components/UserWorkspace/UserWorkspace";
import AppLayout from "./components/Layout/AppLayout";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState("write");

  if (!user) {
    return <AuthPage />;
  }

  const isAdmin = user.role === "admin";

  return (
    <AppLayout
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
    >
      {isAdmin ? (
        <AdminWorkspace activeView={activeView} onNavigate={setActiveView} onLogout={logout} />
      ) : (
        <UserWorkspace
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={logout}
        />
      )}
    </AppLayout>
  );
}
