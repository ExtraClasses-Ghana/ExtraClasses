import { motion } from "framer-motion";
import { 
  Calculator, 
  BookOpen, 
  FlaskConical, 
  Globe2, 
  Languages, 
  Monitor,
  Palette,
  Music,
  Trophy,
  ArrowRight
} from "lucide-react";

const subjects = [
  { icon: Calculator, name: "Mathematics", count: 450, color: "bg-secondary/10 text-secondary hover:bg-secondary hover:text-white" },
  { icon: BookOpen, name: "English", count: 380, color: "bg-accent/10 text-accent hover:bg-accent hover:text-white" },
  { icon: FlaskConical, name: "Sciences", count: 320, color: "bg-gold/10 text-gold hover:bg-gold hover:text-white" },
  { icon: Globe2, name: "Social Studies", count: 210, color: "bg-primary/10 text-primary hover:bg-primary hover:text-white" },
  { icon: Languages, name: "Languages", count: 185, color: "bg-secondary/10 text-secondary hover:bg-secondary hover:text-white" },
  { icon: Monitor, name: "ICT", count: 156, color: "bg-accent/10 text-accent hover:bg-accent hover:text-white" },
  { icon: Palette, name: "Arts & Design", count: 98, color: "bg-gold/10 text-gold hover:bg-gold hover:text-white" },
  { icon: Music, name: "Music", count: 76, color: "bg-primary/10 text-primary hover:bg-primary hover:text-white" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export function SubjectCategories() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-gold/10 text-gold text-sm font-semibold mb-4">
            Browse by Subject
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Explore <span className="text-secondary">50+ Subjects</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From primary school basics to university-level courses, find expert 
            tutors in every subject area across Ghana.
          </p>
        </motion.div>

        {/* Subjects Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {subjects.map((subject) => (
            <motion.div
              key={subject.name}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className={`group p-6 rounded-2xl cursor-pointer transition-all duration-300 ${subject.color} hover:shadow-lg`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/80 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <subject.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{subject.name}</h3>
                  <p className="text-sm opacity-70">{subject.count} tutors</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <a href="/subjects" className="inline-flex items-center gap-2 text-primary font-semibold hover:text-secondary transition-colors group">
            View All Subjects
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
