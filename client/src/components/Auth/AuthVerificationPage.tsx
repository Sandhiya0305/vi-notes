import { useState, type FormEvent } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, FileText } from "lucide-react";
import type { RegisterInitiationResponse } from "@shared/index";

interface AuthVerificationPageProps {
  email: string;
  verification: RegisterInitiationResponse;
  onBackToAuth: () => void;
  onVerificationConsumed: () => void;
}

export default function AuthVerificationPage({
  email,
  verification,
  onBackToAuth,
  onVerificationConsumed,
}: AuthVerificationPageProps) {
  const {
    verifyRegistration,
    resendVerificationCode,
    error: authError,
    isLoading,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [verificationCode, setVerificationCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!verificationCode.trim()) {
      setLocalError("Enter the verification code");
      return;
    }

    try {
      await verifyRegistration({
        verificationToken: verification.verificationToken,
        otpCode: verificationCode.trim(),
      });
      onVerificationConsumed();
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Verification attempt failed",
      );
    }
  };

  const handleResendCode = async () => {
    setLocalError(null);

    try {
      const response = await resendVerificationCode(
        verification.verificationToken,
      );
      setVerificationCode("");
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to resend verification code",
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

      <Card className="w-full max-w-[420px] border-none shadow-lg">
        <CardHeader className="space-y-1 pb-2 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
            <FileText className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verify your email
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            We sent a one-time code to {email}. Enter it here to finish creating
            your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="verificationCode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Verification code
              </label>
              <Input
                id="verificationCode"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                required
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
              />
            </div>

            {(localError || authError) && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {localError ?? authError ?? "Unable to verify code"}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying code..." : "Verify code"}
            </Button>

            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>Didn’t get the email? Send another code.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Resend verification code
              </button>
              <button
                type="button"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                onClick={onBackToAuth}
                disabled={isLoading}
              >
                Back to registration
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
