import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, BadgeCheck, Video, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Teacher } from "@/data/teachers";
import { cn } from "@/lib/utils";

interface TeacherCardProps {
  teacher: Teacher;
  view: "grid" | "list";
  index: number;
}

export function TeacherCard({ teacher, view, index }: TeacherCardProps) {
  if (view === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <Link to={`/teacher/${teacher.id}`}>
          <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 hover:-translate-y-1 transition-all duration-300 group">
            {/* Image */}
            <div className="relative flex-shrink-0">
              <div className="w-full sm:w-32 h-48 sm:h-32 rounded-xl overflow-hidden">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              {teacher.verified && (
                <div className="absolute top-2 right-2 sm:top-2 sm:left-2 sm:right-auto bg-accent text-white p-1.5 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {teacher.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{teacher.subject} Specialist</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="font-medium">{teacher.rating}</span>
                  <span className="text-muted-foreground text-sm">({teacher.reviews})</span>
                </div>
              </div>

              {/* Subject Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {teacher.subjects.slice(0, 3).map((subj) => (
                  <span
                    key={subj}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {subj}
                  </span>
                ))}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {teacher.location}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {teacher.experience}
                </div>
                {teacher.online && (
                  <div className="flex items-center gap-1 text-accent">
                    <Video className="w-3.5 h-3.5" />
                    Online
                  </div>
                )}
                {teacher.inPerson && (
                  <div className="flex items-center gap-1 text-gold">
                    <Home className="w-3.5 h-3.5" />
                    In-Person
                  </div>
                )}
              </div>

              {/* Price & CTA */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-secondary">GH₵{teacher.hourlyRate}</span>
                  <span className="text-muted-foreground text-sm">/hour</span>
                </div>
                <Button size="sm" className="btn-coral">
                  Book Session
                </Button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/teacher/${teacher.id}`}>
        <div className="teacher-card group cursor-pointer h-full">
          {/* Image */}
          <div className="relative mb-4">
            <div className="aspect-square rounded-xl overflow-hidden">
              <img
                src={teacher.image}
                alt={teacher.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            {teacher.verified && (
              <div className="absolute top-3 right-3 bg-accent text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-md">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {teacher.name}
              </h3>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-gold text-gold" />
                <span className="font-medium">{teacher.rating}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{teacher.subject}</p>

            {/* Subject Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {teacher.subjects.slice(0, 2).map((subj) => (
                <span
                  key={subj}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {subj}
                </span>
              ))}
              {teacher.subjects.length > 2 && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                  +{teacher.subjects.length - 2}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {teacher.location}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {teacher.experience}
              </div>
            </div>

            {/* Teaching Modes & Price */}
            <div className="flex items-center justify-between pt-3 border-t border-border mb-4">
              <div className="flex items-center gap-2">
                {teacher.online && (
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center" title="Online">
                    <Video className="w-3.5 h-3.5 text-accent" />
                  </div>
                )}
                {teacher.inPerson && (
                  <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center" title="In-Person">
                    <Home className="w-3.5 h-3.5 text-gold" />
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-secondary">GH₵{teacher.hourlyRate}</p>
                <p className="text-xs text-muted-foreground">/hour</p>
              </div>
            </div>

            <Button className="w-full btn-coral text-sm">Book Session</Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
