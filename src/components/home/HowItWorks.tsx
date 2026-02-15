import { motion } from "framer-motion";
import { Search, CalendarCheck, GraduationCap, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Find Your Teacher",
    description: "Browse through verified tutors by subject, location, rating, and availability. Read reviews and compare rates.",
    color: "from-secondary to-secondary/80",
  },
  {
    icon: CalendarCheck,
    number: "02",
    title: "Book a Session",
    description: "Choose between online or in-person lessons. Schedule at your convenience and pay securely through our platform.",
    color: "from-accent to-accent/80",
  },
  {
    icon: GraduationCap,
    number: "03",
    title: "Start Learning",
    description: "Connect with your teacher, access learning materials, and track your progress. Achieve your academic goals!",
    color: "from-gold to-gold/80",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(79,209,199,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,126,93,0.1),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            How ExtraClasses <span className="text-secondary">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Getting started with personalized tutoring in Ghana has never been easier. 
            Just three simple steps to academic excellence.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-20 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-0.5 bg-gradient-to-r from-border via-secondary/30 to-border">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.3 }}
                    className="absolute inset-0 bg-gradient-to-r from-secondary to-accent origin-left"
                  />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 text-secondary" />
                </div>
              )}

              <div className="bg-card rounded-3xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 group-hover:-translate-y-2 h-full">
                {/* Step Number */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-5xl font-display font-bold text-muted-foreground/20 group-hover:text-secondary/30 transition-colors">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <button className="btn-coral inline-flex items-center gap-2">
            Get Started Today
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
