import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function Shop() {
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/purchase/remove-ads");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Purchase Successful!",
        description: "Ads have been removed from your account.",
      });
    },
    onError: () => {
      toast({
        title: "Purchase Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    toast({
      title: "In-App Purchase",
      description: "This will use Google Play or iOS App Store billing when running in the mobile app.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" data-testid="text-shop-title">Shop</h1>
          <p className="text-muted-foreground mt-1">Enhance your experience</p>
        </div>

        <Card data-testid="card-remove-ads">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Remove Ads
              </CardTitle>
              {user?.removeAds && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Owned
                </Badge>
              )}
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
                <span>One-time purchase, forever benefit</span>
              </div>
            </div>

            {user?.removeAds ? (
              <Button disabled className="w-full" data-testid="button-already-purchased">
                <Check className="h-4 w-4 mr-2" />
                Already Purchased
              </Button>
            ) : (
              <Button 
                className="w-full" 
                onClick={handlePurchase}
                data-testid="button-purchase-remove-ads"
              >
                Purchase for $5.99
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Payment processed via Google Play or iOS App Store
            </p>
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
