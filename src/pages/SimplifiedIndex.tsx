
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserType } from "@/contexts/UserTypeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain, Heart, Shield, Users, ArrowRight, CheckCircle,
  Camera, FileText, Dumbbell, ShoppingCart, BarChart3, Mic,
  Lock, EyeOff, Globe
} from "lucide-react";

const SimplifiedIndex = () => {
  const { user, loading: authLoading } = useAuth();
  const { userType, isLoading: userTypeLoading } = useUserType();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || userTypeLoading) return;
    if (!user) return;

    if (userType === 'caretaker') {
      navigate("/caretaker", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, userTypeLoading, userType, navigate]);

  const handleSignIn = () => {
    navigate("/auth");
  };

  const handlePricing = () => {
    navigate("/pricing");
  };

  if (authLoading || (user && userTypeLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your personalized experience...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                Aro
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handlePricing} className="text-gray-600 hover:text-green-600">
                Pricing
              </Button>
              <Button onClick={handleSignIn} className="bg-green-600 hover:bg-green-700 text-white px-6">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full text-green-700 text-sm font-medium mb-8">
              <Brain className="h-4 w-4" />
              AI-Powered Health & Finance Tracking
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-green-800 to-gray-900 bg-clip-text text-transparent">
              Snap. Track.
              <span className="block text-green-600">Understand.</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Photograph your meals, scan receipts, log workouts, and track spending.
              AI does the heavy lifting so you can focus on living better.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={handleSignIn}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg h-auto group"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handlePricing}
                className="px-8 py-4 text-lg h-auto"
              >
                View Plans
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                10 free analyses per day
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Works on any device
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              One App. Complete Picture.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From what you eat to what you spend, Aro connects the dots with AI-powered insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Camera className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">AI Food Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Snap a photo of any meal. AI identifies ingredients, estimates calories, macros, and provides detailed nutritional breakdowns.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Receipt Scanning</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Upload grocery receipts and AI extracts every item, price, and vendor. Track food spending automatically.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Dumbbell className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Workout Tracking</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Log exercises with AI assistance. Describe your workout in plain text or voice, and AI structures it for you.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Smart Shopping Lists</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Create shopping lists with natural language. AI suggests items based on your nutrition patterns and past purchases.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Financial Insights</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Upload bank statements and receipts. See spending trends by vendor, category, and time period with automatic reconciliation.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Caretaker Support</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  Invite family members or caregivers to monitor nutrition and wellness data with permission-based access controls.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
              How Aro Works
            </h2>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Capture</h3>
                <p className="text-gray-600">
                  Take a photo, upload a receipt, or describe your meal with text or voice.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analyzes</h3>
                <p className="text-gray-600">
                  Advanced AI identifies food items, extracts receipt data, or structures your workout automatically.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track & Improve</h3>
                <p className="text-gray-600">
                  View trends, track spending, monitor nutrition, and share insights with your care team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full text-green-700 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Your Data. Your Control.
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Security & Privacy Built In
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your health and financial data deserves the highest level of protection. Every piece of data is isolated, encrypted, and fully under your control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-gray-50">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Encrypted & Isolated</h3>
              <p className="text-sm text-gray-600">
                All data is encrypted at rest (AES-256) and in transit (TLS). Each account is fully isolated — no one else can access your data.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-gray-50">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <EyeOff className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Data Sharing</h3>
              <p className="text-sm text-gray-600">
                We never sell, share, or provide your personal data to third parties. Your photos are analyzed by AI and never stored by AI providers.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-gray-50">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Export & Delete Anytime</h3>
              <p className="text-sm text-gray-600">
                Download all your data as JSON or permanently delete your account at any time. You are always in control.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => navigate("/privacy")}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Shield className="h-4 w-4 mr-2" />
              Learn More About Privacy & Security
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-green-600 to-green-700">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Start Tracking Smarter Today
            </h2>
            <p className="text-xl text-green-100 mb-8 opacity-90">
              Free tier includes 10 AI analyses per day. No credit card required.
            </p>
            <Button
              onClick={handleSignIn}
              size="lg"
              variant="secondary"
              className="bg-white text-green-700 hover:bg-gray-100 text-lg px-8 py-4 h-auto font-semibold"
            >
              Create Your Free Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Aro</span>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            AI-Powered Food, Fitness & Finance Tracking
          </p>
          <button
            onClick={() => navigate("/privacy")}
            className="text-gray-500 hover:text-green-400 text-xs underline underline-offset-2 transition-colors"
          >
            Privacy & Security
          </button>
        </div>
      </footer>
    </div>
  );
};

export default SimplifiedIndex;
