import { useState, useEffect } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UrlAccessControlProps {
  onAccessGranted: () => void;
  isAuthenticated: boolean;
}

const UrlAccessControl = ({ onAccessGranted, isAuthenticated }: UrlAccessControlProps) => {
  const [error, setError] = useState("");

  // Valid access tokens - these must be set in environment variables
  const VALID_ACCESS_TOKENS = [
    import.meta.env.VITE_ACCESS_TOKEN_1,
    import.meta.env.VITE_ACCESS_TOKEN_2,
    import.meta.env.VITE_ACCESS_TOKEN_3
  ].filter(Boolean); // Remove any undefined values

  // Check URL parameters for access token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access');
    
    
    if (accessToken && VALID_ACCESS_TOKENS.includes(accessToken)) {
      localStorage.setItem('worship-scheduler-auth', 'true');
      onAccessGranted();
    } else if (accessToken) {
      setError('Invalid access token. Please check with your team leader.');
    }
  }, [onAccessGranted, VALID_ACCESS_TOKENS]);

  // Check if already authenticated
  useEffect(() => {
    const storedAuth = localStorage.getItem('worship-scheduler-auth');
    if (storedAuth === 'true') {
      onAccessGranted();
    }
  }, [onAccessGranted]);

  const handleLogout = () => {
    localStorage.removeItem('worship-scheduler-auth');
    // Remove access parameter from URL
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