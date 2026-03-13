import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Users,
  UserPlus,
  Clock,
  FileText,
  Trash2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Settings,
  Eye,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import SidebarLayout from "@/components/layout/SidebarLayout";

// Types
interface Relationship {
  id: string;
  caretaker_id: string;
  caretaker_type: string;
  status: string;
  permission_level: string;
  created_at: string;
  caretaker?: {
    full_name: string | null;
    email: string;
  };
}

interface Invitation {
  id: string;
  code: string;
  caretaker_type: string;
  permission_preset: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface AccessLogEntry {
  id: string;
  caretaker_name: string;
  caretaker_id: string;
  action: string;
  category: string;
  created_at: string;
}

interface Permission {
  id: string;
  caretaker_id: string;
  caretaker_name: string;
  category: string;
  is_granted: boolean;
}

const CATEGORIES = ["food_entries", "workouts", "receipts", "bank_transactions", "analytics"];
const CARETAKER_TYPES = [
  { value: "nutritionist", label: "Nutritionist" },
  { value: "family_member", label: "Family Member" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "doctor", label: "Doctor" },
];
const PERMISSION_PRESETS = [
  { value: "full_access", label: "Full Access" },
  { value: "health_only", label: "Health Only" },
  { value: "finance_only", label: "Finance Only" },
  { value: "summary_only", label: "Summary Only" },
  { value: "custom", label: "Custom" },
];
const EXPIRY_OPTIONS = [
  { value: "72h", label: "72 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const CaretakerSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  // Active Caretakers state
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState("");
  const [invitePreset, setInvitePreset] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("7d");
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Pending Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  // Access Log state
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [accessLogLoading, setAccessLogLoading] = useState(true);
  const [logFilterCaretaker, setLogFilterCaretaker] = useState("");
  const [logFilterCategory, setLogFilterCategory] = useState("");

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [togglingPermission, setTogglingPermission] = useState<string | null>(null);

  // Fetch relationships
  const fetchRelationships = useCallback(async () => {
    setRelationshipsLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/relationships");
      if (error) throw error;
      setRelationships(data || []);
    } catch (err: any) {
      toast.error("Failed to load caretakers");
      console.error("Error fetching relationships:", err);
    } finally {
      setRelationshipsLoading(false);
    }
  }, []);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/invitations");
      if (error) throw error;
      setInvitations(data || []);
    } catch (err: any) {
      toast.error("Failed to load invitations");
      console.error("Error fetching invitations:", err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // Fetch access log
  const fetchAccessLog = useCallback(async () => {
    setAccessLogLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/access-log");
      if (error) throw error;
      setAccessLog(data || []);
    } catch (err: any) {
      toast.error("Failed to load access log");
      console.error("Error fetching access log:", err);
    } finally {
      setAccessLogLoading(false);
    }
  }, []);

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/permissions");
      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      toast.error("Failed to load permissions");
      console.error("Error fetching permissions:", err);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelationships();
    fetchInvitations();
  }, [fetchRelationships, fetchInvitations]);

  useEffect(() => {
    if (activeTab === "log") fetchAccessLog();
    if (activeTab === "permissions") fetchPermissions();
  }, [activeTab, fetchAccessLog, fetchPermissions]);

  // Revoke relationship
  const handleRevoke = async () => {
    if (!selectedRelationship) return;
    setRevoking(true);
    try {
      const { error } = await backendApi.delete(`/v1/relationships/${selectedRelationship.id}`);
      if (error) throw error;
      toast.success("Caretaker access revoked");
      setRevokeDialogOpen(false);
      setSelectedRelationship(null);
      fetchRelationships();
    } catch (err: any) {
      toast.error("Failed to revoke access");
    } finally {
      setRevoking(false);
    }
  };

  // Create invitation
  const handleCreateInvitation = async () => {
    if (!inviteType || !invitePreset) {
      toast.error("Please select caretaker type and permission preset");
      return;
    }
    setInviting(true);
    try {
      const payload: any = {
        caretaker_email: inviteEmail || undefined,
        caretaker_type: inviteType,
        permission_preset: invitePreset,
        expiry: inviteExpiry,
      };
      if (invitePreset === "custom") {
        payload.custom_permissions = customPermissions;
      }
      const { data, error } = await backendApi.post("/v1/invitations/create", payload);
      if (error) throw error;
      setGeneratedCode(data?.code || data?.invitation_code || "");
      toast.success("Invitation created successfully");
      fetchInvitations();
    } catch (err: any) {
      toast.error("Failed to create invitation");
    } finally {
      setInviting(false);
    }
  };

  // Revoke invitation
  const handleRevokeInvitation = async (id: string) => {
    try {
      const { error } = await backendApi.delete(`/v1/invitations/${id}`);
      if (error) throw error;
      toast.success("Invitation revoked");
      fetchInvitations();
    } catch (err: any) {
      toast.error("Failed to revoke invitation");
    }
  };

  // Toggle permission
  const handleTogglePermission = async (permissionId: string, isGranted: boolean) => {
    setTogglingPermission(permissionId);
    try {
      const { error } = await backendApi.put(`/v1/permissions/${permissionId}`, { is_granted: isGranted });
      if (error) throw error;
      setPermissions((prev) =>
        prev.map((p) => (p.id === permissionId ? { ...p, is_granted: isGranted } : p))
      );
      toast.success(`Permission ${isGranted ? "granted" : "revoked"}`);
    } catch (err: any) {
      toast.error("Failed to update permission");
    } finally {
      setTogglingPermission(null);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Toggle custom permission checkbox
  const toggleCustomPermission = (cat: string) => {
    setCustomPermissions((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Filter access log
  const filteredLog = accessLog.filter((entry) => {
    if (logFilterCaretaker && !entry.caretaker_name.toLowerCase().includes(logFilterCaretaker.toLowerCase())) return false;
    if (logFilterCategory && entry.category !== logFilterCategory) return false;
    return true;
  });

  // Group permissions by caretaker for grid view
  const caretakerNames = [...new Set(permissions.map((p) => p.caretaker_name))];
  const getPermission = (caretakerName: string, category: string) =>
    permissions.find((p) => p.caretaker_name === caretakerName && p.category === category);

  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  );

  const renderError = (message: string, retry: () => void) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <p className="text-gray-600">{message}</p>
      <Button variant="outline" onClick={retry} size="sm">
        <RefreshCw className="h-4 w-4 mr-2" /> Retry
      </Button>
    </div>
  );

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="nw-page-header">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
                Caretaker Settings
              </span>
            </h1>
            <p className="text-gray-500 mt-1">Manage who has access to your health and financial data</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1 hidden sm:inline" /> Active
            </TabsTrigger>
            <TabsTrigger value="invite" className="text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 mr-1 hidden sm:inline" /> Invite
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" /> Pending
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" /> Log
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs sm:text-sm">
              <Settings className="h-4 w-4 mr-1 hidden sm:inline" /> Permissions
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Active Caretakers */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Caretakers</CardTitle>
                <CardDescription>People who currently have access to your data</CardDescription>
              </CardHeader>
              <CardContent>
                {relationshipsLoading ? (
                  renderLoading()
                ) : relationships.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No active caretakers</p>
                    <p className="text-sm">Invite someone to start sharing your data</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Since</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relationships.map((rel) => (
                        <TableRow key={rel.id}>
                          <TableCell className="font-medium">
                            {rel.caretaker?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {rel.caretaker?.email || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {rel.caretaker_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {rel.permission_level?.replace("_", " ") || "standard"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {rel.created_at ? format(new Date(rel.created_at), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRelationship(rel);
                                setRevokeDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Invite Caretaker */}
          <TabsContent value="invite">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invite a Caretaker</CardTitle>
                <CardDescription>Generate a code to share with someone you trust</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedCode ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                      <p className="text-sm text-green-700 mb-2 font-medium">Invitation Code</p>
                      <div className="text-4xl font-mono font-bold tracking-widest text-green-800 mb-4">
                        {generatedCode}
                      </div>
                      <Button onClick={handleCopyCode} variant="outline" className="border-green-300">
                        {codeCopied ? (
                          <><Check className="h-4 w-4 mr-2" /> Copied</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-2" /> Copy Code</>
                        )}
                      </Button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">How to share:</p>
                      <p>Share this code with your caretaker. They will enter it after signing in to NutriWealth to gain access to your data.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedCode(null);
                        setInviteEmail("");
                        setInviteType("");
                        setInvitePreset("");
                        setCustomPermissions([]);
                      }}
                      className="w-full"
                    >
                      Create Another Invitation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite-email">Caretaker Email (optional)</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="caretaker@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Caretaker Type</Label>
                      <Select value={inviteType} onValueChange={setInviteType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARETAKER_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Permission Preset</Label>
                      <Select value={invitePreset} onValueChange={setInvitePreset}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select permissions" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_PRESETS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {invitePreset === "custom" && (
                      <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                        <Label className="text-sm font-medium">Select Categories</Label>
                        {CATEGORIES.map((cat) => (
                          <div key={cat} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${cat}`}
                              checked={customPermissions.includes(cat)}
                              onCheckedChange={() => toggleCustomPermission(cat)}
                            />
                            <Label htmlFor={`cat-${cat}`} className="text-sm capitalize cursor-pointer">
                              {cat.replace("_", " ")}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label>Invitation Expiry</Label>
                      <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRY_OPTIONS.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleCreateInvitation}
                      disabled={inviting || !inviteType || !invitePreset}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {inviting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                      ) : (
                        <><UserPlus className="h-4 w-4 mr-2" /> Generate Invitation Code</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Pending Invitations */}
          <TabsContent value="pending">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pending Invitations</CardTitle>
                  <CardDescription>Invitations that haven't been redeemed yet</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchInvitations}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  renderLoading()
                ) : invitations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No pending invitations</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono font-bold tracking-wider">
                            {inv.code}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {inv.caretaker_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={inv.status === "pending" ? "outline" : "secondary"}
                              className={inv.status === "pending" ? "border-amber-300 text-amber-700" : ""}
                            >
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {inv.expires_at ? format(new Date(inv.expires_at), "MMM d, yyyy h:mm a") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {inv.status === "pending" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevokeInvitation(inv.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Access Log */}
          <TabsContent value="log">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Log</CardTitle>
                <CardDescription>See when your caretakers access your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Filter by caretaker name..."
                      value={logFilterCaretaker}
                      onChange={(e) => setLogFilterCaretaker(e.target.value)}
                    />
                  </div>
                  <Select value={logFilterCategory || "all"} onValueChange={(v) => setLogFilterCategory(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {accessLogLoading ? (
                  renderLoading()
                ) : filteredLog.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No access log entries</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Caretaker</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.caretaker_name}</TableCell>
                          <TableCell className="text-gray-600">{entry.action}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entry.category.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {entry.created_at
                              ? format(new Date(entry.created_at), "MMM d, yyyy h:mm a")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Permissions Grid */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permission Matrix</CardTitle>
                <CardDescription>Toggle data access for each caretaker by category</CardDescription>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  renderLoading()
                ) : caretakerNames.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No permissions to manage</p>
                    <p className="text-sm">Add a caretaker first to manage their permissions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Caretaker</TableHead>
                          {CATEGORIES.map((cat) => (
                            <TableHead key={cat} className="text-center capitalize min-w-[100px]">
                              {cat.replace("_", " ")}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caretakerNames.map((name) => (
                          <TableRow key={name}>
                            <TableCell className="font-medium">{name}</TableCell>
                            {CATEGORIES.map((cat) => {
                              const perm = getPermission(name, cat);
                              return (
                                <TableCell key={cat} className="text-center">
                                  {perm ? (
                                    <Switch
                                      checked={perm.is_granted}
                                      onCheckedChange={(checked) =>
                                        handleTogglePermission(perm.id, checked)
                                      }
                                      disabled={togglingPermission === perm.id}
                                    />
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Revoke Confirmation Dialog */}
        <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Caretaker Access</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke access for{" "}
                <span className="font-semibold">
                  {selectedRelationship?.caretaker?.full_name || selectedRelationship?.caretaker?.email || "this caretaker"}
                </span>
                ? They will no longer be able to view your data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
                {revoking ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Revoking...</>
                ) : (
                  "Revoke Access"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
};

export default CaretakerSettings;
