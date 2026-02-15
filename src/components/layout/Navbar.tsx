import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import logo from "@/assets/extraclasses-logo.webp";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Find Teachers", href: "/teachers" },
];

const dropdownMenus = {
  resources: {
    label: "Resources",
    items: [
      { name: "Subjects", href: "/subjects", description: "Browse all available subjects" },
      { name: "Course Materials", href: "/course-materials", description: "Study notes, past questions & videos" },
    ]
  },
  company: {
    label: "Company",
    items: [
      { name: "About Us", href: "/about", description: "Learn about ExtraClasses Ghana" },
      { name: "Contact", href: "/contact", description: "Get in touch with us" },
    ]
  }
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  
  const isHomePage = location.pathname === "/";
  const isHeroVisible = isHomePage && !scrolled;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (location.state?.openAuth) {
      setAuthModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const openLogin = () => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  };

  const openSignup = () => {
    setAuthModalTab("signup");
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (role === "teacher") return "/dashboard/teacher";
    if (role === "student") return "/dashboard/student";
    if (role === "admin") return "/admin";
    return "/";
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-soft"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo - Larger */}
            <Link to="/" className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="ExtraClasses Ghana" 
                className="w-14 h-14 lg:w-16 lg:h-16 object-contain"
              />
              <div className="flex flex-col">
                <span className={`font-display font-bold text-lg leading-tight transition-colors duration-300 ${isHeroVisible ? 'text-primary' : 'text-primary'}`}>
                  EXTRACLASSES
                </span>
                <span className={`text-xs font-semibold tracking-widest -mt-0.5 transition-colors duration-300 ${isHeroVisible ? 'text-secondary' : 'text-secondary'}`}>
                  GHANA
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="px-4 py-2 text-sm font-medium transition-colors rounded-lg text-primary hover:text-primary/80 hover:bg-muted"
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Resources Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg text-primary hover:text-primary/80 hover:bg-muted">
                    Resources
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {dropdownMenus.resources.items.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link to={item.href} className="flex flex-col items-start gap-1 cursor-pointer">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Company Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg text-primary hover:text-primary/80 hover:bg-muted">
                    Company
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {dropdownMenus.company.items.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link to={item.href} className="flex flex-col items-start gap-1 cursor-pointer">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {profile?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {profile?.full_name?.split(' ')[0] || "User"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {role} Account
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" className="font-medium" onClick={openLogin}>
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                  <Button className="btn-coral" onClick={openSignup}>
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-white border-t"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 text-primary hover:text-primary/80 font-medium"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                
                {/* Mobile Dropdowns */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resources</p>
                  {dropdownMenus.resources.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 pl-4 text-primary hover:text-primary/80"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</p>
                  {dropdownMenus.company.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 pl-4 text-primary hover:text-primary/80"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-3">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {profile?.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile?.full_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{role}</p>
                        </div>
                      </div>
                      <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full text-destructive"
                        onClick={() => {
                          handleSignOut();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setIsOpen(false);
                          openLogin();
                        }}
                      >
                        Sign In
                      </Button>
                      <Button 
                        className="w-full btn-coral"
                        onClick={() => {
                          setIsOpen(false);
                          openSignup();
                        }}
                      >
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}
