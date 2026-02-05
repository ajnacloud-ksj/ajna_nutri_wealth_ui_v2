import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, UserPlus } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { InvitationCodeInput } from "@/components/auth/InvitationCodeInput";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Check for invitation code in URL parameters
  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setInvitationCode(inviteCode);
      setIsLogin(false); // Switch to signup mode for invitation
      toast.info("Invitation code detected! Please complete your signup.");
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleVerification = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await backendApi.auth.confirmSignUp(email, verificationCode);
      if (error) throw error;

      toast.success("Account verified successfully! Please sign in.");
      setNeedsVerification(false);
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine auth mode for UI feedback
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const isProductionUrl = apiUrl.includes('lambda-url') || apiUrl.includes('ajna.cloud') || apiUrl.includes('triviz.cloud');
      const isProductionDomain = typeof window !== 'undefined' && (window.location.hostname.includes('triviz.cloud') || window.location.hostname.includes('ajna.cloud'));
      const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl || isProductionDomain ? 'cognito' : 'local');
      const isMock = authMode !== 'cognito';

      if (isLogin) {
        const { data, error } = await backendApi.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        toast.success(isMock ? "Successfully signed in! (Mock Auth)" : "Successfully signed in!");
        // Need to reload to update auth context
        window.location.href = "/dashboard";
      } else {
        const { data, error } = await backendApi.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: invitationCode ? 'caretaker' : 'participant'
            }
          }
        });

        if (error) {
          throw error;
        }

        toast.success(isMock ? "Account created! (Mock Auth)" : "Account created! Please check your email for the verification code.");

        // Handle invitation code if present
        if (invitationCode && data?.user?.id) {
          try {
            await api.functions.invoke('redeem-invitation', {
              body: {
                invitationCode,
                userId: data.user.id
              }
            });
          } catch (redeemError) {
            console.error('Invitation redemption error:', redeemError);
          }
        }

        if (isMock) {
          // Auto sign in after signup with mock auth
          window.location.href = "/dashboard";
        } else {
          // For real auth, activate verification step
          setNeedsVerification(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">NutriWealth</span>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            {invitationCode && <UserPlus className="h-5 w-5 text-green-600" />}
            {needsVerification
              ? "Verify Email"
              : isLogin ? "Welcome Back" : invitationCode ? "Join as Caretaker" : "Create Account"
            }
          </CardTitle>
          <CardDescription>
            {needsVerification
              ? `Enter the code sent to ${email}`
              : isLogin
                ? "Sign in to your account"
                : invitationCode
                  ? "Complete your signup to join as a caretaker"
                  : "Start your health journey today"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsVerification ? (
            <form onSubmit={handleVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="e.g. 123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Account"}
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm"
                  onClick={() => setNeedsVerification(false)}
                >
                  Back to Sign Up
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {!isLogin && (
                <InvitationCodeInput
                  value={invitationCode}
                  onChange={setInvitationCode}
                  disabled={loading}
                  autoFilled={!!searchParams.get('invite')}
                />
              )}
              {(() => {
                // Robust check for banner visibility
                const apiUrl = import.meta.env.VITE_API_URL || '';
                const isProductionUrl = apiUrl.includes('lambda-url') || apiUrl.includes('ajna.cloud') || apiUrl.includes('triviz.cloud');
                const isProductionDomain = typeof window !== 'undefined' && (window.location.hostname.includes('triviz.cloud') || window.location.hostname.includes('ajna.cloud'));

                const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl || isProductionDomain ? 'cognito' : 'local');

                console.log('Auth Debug:', { apiUrl, isProductionUrl, hostname: window.location.hostname, isProductionDomain, authMode });

                return authMode !== 'cognito' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <strong>🔓 Mock Auth Mode (v3):</strong> Use any email/password to login
                    <br />
                    <span className="text-xs">Example: test@example.com / password123</span>
                    <div className="text-[10px] mt-1 text-blue-600 font-mono">
                      Host: {window.location.hostname} | Mode: {authMode}
                    </div>
                  </div>
                );
              })()}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center space-y-2">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </Button>

            {isLogin && (
              <div className="pt-2 border-t">
                <div className="text-sm text-gray-500 mb-2">
                  Have an invitation code?
                </div>
                <Link
                  to="/join"
                  className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center justify-center gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  Join as Caretaker
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
