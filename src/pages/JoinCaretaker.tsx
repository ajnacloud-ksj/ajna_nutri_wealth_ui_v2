import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
  KeyRound,
  Shield,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";

interface RedemptionResult {
  participant_name: string;
  participant_email: string;
  caretaker_type: string;
  permissions: string[];
}

const JoinCaretaker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedemptionResult | null>(null);

  const handleRedeem = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 6) {
      setError("Please enter a valid invitation code");
      return;
    }

    setRedeeming(true);
    setError(null);
    try {
      const { data, error: apiError } = await backendApi.post("/v1/invitations/redeem", {
        code: trimmedCode,
      });
      if (apiError) throw apiError;
      setResult(data);
      toast.success("Invitation redeemed successfully!");
    } catch (err: any) {
      const message =
        err?.message || "Failed to redeem invitation code. It may be expired, invalid, or already used.";
      setError(message);
      toast.error("Failed to redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setCode(val);
    if (error) setError(null);
  };

  return (
    <SidebarLayout>
      <div className="p-6 flex items-start justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
              Join as Caretaker
            </h1>
            <p className="text-gray-500 mt-1">Enter the invitation code shared with you</p>
          </div>

          {result ? (
            /* Success State */
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-green-700">Access Granted!</CardTitle>
                <CardDescription>
                  You can now view{" "}
                  <span className="font-semibold text-gray-700">
                    {result.participant_name || result.participant_email}
                  </span>
                  's data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Role</span>
                    <Badge variant="secondary" className="capitalize">
                      {result.caretaker_type?.replace("_", " ") || "caretaker"}
                    </Badge>
                  </div>
                  {result.permissions && result.permissions.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1.5">Granted Permissions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="capitalize text-xs border-green-200 text-green-700">
                            <Shield className="h-3 w-3 mr-1" />
                            {perm.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => navigate("/caretaker")}
                >
                  Go to Care Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Code Entry State */
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-green-600" />
                  Redeem Invitation Code
                </CardTitle>
                <CardDescription>
                  Enter the 8-character code provided by the participant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="invite-code">Invitation Code</Label>
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABCD1234"
                    className="text-center text-2xl font-mono tracking-[0.3em] h-14 uppercase"
                    maxLength={8}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRedeem();
                    }}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleRedeem}
                  disabled={redeeming || code.length < 6}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {redeeming ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redeeming...</>
                  ) : (
                    <><UserPlus className="h-4 w-4 mr-2" /> Redeem Code</>
                  )}
                </Button>

                <div className="text-center">
                  <Button variant="link" size="sm" onClick={() => navigate("/caretaker")} className="text-gray-500">
                    Already a caretaker? Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default JoinCaretaker;
