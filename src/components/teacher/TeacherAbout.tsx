import { motion } from "framer-motion";
import { GraduationCap, Award, Languages, CheckCircle } from "lucide-react";

interface TeacherAboutProps {
  teacher: {
    bio: string;
    qualifications: string[];
    languages: string[];
    achievements: string[];
  };
}

export function TeacherAbout({ teacher }: TeacherAboutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-6"
    >
      <h2 className="text-xl font-display font-bold text-foreground mb-4">About Me</h2>
      <p className="text-muted-foreground leading-relaxed mb-6">{teacher.bio}</p>

      {/* Qualifications */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Qualifications</h3>
        </div>
        <ul className="space-y-2">
          {teacher.qualifications.map((qual, index) => (
            <li key={index} className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              {qual}
            </li>
          ))}
        </ul>
      </div>

      {/* Languages */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Languages</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {teacher.languages.map((lang) => (
            <span
              key={lang}
              className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Achievements */}
      {teacher.achievements && teacher.achievements.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-foreground">Achievements</h3>
          </div>
          <ul className="space-y-2">
            {teacher.achievements.map((ach, index) => (
              <li key={index} className="flex items-start gap-2 text-muted-foreground">
                <Award className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                {ach}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
