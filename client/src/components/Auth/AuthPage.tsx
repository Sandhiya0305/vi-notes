import { useState, type FormEvent } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, FileText } from "lucide-react";
import type {
  LoginRequest,
  RegisterRequest,
  RegisterInitiationResponse,
} from "@shared/index";

type AuthPageMode = "login" | "register";

interface AuthPageProps {
  mode: AuthPageMode;
  onModeChange: (mode: AuthPageMode) => void;
  onRegistrationInitiated: (
    email: string,
    verification: RegisterInitiationResponse,
  ) => void;
}

export default function AuthPage({
  mode,
  onModeChange,
  onRegistrationInitiated,
}: AuthPageProps) {
  const { login, register, error: authError, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const isRegisterMode = mode === "register";
  const registerPayload: RegisterRequest = {
    email: credentials.email.trim().toLowerCase(),
    name: name.trim(),
    password: credentials.password,
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedEmail = credentials.email.trim().toLowerCase();

    if (!normalizedEmail || !credentials.password) {
      setLocalError("Enter both email and password");
      return;
    }

    if (isRegisterMode && !name.trim()) {
      setLocalError("Please enter your name");
      return;
    }

    try {
      if (isRegisterMode) {
        const response = await register(registerPayload);
        onRegistrationInitiated(normalizedEmail, response);
      } else {
        await login({
          email: normalizedEmail,
          password: credentials.password,
        });
      }
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : isRegisterMode
            ? "Registration attempt failed"
            : "Login attempt failed",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Card className="w-full max-w-[400px] border-none shadow-lg">
        <CardHeader className="space-y-1 pb-2 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
            <FileText className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isRegisterMode ? "Create an account" : "Sign in to Vi-Notes"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRegisterMode
              ? "We’ll email a verification code after signup"
              : "Enter your credentials to continue"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            {isRegisterMode && (
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required={isRegisterMode}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </div>

            {(localError || authError) && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {localError ?? authError ?? "Unable to sign in"}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? isRegisterMode
                  ? "Creating account..."
                  : "Signing in..."
                : isRegisterMode
                  ? "Create account"
                  : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isRegisterMode ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={() => onModeChange("login")}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={() => onModeChange("register")}
                  >
                    Register
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
