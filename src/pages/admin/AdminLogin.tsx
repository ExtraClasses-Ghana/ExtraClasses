import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/extraclasses-logo.webp";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Rate limiting states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    // Optional: Sync with localStorage for persistency across refreshes
    const storedLockout = localStorage.getItem("adminLogLockoutUntil");
    const storedAttempts = localStorage.getItem("adminLogFailedAttempts");
    if (storedLockout) setLockoutUntil(parseInt(storedLockout, 10));
    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts, 10));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      toast.error(`Too many failed attempts. Try again in ${minutes}m ${seconds}s.`);
      return;
    }

    if (lockoutUntil && Date.now() >= lockoutUntil) {
       // Reset after lockout expires
       setLockoutUntil(null);
       setFailedAttempts(0);
       localStorage.removeItem("adminLogLockoutUntil");
       localStorage.removeItem("adminLogFailedAttempts");
    }

    setLoading(true);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (roleError) throw roleError;

      if (roleData.role !== "admin") {
        await supabase.auth.signOut();
        toast.error("Access denied. Admin credentials required.");
        handleFailure();
        return;
      }

      // Success resetting limits
      setFailedAttempts(0);
      setLockoutUntil(null);
      localStorage.removeItem("adminLogFailedAttempts");
      localStorage.removeItem("adminLogLockoutUntil");

      toast.success("Welcome to Admin Dashboard");
      navigate("/admin");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Invalid credentials");
      handleFailure();
    } finally {
      setLoading(false);
    }
  };

  const handleFailure = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    localStorage.setItem("adminLogFailedAttempts", newAttempts.toString());

    if (newAttempts >= 3) {
      // 5-minute initial lock
      const lockTime = Date.now() + 5 * 60 * 1000;
      setLockoutUntil(lockTime);
      localStorage.setItem("adminLogLockoutUntil", lockTime.toString());
      toast.error("Maximum attempts reached. Account locked for 5 minutes.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/logo-animate.gif" 
                alt="ExtraClasses Ghana" 
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Admin Portal</CardTitle>
            </div>
            <CardDescription>
              Sign in with your administrator credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@extraclassesghana.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In to Admin
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Not an administrator?{" "}
                <a href="/" className="text-primary hover:underline font-medium">
                  Return to main site
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
