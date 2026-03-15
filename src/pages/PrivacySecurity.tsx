import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Lock,
  Download,
  Trash2,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Server,
  Eye,
  EyeOff,
  Globe,
  Key,
  Brain,
  ArrowLeft,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layout/SidebarLayout";

const PrivacySecurity = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/user/export");
      if (error) throw error;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aro-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const summary = (data as any)?.summary || {};
      toast.success(
        `Data exported: ${summary.food_entries || 0} food entries, ${summary.receipts || 0} receipts, ${summary.workouts || 0} workouts`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE_MY_ACCOUNT") {
      toast.error("Please type the exact confirmation text");
      return;
    }
    setDeleteLoading(true);
    try {
      const { error } = await backendApi.delete("/v1/user/account", {
        body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }),
      });
      if (error) throw error;
      toast.success("Account deleted. Signing out...");
      setTimeout(async () => {
        await signOut();
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  const securityFeatures = [
    {
      icon: Lock,
      title: "Encryption at Rest",
      description: "All data is encrypted using AES-256 encryption on AWS servers",
    },
    {
      icon: Globe,
      title: "Encryption in Transit",
      description: "All communication uses TLS/HTTPS — data is encrypted between your device and our servers",
    },
    {
      icon: Key,
      title: "Secure Authentication",
      description: "Industry-standard AWS Cognito authentication with secure token management",
    },
    {
      icon: Server,
      title: "Secure Cloud Storage",
      description: "Your data is securely stored in AWS cloud infrastructure with enterprise-grade security",
    },
    {
      icon: EyeOff,
      title: "No Data Sharing",
      description: "We never sell, share, or provide your personal data to third parties",
    },
    {
      icon: Eye,
      title: "AI Processing Privacy",
      description: "Food and receipt images are analyzed by AI for nutritional data only — images are not stored by AI providers",
    },
  ];

  const dataWeCollect = [
    { category: "Account", items: "Email address, display name" },
    { category: "Food Tracking", items: "Food photos, nutritional analysis, meal logs" },
    { category: "Receipts", items: "Receipt images, purchase items, amounts" },
    { category: "Workouts", items: "Exercise descriptions, duration, calories" },
    { category: "Shopping Lists", items: "List names, items, categories" },
    { category: "Bank Statements", items: "Uploaded statements for reconciliation against receipts" },
  ];

  const content = (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-600" />
            Privacy & Security
          </h1>
          <p className="text-muted-foreground mt-1">
            Your data is yours. Here is how we protect it.
          </p>
        </div>

        {/* Security Features */}
        <Card className="border border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              How We Protect Your Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {securityFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-3 p-3 rounded-lg bg-white border border-green-100"
                >
                  <feature.icon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What We Collect */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">What Data We Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dataWeCollect.map((item) => (
                <div key={item.category} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.category}: </span>
                    <span className="text-sm text-gray-600">{item.items}</span>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  We collect only what is necessary to provide our services. We do not track your
                  browsing activity, sell your data, or create advertising profiles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Data Rights - actions only for logged in users */}
        {user && <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Data Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Data */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  Export My Data
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Download all your data as a JSON file — food entries, receipts, workouts,
                  shopping lists, and profile information.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={exportLoading}
                className="shrink-0"
              >
                {exportLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                {exportLoading ? "Exporting..." : "Export"}
              </Button>
            </div>

            {/* Delete Account */}
            <div className="p-4 rounded-lg border border-red-200 bg-red-50/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                  onClick={() => {
                    setShowDelete(!showDelete);
                    setDeleteConfirm("");
                  }}
                >
                  {showDelete ? "Cancel" : "Delete..."}
                </Button>
              </div>
              {showDelete && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs text-red-700 mb-2">
                    Type{" "}
                    <code className="bg-red-100 px-1 py-0.5 rounded font-mono">
                      DELETE_MY_ACCOUNT
                    </code>{" "}
                    to confirm:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE_MY_ACCOUNT"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteLoading || deleteConfirm !== "DELETE_MY_ACCOUNT"}
                      onClick={handleDeleteAccount}
                      className="shrink-0"
                    >
                      {deleteLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Permanently Delete"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Account Info - only for logged in users */}
        {user && (
          <Card className="border border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>
                  Signed in as <span className="font-medium text-gray-700">{user?.email}</span>
                </span>
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Encrypted
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );

  // Logged-in users get sidebar layout
  if (user) {
    return <SidebarLayout>{content}</SidebarLayout>;
  }

  // Public visitors get a standalone page with nav
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                Aro
              </span>
            </button>
            <Button onClick={() => navigate("/auth")} className="bg-green-600 hover:bg-green-700 text-white px-6">
              Sign In
            </Button>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-6 py-12">
        {content}
      </div>
    </div>
  );
};

export default PrivacySecurity;
