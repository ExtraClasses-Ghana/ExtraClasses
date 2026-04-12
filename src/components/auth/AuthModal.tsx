import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, GraduationCap, Users, Phone, MapPin, Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEducationLevels } from "@/hooks/useEducationLevel";
import logo from "@/assets/extraclasses-logo.webp";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

type AppRole = "student" | "teacher";

const titles = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."];

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Western North", "Oti", "Savannah", "North East"
];

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [educationCategory, setEducationCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerificationPending, setIsVerificationPending] = useState(false);

  const { levels: educationLevels, loading: loadingLevels } = useEducationLevels();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (tab === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        onClose();
      } else {
        // Validate required fields
        if (!phone.trim()) {
          throw new Error("Phone number is required");
        }
        if (!region) {
          throw new Error("Please select your region");
        }
        if (!educationCategory) {
          throw new Error("Please select your education category");
        }

        const displayName = title ? `${title} ${fullName}` : fullName;
        const { error, data } = await signUp(
          email,
          password,
          displayName,
          selectedRole,
          educationCategory,
          null,
          phone.trim()
        );
        if (error) throw error;
        
        // Supabase often requires email verification before users can log in
        if (data?.user?.identities && data.user.identities.length > 0) {
           setIsVerificationPending(true);
        } else {
           toast({
            title: "Account created!",
            description: "Welcome to ExtraClasses Ghana.",
          });
          onClose();
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setTitle("");
    setPhone("");
    setRegion("");
    setSelectedRole("student");
    setEducationCategory("");
    setIsVerificationPending(false);
  };

  const switchTab = (newTab: "login" | "signup") => {
    resetForm();
    setTab(newTab);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-primary to-accent p-6 text-white relative">
            <button
              onClick={onClose}
              title="Close dialog"
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Large Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/logo-animate.gif" 
                alt="ExtraClasses Ghana" 
                className="w-32 h-32 object-contain"
              />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-center">
              {tab === "login" ? "Welcome Back" : "Join ExtraClasses Ghana"}
            </h2>
            <p className="text-white/80 mt-1 text-center">
              {tab === "login"
                ? "Sign in to continue your learning journey"
                : "Create an account to get started"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab("signup")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === "signup"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          {isVerificationPending ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MailCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">Check Your Email</h3>
              <p className="text-slate-600 mb-8">
                We've sent a verification link to <span className="font-semibold text-slate-800">{email}</span>. 
                Please verify your email address to activate your account.
              </p>
              <Button 
                onClick={onClose}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
              >
                Okay, I'll check
              </Button>
            </motion.div>
          ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {tab === "signup" && (
              <>
                {/* Title and Full Name */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Select value={title} onValueChange={setTitle}>
                      <SelectTrigger>
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Select value={region} onValueChange={setRegion} required>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Education Category */}
                <div className="space-y-2">
                  <Label htmlFor="educationCategory">Education Category *</Label>
                  <Select value={educationCategory} onValueChange={setEducationCategory}>
                    <SelectTrigger disabled={loadingLevels}>
                      <SelectValue placeholder={loadingLevels ? "Loading..." : "Select your education category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("student")}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedRole === "student"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Users className="w-6 h-6" />
                      <span className="font-medium">Parent/Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("teacher")}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedRole === "teacher"
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <GraduationCap className="w-6 h-6" />
                      <span className="font-medium">Teacher</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
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
              {tab === 'login' && (
                <div className="text-right text-sm mt-1">
                  <a
                    href="/auth/reset-password"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </a>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : tab === "login" ? "Sign In" : "Create Account"}
            </Button>

            {tab === "login" && (
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            )}

            {tab === "signup" && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
