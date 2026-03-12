import { useState } from "react";
import { BarChart3, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

const Insights = () => {
  return (
    <SidebarLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Insights</h1>
            <p className="text-sm text-gray-600">Analyze spending patterns, income, and investments</p>
          </div>
        </div>

        {/* Finance Dashboard */}
        <FinanceDashboard />
      </div>
    </SidebarLayout>
  );
};

export default Insights;
