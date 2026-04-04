import { useState } from "react";
import AdminWorkspace from "./components/Admin/AdminWorkspace";
import AuthPage from "./components/Auth/AuthPage";
import AuthVerificationPage from "./components/Auth/AuthVerificationPage";
import UserWorkspace from "./components/UserWorkspace/UserWorkspace";
import AppLayout from "./components/Layout/AppLayout";
import { useAuth } from "./context/AuthContext";
import { PWAPrompt, OfflineIndicator } from "./components/PWA/PWAPrompt";
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

  return (
    <>
      {!user ? (
        authMode === "verify" && pendingVerification ? (
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
        ) : (
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
        )
      ) : (
        <AppLayout
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={logout}
        >
          {user.role === "admin" ? (
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
      )}
      <PWAPrompt />
      <OfflineIndicator />
    </>
  );
}
