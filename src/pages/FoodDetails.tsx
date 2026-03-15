import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Edit, Save, X, Flame, Calendar, Clock, ChevronDown, Heart, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ImageModal } from "@/components/ui/image-modal";
import { FoodEntry } from "@/types/food";

const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [foodEntry, setFoodEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<FoodEntry>>({});
  const [itemsOpen, setItemsOpen] = useState(true);

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
          <div className="text-lg text-muted-foreground">Loading food details...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!foodEntry) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Food entry not found</div>
        </div>
      </SidebarLayout>
    );
  }

  const nutrition = getNutritionFromData(foodEntry);
  const dishNames = getDishNames(foodEntry);
  const foodItems = getFoodItems(foodEntry);

  const healthAssessment = foodEntry.extracted_nutrients?.health_assessment || {};
  const nutritionFocus = foodEntry.extracted_nutrients?.nutrition_focus || {};
  const hasHealthData = healthAssessment.diabetes || healthAssessment.hypertension;
  const hasNutritionData = nutritionFocus.nutrients_high?.length > 0 || nutritionFocus.nutrients_low?.length > 0;
  const hasAnyHealthInfo = hasHealthData || hasNutritionData || nutritionFocus.suggestion;

  // Calculate macro percentages for progress bars (based on typical daily values)
  const macroPercent = (val: number, daily: number) => Math.min(Math.round((val / daily) * 100), 100);

  const getRatingColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'excellent': case 'good': return 'bg-emerald-100 text-emerald-700';
      case 'moderate': case 'fair': return 'bg-amber-100 text-amber-700';
      case 'poor': case 'bad': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate("/food")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(foodEntry.created_at)}
                  <Clock className="h-3.5 w-3.5 ml-1" />
                  {formatTime(foodEntry.created_at)}
                </div>
              </div>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditedData(foodEntry); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          {/* Hero: Image + Title + Macros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Image */}
            {foodEntry.image_url ? (
              <div className="rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                <ImageModal
                  src={foodEntry.image_url}
                  alt="Food"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-muted aspect-[4/3] flex items-center justify-center">
                <Flame className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Right: Title + Nutrition */}
            <div className="flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {foodEntry.description || foodEntry.meal_type || 'Food Entry'}
                </h1>

                <div className="flex items-center gap-2 mt-2">
                  {foodEntry.meal_type && (
                    <Badge variant="secondary" className="capitalize font-normal">
                      {foodEntry.meal_type}
                    </Badge>
                  )}
                  {foodEntry.confidence_score && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {Math.round(foodEntry.confidence_score * 100)}% confidence
                    </Badge>
                  )}
                </div>

                {dishNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dishNames.map((dish: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                        {dish}
                      </Badge>
                    ))}
                  </div>
                )}

                {editing && (
                  <Textarea
                    value={editedData.description || ''}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    className="mt-3 min-h-[80px]"
                    placeholder="Describe your food..."
                  />
                )}
              </div>

              {/* Calorie + Macro Summary */}
              <div className="mt-4 space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums">{nutrition.calories}</span>
                  <span className="text-muted-foreground text-sm">calories</span>
                </div>

                <div className="space-y-2.5">
                  <MacroRow label="Protein" value={nutrition.proteins} unit="g" daily={50} color="bg-blue-500" />
                  <MacroRow label="Carbs" value={nutrition.carbohydrates} unit="g" daily={300} color="bg-amber-500" />
                  <MacroRow label="Fat" value={nutrition.fats} unit="g" daily={65} color="bg-purple-500" />
                  {nutrition.fiber > 0 && (
                    <MacroRow label="Fiber" value={nutrition.fiber} unit="g" daily={25} color="bg-emerald-500" />
                  )}
                  {nutrition.sodium > 0 && (
                    <MacroRow label="Sodium" value={nutrition.sodium} unit="mg" daily={2300} color="bg-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Health Impact */}
          {hasAnyHealthInfo && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-rose-500" />
                  Health Impact
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {healthAssessment.diabetes && (
                    <Card className="border-l-4 border-l-amber-400">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Diabetes</span>
                          <Badge variant="secondary" className={`${getRatingColor(healthAssessment.diabetes.rating)} text-xs font-medium`}>
                            {healthAssessment.diabetes.rating}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {healthAssessment.diabetes.suggestion}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {healthAssessment.hypertension && (
                    <Card className="border-l-4 border-l-rose-400">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Hypertension</span>
                          <Badge variant="secondary" className={`${getRatingColor(healthAssessment.hypertension.rating)} text-xs font-medium`}>
                            {healthAssessment.hypertension.rating}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {healthAssessment.hypertension.suggestion}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {nutritionFocus.nutrients_high?.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">High in</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {nutritionFocus.nutrients_high.map((nutrient: string, i: number) => (
                            <Badge key={i} variant="destructive" className="text-xs font-normal">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {nutrient}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {nutritionFocus.nutrients_low?.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Low in</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {nutritionFocus.nutrients_low.map((nutrient: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal bg-blue-50 text-blue-700">
                              {nutrient}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {nutritionFocus.suggestion && (
                  <div className="mt-3 flex gap-3 p-4 rounded-lg bg-muted/50">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {nutritionFocus.suggestion}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Food Items */}
          {foodItems.length > 0 && (
            <>
              <Separator />
              <Collapsible open={itemsOpen} onOpenChange={setItemsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full group">
                    <h2 className="text-lg font-semibold">
                      Items Breakdown
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        {foodItems.length} {foodItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </h2>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${itemsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 space-y-2">
                    {foodItems.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{item.name}</span>
                            {item.flags?.vegetarian && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Vegetarian" />
                            )}
                            {item.flags?.contains_allergens && (
                              <Badge variant="destructive" className="text-[10px] h-4 px-1">Allergens</Badge>
                            )}
                          </div>
                          {item.serving_size && (
                            <span className="text-xs text-muted-foreground">{item.serving_size}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs tabular-nums shrink-0 ml-4">
                          <div className="text-center">
                            <div className="font-semibold">{item.calories || item.nutrition_values?.calories || 0}</div>
                            <div className="text-muted-foreground">cal</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{item.protein || item.nutrition_values?.proteins || 0}g</div>
                            <div className="text-muted-foreground">pro</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-amber-600">{item.carbs || item.nutrition_values?.carbohydrates || 0}g</div>
                            <div className="text-muted-foreground">carb</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-600">{item.fat || item.nutrition_values?.fats || 0}g</div>
                            <div className="text-muted-foreground">fat</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

const MacroRow = ({ label, value, unit, daily, color }: {
  label: string; value: number; unit: string; daily: number; color: string;
}) => {
  const percent = Math.min(Math.round((value / daily) * 100), 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-12 text-right">{value}{unit}</span>
    </div>
  );
};

export default FoodDetails;
