import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== "delete") {
      toast({
        title: "Confirmation required",
        description: "Please type 'delete' to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/auth/account");
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      });
      logout();
      navigate("/splash");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 sm:p-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-6">Settings</h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium">{user?.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">{user?.rating || 1000}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Games Played</span>
                  <span className="font-medium">{user?.gamesPlayed || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal</CardTitle>
                <CardDescription>Privacy and terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/privacy">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-privacy">
                    Privacy Policy
                  </Button>
                </Link>
                <Link href="/terms">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-terms">
                    Terms of Service
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showDeleteSection ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteSection(true)}
                    data-testid="button-show-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-destructive/10 rounded-lg text-sm space-y-2">
                      <p className="font-medium text-destructive">This action cannot be undone.</p>
                      <p className="text-muted-foreground">
                        Deleting your account will permanently remove all your data including:
                      </p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        <li>Your profile and account information</li>
                        <li>Game statistics and match history</li>
                        <li>Rating and ranking data</li>
                        <li>Any purchases (no refunds will be issued)</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm">
                        Type <span className="font-mono font-bold">delete</span> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        type="text"
                        placeholder="Type 'delete' here"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        data-testid="input-delete-confirm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteSection(false);
                          setDeleteConfirmation("");
                        }}
                        data-testid="button-cancel-delete"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation.toLowerCase() !== "delete" || isDeleting}
                        data-testid="button-confirm-delete"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete My Account"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
