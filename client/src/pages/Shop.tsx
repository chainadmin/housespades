import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Sparkles, Clock } from "lucide-react";

export default function Shop() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" data-testid="text-shop-title">Shop</h1>
          <p className="text-muted-foreground mt-1">Enhance your experience</p>
        </div>

        <Card className="relative overflow-hidden" data-testid="card-remove-ads">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Badge variant="secondary" className="text-lg px-4 py-2 mb-2">
              <Clock className="h-4 w-4 mr-2" />
              Coming Soon
            </Badge>
            <p className="text-muted-foreground text-sm text-center px-4">
              In-app purchases will be available in a future update
            </p>
          </div>
          
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Remove Ads
              </CardTitle>
            </div>
            <CardDescription>
              Enjoy an ad-free gaming experience forever
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>No more interstitial ads between games</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>No banner ads during gameplay</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>One-time purchase - $5.99</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-lg">More Coming Soon</CardTitle>
            <CardDescription>
              Additional cosmetics and features will be available in future updates
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
