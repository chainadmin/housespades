import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardStylePicker } from "@/components/CardStylePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Palette, Moon, ShoppingBag } from "lucide-react";

export default function Settings() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Dark Mode</span>
              </div>
              <ThemeToggle />
            </div>

            <CardStylePicker />
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => navigate("/shop")} data-testid="card-shop-link">
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Shop</p>
              <p className="text-sm text-muted-foreground">Remove ads and more</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
