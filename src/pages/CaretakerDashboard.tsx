import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Utensils,
  Dumbbell,
  Receipt,
  CreditCard,
  BarChart3,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";

interface ParticipantPermission {
  category: string;
  is_granted: boolean;
}

interface Participant {
  id: string;
  participant_id: string;
  full_name: string;
  email: string;
  caretaker_type: string;
  status: string;
  created_at: string;
  permissions?: ParticipantPermission[];
  stats?: {
    total_food_entries?: number;
    avg_calories?: number;
  };
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  food_entries: { label: "Food", icon: Utensils, color: "green" },
  workouts: { label: "Workouts", icon: Dumbbell, color: "purple" },
  receipts: { label: "Receipts", icon: Receipt, color: "blue" },
  bank_transactions: { label: "Finance", icon: CreditCard, color: "amber" },
  analytics: { label: "Analytics", icon: BarChart3, color: "indigo" },
};

const CaretakerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await backendApi.get("/v1/caretaker/participants");
      if (apiError) throw apiError;
      setParticipants(data || []);
    } catch (err: any) {
      setError("Failed to load participants");
      console.error("Error fetching participants:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "nutritionist":
        return "bg-green-100 text-green-700 border-green-200";
      case "family_member":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "financial_advisor":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "doctor":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto" />
            <p className="text-gray-600 font-medium">Loading participants...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
                Care Dashboard
              </span>
            </h1>
            <p className="text-gray-500 mt-1">View and manage your participants' data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchParticipants}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate("/join-caretaker")}
            >
              <UserPlus className="h-4 w-4 mr-1" /> Join as Caretaker
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="text-gray-600 font-medium">{error}</p>
            <Button variant="outline" onClick={fetchParticipants}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!error && participants.length === 0 && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Users className="h-16 w-16 text-gray-300" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">No participants yet</p>
                <p className="text-gray-500 mt-1">
                  Redeem an invitation code from a participant to get started
                </p>
              </div>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate("/join-caretaker")}
              >
                <UserPlus className="h-4 w-4 mr-2" /> Join as Caretaker
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Participant Grid */}
        {!error && participants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <Card
                key={participant.id}
                className="group hover:shadow-lg transition-all duration-200 border-green-100 hover:border-green-300 cursor-pointer"
                onClick={() => navigate(`/caretaker/${participant.participant_id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center font-bold text-sm">
                        {(participant.full_name || participant.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {participant.full_name || "Participant"}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">{participant.email}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getTypeColor(participant.caretaker_type)} capitalize`}>
                      {participant.caretaker_type.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Quick Stats */}
                  {participant.stats && (
                    <div className="flex gap-3">
                      <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-700">
                          {participant.stats.total_food_entries ?? "-"}
                        </p>
                        <p className="text-xs text-green-600">Food Entries</p>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-700">
                          {participant.stats.avg_calories ?? "-"}
                        </p>
                        <p className="text-xs text-blue-600">Avg Cal</p>
                      </div>
                    </div>
                  )}

                  {/* Permission Badges */}
                  {participant.permissions && participant.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
                        const perm = participant.permissions?.find((p) => p.category === cat);
                        const granted = perm?.is_granted ?? false;
                        return (
                          <Badge
                            key={cat}
                            variant="outline"
                            className={`text-xs ${
                              granted
                                ? `border-${config.color}-200 text-${config.color}-700 bg-${config.color}-50`
                                : "border-gray-200 text-gray-400"
                            }`}
                          >
                            {granted ? (
                              <Check className="h-3 w-3 mr-0.5" />
                            ) : (
                              <X className="h-3 w-3 mr-0.5" />
                            )}
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* View Details */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group-hover:bg-green-50 group-hover:text-green-700 group-hover:border-green-200"
                  >
                    View Details <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default CaretakerDashboard;
