import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TokenVerificationProps {
  onVerificationSuccess: (token: string) => void;
}

const TokenVerification = ({ onVerificationSuccess }: TokenVerificationProps) => {
  const [token, setToken] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!token.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Verify token exists and check if it has been used
      const { data, error } = await supabase
        .rpc('verify_token', { token_value: token.trim() });
      
      if (error) {
        console.error('Error verifying token:', error);
        setError('Error verifying token. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Type assertion for the returned JSON data
      const result = data as { exists: boolean; used: boolean; message: string };
      
      // Check the verification result
      if (!result.exists) {
        setError('No such token exists. Please enter a valid token.');
        setIsLoading(false);
        return;
      }
      
      if (result.used) {
        setError('This token has already been used for voting.');
        setIsLoading(false);
        return;
      }
      
      // Token is valid and not used
      setIsVerified(true);
      setIsLoading(false);
      setTimeout(() => {
        onVerificationSuccess(token.trim());
      }, 1500);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to the Voting System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isVerified ? (
            <>
              <div className="space-y-2">
                <label htmlFor="token" className="text-sm font-medium text-foreground">
                  Enter your assigned token
                </label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter token here..."
                  className="bg-input border-border"
                />
              </div>
              {error && (
                <div className="flex items-center space-x-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <Button 
                onClick={handleVerify}
                disabled={!token.trim() || isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-foreground font-medium">
                Verification successful. You may now vote.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenVerification;