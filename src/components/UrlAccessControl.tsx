import { useState, useEffect } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sha256 } from "@/lib/utils";

interface UrlAccessControlProps {
  onAccessGranted: () => void;
  isAuthenticated: boolean;
}

const ACCESS_KEY = "worship-scheduler-auth-hash"; // Key for the hashed token

const UrlAccessControl = ({ onAccessGranted, isAuthenticated }: UrlAccessControlProps) => {
  const [error, setError] = useState("");

  const VALID_ACCESS_TOKENS = [
    import.meta.env.VITE_ACCESS_TOKEN_1,
    import.meta.env.VITE_ACCESS_TOKEN_2,
    import.meta.env.VITE_ACCESS_TOKEN_3
  ].filter(Boolean);

  const ACCESS_SALT = import.meta.env.VITE_ACCESS_SALT || "default-dev-salt"; // Fallback for dev, but MUST be set in production!

  // Check URL parameters for access token and hash it for storage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access');
    
    const authenticate = async (token: string) => {
      const hashedToken = await sha256(token, ACCESS_SALT);
      const validHashes = await Promise.all(VALID_ACCESS_TOKENS.map(t => sha256(t, ACCESS_SALT)));

      if (validHashes.includes(hashedToken)) {
        console.log('Access granted!');
        localStorage.setItem(ACCESS_KEY, hashedToken);
        onAccessGranted();
      } else {
        console.log('Invalid access token');
        setError('Invalid access token. Please check with your team leader.');
      }
    };

    if (accessToken) {
      authenticate(accessToken);
    }
  }, [onAccessGranted, VALID_ACCESS_TOKENS, ACCESS_SALT]);

  // Check if already authenticated via hashed token in localStorage
  useEffect(() => {
    const storedAuthHash = localStorage.getItem(ACCESS_KEY);
    
    const checkStoredHash = async () => {
      if (storedAuthHash) {
        const validHashes = await Promise.all(VALID_ACCESS_TOKENS.map(t => sha256(t, ACCESS_SALT)));
        if (validHashes.includes(storedAuthHash)) {
          onAccessGranted();
        } else {
          // Stored hash is invalid or doesn't match current valid tokens
          localStorage.removeItem(ACCESS_KEY);
        }
      }
    };

    checkStoredHash();
  }, [onAccessGranted, VALID_ACCESS_TOKENS, ACCESS_SALT]);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete('access');
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  };

  if (isAuthenticated) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-xs"
        >
          <Lock className="w-3 h-3 mr-1" />
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Restricted
          </CardTitle>
          <p className="text-gray-600 mt-2">
            This application is only available to authorized team members
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <AlertDescription>
              <strong>Need access?</strong> Contact your worship team leader to receive an access link.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Worship Team Scheduler - Private Application
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UrlAccessControl; 