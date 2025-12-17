import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ShoppingCart, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { signInWithGoogle } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DigitalCart</span>
          </Link>
          <Link href="/signup">
            <Button variant="ghost">Create Account</Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-login">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your seller dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGoogleLogin}
              className="w-full gap-2"
              size="lg"
              disabled={isLoading}
              data-testid="button-google-login"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SiGoogle className="w-4 h-4" />
              )}
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Seller Login
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Don't have an account?
              </p>
              <Link href="/signup">
                <Button variant="outline" className="w-full" data-testid="button-create-account">
                  Create Seller Account
                </Button>
              </Link>
            </div>

            <div className="text-center pt-4">
              <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">
                Admin Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
