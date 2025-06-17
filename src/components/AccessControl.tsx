import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccessControlProps {
  onAccessGranted: () => void;
  isAuthenticated: boolean;
}

const AccessControl = ({ onAccessGranted, isAuthenticated }: AccessControlProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Access codes - these must be set in environment variables
  const VALID_ACCESS_CODES = [
    import.meta.env.VITE_ACCESS_CODE_1,
    import.meta.env.VITE_ACCESS_CODE_2,
    import.meta.env.VITE_ACCESS_CODE_3
  ].filter(Boolean); // Remove any undefined values

  // Check if user is already authenticated (stored in localStorage)
  useEffect(() => {
    const storedAuth = localStorage.getItem('worship-scheduler-auth');
    if (storedAuth === 'true') {
      onAccessGranted();
    }
  }, [onAccessGranted]);

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (VALID_ACCESS_CODES.includes(accessCode.toLowerCase())) {
      // Store authentication in localStorage
      localStorage.setItem('worship-scheduler-auth', 'true');
      onAccessGranted();
    } else {
      setError("Invalid access code. Please check with your team leader.");
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('worship-scheduler-auth');
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
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Worship Team Scheduler
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your access code to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="accessCode" className="text-sm font-medium text-gray-700">
                Access Code
              </label>
              <div className="relative">
                <Input
                  id="accessCode"
                  type={showPassword ? "text" : "password"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code"
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !accessCode.trim()}
            >
              {isLoading ? "Checking..." : "Access Application"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need access? Contact your worship team leader
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessControl; 