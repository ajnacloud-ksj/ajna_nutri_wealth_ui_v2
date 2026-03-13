import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Save, X, Utensils, Flame, Calendar, Clock, Apple, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ImageModal } from "@/components/ui/image-modal";
import { HealthImpact } from "@/components/food/HealthImpact";
import { FoodEntry } from "@/types/food";

// Note: Local interface has extra fields (meal_time, meal_date, confidence_score) not in shared type

const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [foodEntry, setFoodEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<FoodEntry>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (id) {
      fetchFoodDetails();
    }
  }, [id, user, navigate]);

  const fetchFoodDetails = async () => {
    if (!user || !id) return;

    try {
      // Fetch specific entry by ID - much more efficient!
      const { data: entries } = await backendApi.from('food_entries')
        .select()
        .eq('id', id)
        .eq('user_id', user.id)
        .limit(1);

      const entry = entries?.[0];

      if (!entry) {
        console.error(`Entry not found: ${id}`);
        throw new Error("Entry not found");
      }

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

      setFoodEntry(entry);
      setEditedData(entry);
    } catch (error: any) {
      console.error('Error fetching food details:', error);
      toast.error("Failed to load food details");
      navigate("/food");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await backendApi
        .from('food_entries')
        .update(editedData)
        .eq('id', id);

      if (error) throw error;

      setFoodEntry({ ...foodEntry!, ...editedData });
      setEditing(false);
      toast.success("Food entry updated successfully");
    } catch (error: any) {
      console.error('Error updating food entry:', error);
      toast.error("Failed to update food entry");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCaloriesFromData = (entry: FoodEntry) => {
    return entry.calories ||
      entry.extracted_nutrients?.meal_summary?.total_nutrition?.calories ||
      entry.extracted_nutrients?.calories || 0;
  };

  const getNutritionFromData = (entry: FoodEntry) => {
    const extracted = entry.extracted_nutrients;
    const totalNutrition = extracted?.meal_summary?.total_nutrition;

    // Check multiple locations and field name variations for nutrition data
    // Some entries have singular (protein, carb, fat) while others have plural (proteins, carbohydrates, fats)
    const r = (v: any) => Math.round((Number(v) || 0) * 10) / 10;
    return {
      calories: Math.round(Number(getCaloriesFromData(entry)) || 0),
      proteins: r(totalNutrition?.proteins || totalNutrition?.protein ||
                extracted?.proteins || extracted?.protein ||
                extracted?.total_protein || entry.total_protein || 0),
      carbohydrates: r(totalNutrition?.carbohydrates || totalNutrition?.carbs ||
                     extracted?.carbohydrates || extracted?.carbs ||
                     extracted?.total_carbohydrates || entry.total_carbohydrates || 0),
      fats: r(totalNutrition?.fats || totalNutrition?.fat ||
            extracted?.fats || extracted?.fat ||
            extracted?.total_fats || entry.total_fats || 0),
      fiber: r(totalNutrition?.fiber || extracted?.fiber ||
             extracted?.total_fiber || entry.total_fiber || 0),
      sodium: r(totalNutrition?.sodium || extracted?.sodium ||
              extracted?.total_sodium || entry.total_sodium || 0),
    };
  };

  const getDishNames = (entry: FoodEntry) => {
    return entry.extracted_nutrients?.meal_summary?.dish_names ||
      entry.extracted_nutrients?.dish_names || [];
  };

  const getFoodItems = (entry: FoodEntry) => {
    return entry.extracted_nutrients?.food_items || [];
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading food details...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!foodEntry) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Food entry not found</div>
        </div>
      </SidebarLayout>
    );
  }

  const nutrition = getNutritionFromData(foodEntry);
  const dishNames = getDishNames(foodEntry);
  const foodItems = getFoodItems(foodEntry);
  const visibleItems = showAllItems ? foodItems : foodItems.slice(0, 4);

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/food")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Utensils className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {foodEntry.description || foodEntry.meal_type || 'Food Entry'}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(foodEntry.created_at)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(foodEntry.created_at)}
                      </span>
                      <span className="flex items-center font-semibold text-orange-600">
                        <Flame className="h-3 w-3 mr-1" />
                        {nutrition.calories} cal
                      </span>
                      {foodEntry.confidence_score && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {Math.round(foodEntry.confidence_score * 100)}% confident
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {!editing ? (
                <Button onClick={() => setEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditedData(foodEntry); }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Top Row: Image + Nutrition + Dishes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Food Image */}
            {foodEntry.image_url && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <ImageModal
                    src={foodEntry.image_url}
                    alt="Food"
                    className="w-full h-72"
                  />
                </CardContent>
              </Card>
            )}

            {/* Nutrition Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nutrition Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Calories - highlighted */}
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-orange-600">{nutrition.calories}</div>
                    <div className="text-sm text-orange-700 font-medium">Calories</div>
                  </div>
                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{nutrition.proteins}g</div>
                      <div className="text-xs text-gray-600">Protein</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">{nutrition.carbohydrates}g</div>
                      <div className="text-xs text-gray-600">Carbs</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">{nutrition.fats}g</div>
                      <div className="text-xs text-gray-600">Fat</div>
                    </div>
                  </div>
                  {/* Micro nutrients */}
                  {(nutrition.fiber > 0 || nutrition.sodium > 0) && (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {nutrition.fiber > 0 && (
                        <div className="bg-green-50 p-2 rounded-lg">
                          <div className="text-sm font-bold text-green-600">{nutrition.fiber}g</div>
                          <div className="text-xs text-gray-600">Fiber</div>
                        </div>
                      )}
                      {nutrition.sodium > 0 && (
                        <div className="bg-red-50 p-2 rounded-lg">
                          <div className="text-sm font-bold text-red-600">{nutrition.sodium}mg</div>
                          <div className="text-xs text-gray-600">Sodium</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Meal Info + Dishes */}
            <div className="space-y-4">
              {/* Meal Details */}
              {!editing && (foodEntry.description || foodEntry.meal_type) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Meal Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {foodEntry.meal_type && (
                      <Badge variant="secondary" className="capitalize">
                        {foodEntry.meal_type}
                      </Badge>
                    )}
                    {foodEntry.description && (
                      <p className="text-sm text-gray-700">{foodEntry.description}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Edit mode */}
              {editing && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Edit Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={editedData.description || ''}
                      onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                      className="min-h-[80px]"
                      placeholder="Describe your food..."
                    />
                  </CardContent>
                </Card>
              )}

              {/* Identified Dishes */}
              {dishNames.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Apple className="h-5 w-5 text-green-600" />
                      Dishes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {dishNames.map((dish: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 text-sm py-1">
                          {dish}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Health Impact - always visible */}
          <HealthImpact extractedNutrients={foodEntry.extracted_nutrients} />

          {/* Food Items Breakdown */}
          {foodItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Dumbbell className="h-5 w-5 text-gray-600" />
                  Individual Items ({foodItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleItems.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-500">{item.serving_size}</p>
                        </div>
                        <div className="flex gap-1">
                          {item.flags?.vegetarian && <Badge variant="outline" className="text-green-600 text-xs">Veg</Badge>}
                          {item.flags?.contains_allergens && <Badge variant="destructive" className="text-xs">Allergens</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-1.5 bg-orange-50 rounded">
                          <div className="font-semibold text-orange-600">{item.calories || item.nutrition_values?.calories || 0}</div>
                          <div className="text-gray-500">cal</div>
                        </div>
                        <div className="text-center p-1.5 bg-blue-50 rounded">
                          <div className="font-semibold text-blue-600">{item.protein || item.nutrition_values?.proteins || 0}g</div>
                          <div className="text-gray-500">protein</div>
                        </div>
                        <div className="text-center p-1.5 bg-yellow-50 rounded">
                          <div className="font-semibold text-yellow-600">{item.carbs || item.nutrition_values?.carbohydrates || 0}g</div>
                          <div className="text-gray-500">carbs</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {foodItems.length > 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllItems(!showAllItems)}
                    className="w-full mt-3"
                  >
                    {showAllItems ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {foodItems.length - 4} More Items
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default FoodDetails;
