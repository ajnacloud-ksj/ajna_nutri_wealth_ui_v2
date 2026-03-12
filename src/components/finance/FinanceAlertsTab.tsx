import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useFinanceData } from "./useFinanceData";

interface FinanceAlertsTabProps {
  data: ReturnType<typeof useFinanceData>;
}

export function FinanceAlertsTab({ data }: FinanceAlertsTabProps) {
  const { filteredAlerts } = data;

  const iconByLevel: Record<string, any> = { good: TrendingUp, watch: AlertTriangle, warning: AlertTriangle, info: TrendingDown };
  const styleByLevel: Record<string, string> = {
    good: "bg-green-50 border-green-200",
    info: "bg-blue-50 border-blue-200",
    warning: "bg-yellow-50 border-yellow-200",
    watch: "bg-orange-50 border-orange-200",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredAlerts.map((item) => {
        const Icon = iconByLevel[item.level] || AlertTriangle;
        return (
          <Card key={item.title} className={`border ${styleByLevel[item.level] || "border-gray-200"} shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{item.body}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
