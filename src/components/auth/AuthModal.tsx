import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, GraduationCap, Users, Phone, MapPin } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
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

        const displayName = title ? `${title} ${fullName}` : fullName;
        const { error } = await signUp(email, password, displayName, selectedRole);
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Welcome to ExtraClasses Ghana.",
        });
        onClose();
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
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Large Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
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
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-coral"
              disabled={isLoading}
            >
              {isLoading
                ? "Please wait..."
                : tab === "login"
                ? "Sign In"
                : "Create Account"}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
