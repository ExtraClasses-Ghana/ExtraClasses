import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Verified & qualified teachers",
  "Flexible online & in-person lessons",
  "Secure payment protection",
  "Satisfaction guaranteed",
];

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-gold animate-gradient opacity-95" />
      
      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-pattern-dots" />
      </div>

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-20 left-20 w-20 h-20 rounded-full bg-white/10 blur-sm"
      />
      <motion.div
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute bottom-20 right-20 w-32 h-32 rounded-full bg-white/10 blur-sm"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              Start your learning journey today
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-6"
          >
            Ready to Transform Your <br />
            Academic Journey?
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Join thousands of students across Ghana who are achieving their 
            academic goals with ExtraClasses. Find your perfect teacher today.
          </motion.p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-sm text-white">{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-white text-secondary hover:bg-white/90 rounded-xl px-8 py-6 text-lg font-semibold shadow-large transition-all hover:scale-105"
            >
              Find a Teacher
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-secondary rounded-xl px-8 py-6 text-lg font-semibold transition-all"
            >
              Become a Teacher
            </Button>
          </motion.div>

          {/* Trust Note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-sm text-white/70"
          >
            Free to sign up • No booking fees • Pay only for lessons
          </motion.p>
        </div>
      </div>
    </section>
  );
}
