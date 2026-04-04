import { AlertCircle, Download, X } from "lucide-react";
import { useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";

export function PWAPrompt() {
  const { isInstallable, isOnline, promptInstall } = usePWA();
  const [isVisible, setIsVisible] = useState(true);

  if (!isInstallable || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3">
        <Download className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Vi-Notes</p>
          <p className="text-xs text-blue-100 mt-1">
            Install this app on your device for faster access and offline
            support.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => {
                promptInstall();
                setIsVisible(false);
              }}
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-blue-700"
              onClick={() => setIsVisible(false)}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-100 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-amber-500 text-white rounded-lg shadow-lg p-3 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span className="text-sm font-medium">You're offline</span>
    </div>
  );
}
