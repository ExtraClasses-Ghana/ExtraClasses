import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import headerBackground from "@/assets/header-background.jpg";
import logo from "@/assets/extraclasses-logo.webp";

const stats = [
  { icon: Users, value: "10,000+", label: "Active Students" },
  { icon: Award, value: "2,500+", label: "Verified Teachers" },
  { icon: Star, value: "4.9/5", label: "Average Rating" },
];

const popularSubjects = [
  "Mathematics",
  "English Language",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "French",
  "ICT",
  "Economics",
  "Accounting",
  "History",
  "Geography",
  "Additional Mathematics",
  "Computing",
  "Business Management"
];

export function HeroSection() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSubjects = searchQuery.trim()
    ? popularSubjects.filter(subject =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    navigate(`/teachers?${params.toString()}`);
  };

  const handleSubjectClick = (subject: string) => {
    navigate(`/teachers?q=${encodeURIComponent(subject)}`);
  };

  const handleSuggestionClick = (subject: string) => {
    setSearchQuery(subject);
    setShowSuggestions(false);
    navigate(`/teachers?q=${encodeURIComponent(subject)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-muted/30">
      {/* Header with Background Image */}
      <div className="relative h-80 lg:h-96">
        <img 
          src={headerBackground} 
          alt="Education background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/75" />
        
        {/* Header Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <img 
              src={logo} 
              alt="ExtraClasses Ghana" 
              className="w-40 h-40 lg:w-56 lg:h-56 mx-auto object-contain drop-shadow-xl"
            />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex-1">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-primary">
                Ghana's #1 Tutoring Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-primary leading-tight mb-6"
            >
              Learn From{" "}
              <span className="text-secondary">Ghana's Best</span>{" "}
              Teachers
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Connect with qualified, verified tutors for personalized learning 
              experiences. Whether online or in-person, find the perfect teacher 
              to help you achieve your academic goals.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-2 shadow-large max-w-xl mx-auto lg:mx-0 relative border border-border"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="What do you want to learn?"
                    className="pl-10 h-12 border-0 bg-transparent focus-visible:ring-0"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => searchQuery && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && filteredSubjects.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                      {filteredSubjects.map((subject) => (
                        <button
                          key={subject}
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-2"
                          onClick={() => handleSuggestionClick(subject)}
                        >
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <span>{subject}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Location in Ghana"
                    className="pl-10 h-12 border-0 bg-transparent focus-visible:ring-0"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                </div>
                <Button className="btn-coral h-12 px-8" onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </motion.div>

            {/* Popular Subjects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex flex-wrap items-center gap-2 justify-center lg:justify-start"
            >
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popularSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleSubjectClick(subject)}
                  className="px-3 py-1 rounded-full bg-primary/10 text-sm text-primary hover:bg-primary/20 transition-colors"
                >
                  {subject}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Right Content - Feature Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:flex flex-col items-center justify-center"
          >
            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-white rounded-2xl px-6 py-4 shadow-medium border border-border mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">All Teachers</p>
                  <p className="font-semibold text-foreground text-lg">Verified & Vetted</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Avatar Stack */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="bg-white rounded-2xl px-6 py-4 shadow-medium border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-gold border-2 border-white"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">10K+</p>
                  <p className="text-sm text-muted-foreground">Happy Students</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
              className="flex items-center justify-center sm:justify-start gap-4 bg-white rounded-2xl p-6 shadow-sm border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
