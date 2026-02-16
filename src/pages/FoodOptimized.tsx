import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Utensils, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { optimizedApi } from "@/lib/api/optimized-client";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingCaptureButton } from "@/components/capture/FloatingCaptureButton";
import { FoodTable } from "@/components/food/FoodTable";
import { ModernFoodGrid } from "@/components/food/ModernFoodGrid";
import { CompactStatsGrid } from "@/components/food/CompactStatsGrid";
import { FoodAdvancedFilters } from "@/components/food/FoodAdvancedFilters";
import { ModernFilterBar } from "@/components/common/ModernFilterBar";
import { calculateVegetarianPercentage } from "@/utils/vegetarianUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { debounce } from "@/utils/performance";

interface FoodEntry {
  id: string;
  description: string;
  calories: number;
  total_protein: number;
  total_carbohydrates: number;
  total_fats: number;
  total_fiber: number;
  total_sodium: number;
  meal_type: string;
  image_url: string;
  created_at: string;
  extracted_nutrients: any;
  user_id: string;
  food_items: any[];
}

const PAGE_SIZE = 20; // Optimized page size for performance

const FoodOptimized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states - Default to last 3 days
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [selectedDietType, setSelectedDietType] = useState('all');

  // No default date filters - show all entries
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const getMealTypeFromEntry = (entry: FoodEntry) => {
    return entry.extracted_nutrients?.meal_summary?.meal_type ||
      entry.extracted_nutrients?.meal_type ||
      entry.meal_type ||
      'unknown';
  };

  const sortOptions = [
    { value: 'date-desc', label: 'Date (newest first)' },
    { value: 'date-asc', label: 'Date (oldest first)' },
    { value: 'calories-desc', label: 'Calories (high to low)' },
    { value: 'calories-asc', label: 'Calories (low to high)' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
  ];

  // Optimized fetch with pagination
  const fetchFoodEntries = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!user) return;

    try {
      console.log(`Fetching food entries page ${page + 1}`);

      // Build filters
      const filters = [
        { column: 'user_id', operator: 'eq', value: user.id }
      ];

      // Parse sort options
      const [sortField, sortDirection] = sortBy.split('-');
      const orderBy = {
        column: sortField === 'date' ? 'created_at' :
                sortField === 'name' ? 'description' :
                sortField,
        ascending: sortDirection === 'asc'
      };

      // Use optimized API with pagination
      const result = await optimizedApi.fetchPaginated<FoodEntry>('food_entries', {
        page,
        pageSize: PAGE_SIZE,
        filters,
        orderBy
      });

      if (result.error) throw result.error;

      // Process entries
      const processedEntries = (result.data || []).map((entry: any) => {
        // Parse JSON strings if they exist
        if (entry.extracted_nutrients && typeof entry.extracted_nutrients === 'string') {
          try {
            entry.extracted_nutrients = JSON.parse(entry.extracted_nutrients);
          } catch (e) {
            console.error('Failed to parse extracted_nutrients:', e);
          }
        }
        if (entry.ingredients && typeof entry.ingredients === 'string') {
          try {
            entry.ingredients = JSON.parse(entry.ingredients);
          } catch (e) {
            console.error('Failed to parse ingredients:', e);
          }
        }

        return {
          ...entry,
          food_items: [] // Empty array - not using food_items in display
        };
      });

      console.log(`Found ${processedEntries.length} entries on page ${page + 1}`);

      if (append) {
        setFoodEntries(prev => [...prev, ...processedEntries]);
      } else {
        setFoodEntries(processedEntries);
      }

      setHasMore(result.hasMore || false);
      setCurrentPage(page);

      // Prefetch next page if there are more results
      if (result.hasMore && !append) {
        optimizedApi.prefetch('food_entries', {
          filters: [...filters],
          select: '*'
        });
      }

    } catch (error: any) {
      console.error('Error fetching food entries:', error);
      toast.error("Failed to load food entries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, sortBy]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(0);
      fetchFoodEntries(0);
    }, 300),
    [fetchFoodEntries]
  );

  // Filter entries on client side for instant feedback
  const filteredEntries = useMemo(() => {
    let filtered = foodEntries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getMealTypeFromEntry(entry).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Meal type filter
    if (selectedMealType !== 'all') {
      filtered = filtered.filter(entry => {
        const mealType = getMealTypeFromEntry(entry).toLowerCase();
        return mealType === selectedMealType;
      });
    }

    // Diet type filter (vegetarian/non-vegetarian)
    if (selectedDietType !== 'all') {
      filtered = filtered.filter(entry => {
        const items = entry.extracted_nutrients?.items ||
                     entry.extracted_nutrients?.meal_summary?.items ||
                     [];
        const isVegetarian = items.every((item: any) =>
          item.is_vegetarian === true || item.is_vegetarian === 'true'
        );
        return selectedDietType === 'vegetarian' ? isVegetarian : !isVegetarian;
      });
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at);
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [foodEntries, searchTerm, selectedMealType, selectedDietType, startDate, endDate]);

  // Calculate stats from filtered entries
  const stats = useMemo(() => {
    const totalCalories = filteredEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
    const avgCalories = filteredEntries.length > 0 ? totalCalories / filteredEntries.length : 0;
    const totalProtein = filteredEntries.reduce((sum, entry) => sum + (entry.total_protein || 0), 0);
    const vegPercentage = calculateVegetarianPercentage(filteredEntries);

    return {
      totalEntries: filteredEntries.length,
      totalCalories,
      avgCalories,
      totalProtein,
      vegPercentage
    };
  }, [filteredEntries]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchFoodEntries(0);
  }, [user, navigate, fetchFoodEntries]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    await fetchFoodEntries(0);
    toast.success("Food entries refreshed");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || (newPage > currentPage && !hasMore)) return;
    fetchFoodEntries(newPage);
  };

  const deleteFoodEntry = async (id: string) => {
    try {
      const { error } = await api.from('food_entries').delete().eq('id', id);

      if (error) throw error;

      toast.success("Food entry deleted successfully");

      // Remove from local state immediately for optimistic update
      setFoodEntries(prev => prev.filter(entry => entry.id !== id));

      // Refetch current page
      fetchFoodEntries(currentPage);
    } catch (error: any) {
      console.error('Error deleting food entry:', error);
      toast.error("Failed to delete food entry");
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="nw-loading-spinner h-12 w-12 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading food entries...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
              <Utensils className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Food Entries</h1>
              <p className="text-sm text-gray-500">
                Track your nutrition journey - Page {currentPage + 1}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="hidden sm:flex"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button asChild className="nw-button-primary">
              <a href="/capture">
                <Plus className="h-4 w-4 mr-1" />
                Add Food
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <CompactStatsGrid stats={stats} />

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <FoodAdvancedFilters
              searchTerm={searchTerm}
              onSearchChange={debouncedSearch}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOptions={sortOptions}
              selectedMealType={selectedMealType}
              onMealTypeChange={setSelectedMealType}
              selectedDietType={selectedDietType}
              onDietTypeChange={setSelectedDietType}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
          </CardContent>
        </Card>

        {/* Content */}
        {filteredEntries.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No food entries found</p>
              <Button asChild>
                <a href="/capture">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Entry
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <ModernFoodGrid
                entries={filteredEntries}
                onDelete={deleteFoodEntry}
              />
            ) : (
              <FoodTable
                entries={filteredEntries}
                onDelete={deleteFoodEntry}
              />
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                Page {currentPage + 1} • Showing {filteredEntries.length} entries
              </span>

              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasMore}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Floating Capture Button */}
        <FloatingCaptureButton />
      </div>
    </SidebarLayout>
  );
};

export default FoodOptimized;