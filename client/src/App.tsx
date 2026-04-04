import { useState } from "react";
import AdminWorkspace from "./components/Admin/AdminWorkspace";
import AuthPage from "./components/Auth/AuthPage";
import AuthVerificationPage from "./components/Auth/AuthVerificationPage";
import UserWorkspace from "./components/UserWorkspace/UserWorkspace";
import AppLayout from "./components/Layout/AppLayout";
import { useAuth } from "./context/AuthContext";
import type { RegisterInitiationResponse } from "@shared/index";

export default function App() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState("write");
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">(
    "login",
  );
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    payload: RegisterInitiationResponse;
  } | null>(null);

  if (!user) {
    if (authMode === "verify" && pendingVerification) {
      return (
        <AuthVerificationPage
          email={pendingVerification.email}
          verification={pendingVerification.payload}
          onBackToAuth={() => {
            setAuthMode("register");
            setPendingVerification(null);
          }}
          onVerificationConsumed={() => {
            setPendingVerification(null);
          }}
        />
      );
    }

    return (
      <AuthPage
        mode={authMode === "verify" ? "register" : authMode}
        onModeChange={(nextMode) => {
          setAuthMode(nextMode);
          if (nextMode !== "verify") {
            setPendingVerification(null);
          }
        }}
        onRegistrationInitiated={(email, verification) => {
          setPendingVerification({ email, payload: verification });
          setAuthMode("verify");
        }}
      />
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <AppLayout
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
    >
      {isAdmin ? (
        <AdminWorkspace
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={logout}
        />
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
