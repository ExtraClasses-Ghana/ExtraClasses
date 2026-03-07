import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { 
  Send, 
  MessageSquare,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const emailIcon = new URL('../../icons/Email.png', import.meta.url).href;
const phoneIcon = new URL('../../icons/Phone icon.png', import.meta.url).href;
const mapIcon = new URL('../../icons/Map icon.png', import.meta.url).href;
const clockIcon = new URL('../../icons/Clock icon.png', import.meta.url).href;

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            category: formData.category,
            message: formData.message,
          }
        ]);

      if (error) throw error;

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", category: "", message: "" });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const PHONE_NUMBER = "0596352632";
  const PHONE_NUMBER_INTERNATIONAL = "+233596352632";
  const SUPPORT_EMAIL = "extraclassesghana@gmail.com";

  const contactInfo = [
    {
      icon: emailIcon,
      title: "Email Us",
      details: SUPPORT_EMAIL,
      description: "We'll respond within 24 hours"
    },
    {
      icon: phoneIcon,
      title: "Call Us",
      details: PHONE_NUMBER,
      description: "Mon-Fri, 8am-6pm GMT"
    },
    {
      icon: mapIcon,
      title: "Visit Us",
      details: "Accra, Ghana",
      description: "By appointment only"
    },
    {
      icon: clockIcon,
      title: "Business Hours",
      details: "8:00 AM - 6:00 PM",
      description: "Monday to Friday"
    }
  ];

  const handleCallClick = () => {
    try {
      window.location.href = `tel:${PHONE_NUMBER_INTERNATIONAL}`;
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error("Unable to initiate call. Please try calling directly.");
    }
  };

  const handleEmailClick = () => {
    try {
      window.location.href = `mailto:${SUPPORT_EMAIL}`;
    } catch (error) {
      console.error('Error initiating email:', error);
      toast.error("Unable to open email client. Please email us directly.");
    }
  };

  const faqs = [
    {
      question: "How do I become a teacher on ExtraClasses Ghana?",
      answer: "Sign up as a teacher, complete your profile, and upload verification documents. Our team will review and approve your account within 48 hours."
    },
    {
      question: "How are payments processed?",
      answer: "We use secure payment methods including mobile money and bank transfers. Teachers receive payments after completed sessions."
    },
    {
      question: "Can I book a trial session?",
      answer: "Yes! Many teachers offer discounted trial sessions. Check individual teacher profiles for availability."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-primary via-primary/90 to-accent/80 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Contact Us
              </h1>
              <p className="text-xl text-white/90">
                Have questions or feedback? We're here to help you succeed.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-16 lg:py-24 bg-gradient-to-b from-background via-background to-muted/20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Multiple Ways to Connect</h2>
              <p className="text-muted-foreground">Choose the method that works best for you</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, index) => {
                const isClickable = info.title === "Call Us" || info.title === "Email Us";
                const cardColors = [
                  "from-blue-500/10 to-blue-600/10",
                  "from-green-500/10 to-green-600/10",
                  "from-orange-500/10 to-orange-600/10",
                  "from-purple-500/10 to-purple-600/10"
                ];

                return (
                  <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15, duration: 0.5 }}
                    className="h-full"
                  >
                    <motion.div
                      whileHover={{ y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="h-full"
                    >
                      <Card 
                        className={`h-full text-center border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-${isClickable ? 'pointer' : 'default'}`}
                        onClick={isClickable ? (info.title === "Call Us" ? handleCallClick : handleEmailClick) : undefined}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${cardColors[index]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        
                        <CardContent className="pt-6 relative z-10">
                          <motion.div
                            className={`w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300`}
                            whileHover={{ scale: 1.15, rotate: 12 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <motion.div
                              initial={{ scale: 1 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.1 }}
                            >
                              <img src={info.icon} alt={info.title} className="w-7 h-7 object-contain" />
                            </motion.div>
                          </motion.div>

                          <motion.h3 
                            className="font-semibold text-foreground mb-2 text-lg"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {info.title}
                          </motion.h3>

                          <motion.p 
                            className={`font-medium transition-all duration-300 ${
                              isClickable ? "text-primary hover:text-primary/70" : "text-primary"
                            }`}
                            whileHover={{ scale: 1.02 }}
                          >
                            {info.details}
                          </motion.p>

                          <motion.p 
                            className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300"
                            initial={{ opacity: 0.7 }}
                            whileHover={{ opacity: 1 }}
                          >
                            {info.description}
                          </motion.p>

                          {isClickable && (
                            <motion.div
                              className="mt-3 h-0.5 bg-primary rounded-full"
                              initial={{ width: 0 }}
                              whileHover={{ width: "100%" }}
                              transition={{ duration: 0.3 }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Form & FAQs */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="border-b border-muted/20 pb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                    >
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <motion.div
                          whileHover={{ rotate: 20, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"
                        >
                          <MessageSquare className="w-5 h-5 text-primary" />
                        </motion.div>
                        Send us a Message
                      </CardTitle>
                    </motion.div>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 }}
                        >
                          <Label htmlFor="name" className="font-medium">Full Name</Label>
                          <motion.div
                            whileFocus={{ scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Your name"
                              required
                              className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                            />
                          </motion.div>
                        </motion.div>
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 }}
                        >
                          <Label htmlFor="email" className="font-medium">Email Address</Label>
                          <motion.div
                            whileFocus={{ scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="your@email.com"
                              required
                              className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                            />
                          </motion.div>
                        </motion.div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                        >
                          <Label htmlFor="category" className="font-medium">Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/50">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="support">Technical Support</SelectItem>
                              <SelectItem value="billing">Billing & Payments</SelectItem>
                              <SelectItem value="teacher">Teacher Registration</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                        </motion.div>
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.25 }}
                        >
                          <Label htmlFor="subject" className="font-medium">Subject</Label>
                          <motion.div
                            whileFocus={{ scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Input
                              id="subject"
                              value={formData.subject}
                              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                              placeholder="How can we help?"
                              required
                              className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                            />
                          </motion.div>
                        </motion.div>
                      </div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                      >
                        <Label htmlFor="message" className="font-medium">Message</Label>
                        <motion.div
                          whileFocus={{ scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Tell us more about your inquiry..."
                            rows={5}
                            required
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/50 resize-none"
                          />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.35 }}
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={loading}
                          className="w-full btn-coral font-medium py-2.5 rounded-lg transition-all duration-200"
                        >
                          <motion.div
                            className="flex items-center justify-center"
                            animate={loading ? { opacity: [1, 0.7, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Message
                              </>
                            )}
                          </motion.div>
                        </motion.button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* FAQs */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-muted-foreground">Quick answers to common questions</p>
                </motion.div>

                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                    >
                      <motion.div
                        whileHover={{ y: -4, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                          <div className="absolute inset-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <CardContent className="pt-6">
                            <motion.h3
                              className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300"
                              whileHover={{ x: 4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {faq.question}
                            </motion.h3>
                            <motion.p
                              className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                              initial={{ opacity: 0.8 }}
                              whileHover={{ opacity: 1 }}
                            >
                              {faq.answer}
                            </motion.p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="bg-gradient-to-br from-primary via-primary/90 to-accent/80 text-primary-foreground border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="pt-6">
                      <motion.div
                        initial={{ scale: 0.95 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                      >
                        <h3 className="font-semibold mb-2 text-lg">Still have questions?</h3>
                        <p className="text-sm text-primary-foreground/80 mb-4">
                          Our support team is available Monday to Friday, 8am-6pm GMT.
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="secondary" 
                            className="w-full sm:w-auto font-medium transition-all duration-200"
                            onClick={handleCallClick}
                            title={`Call us at ${PHONE_NUMBER}`}
                          >
                            <motion.div
                              className="flex items-center"
                              whileHover={{ x: 4 }}
                            >
                              <img src={phoneIcon} alt="call" className="w-4 h-4 mr-2 object-contain" />
                              Call {PHONE_NUMBER}
                            </motion.div>
                          </Button>
                        </motion.div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
