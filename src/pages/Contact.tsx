import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  MessageSquare,
  Clock,
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

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      details: "extraclassesghana@gmail.com",
      description: "We'll respond within 24 hours"
    },
    {
      icon: Phone,
      title: "Call Us",
      details: "0596352632",
      description: "Mon-Fri, 8am-6pm GMT"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      details: "Accra, Ghana",
      description: "By appointment only"
    },
    {
      icon: Clock,
      title: "Business Hours",
      details: "8:00 AM - 6:00 PM",
      description: "Monday to Friday"
    }
  ];

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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
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
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full text-center hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <info.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{info.title}</h3>
                      <p className="text-primary font-medium">{info.details}</p>
                      <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & FAQs */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Send us a Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Your name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger>
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="How can we help?"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us more about your inquiry..."
                          rows={5}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full btn-coral" disabled={loading}>
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
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* FAQs */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Still have questions?</h3>
                    <p className="text-sm text-primary-foreground/80 mb-4">
                      Our support team is available Monday to Friday, 8am-6pm GMT.
                    </p>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      <Phone className="w-4 h-4 mr-2" />
                      Call 0596352632
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
