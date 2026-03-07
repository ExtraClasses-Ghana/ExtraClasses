import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { 
  Target,
  Lightbulb,
  Users,
  GraduationCap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const mapIcon = new URL('../../icons/Map icon.png', import.meta.url).href;
const emailIcon = new URL('../../icons/Email.png', import.meta.url).href;
const phoneIcon = new URL('../../icons/Phone icon.png', import.meta.url).href;
const graduationHat = new URL('../../icons/Graduation hat.png', import.meta.url).href;
const communityIcon = new URL('../../icons/Community icon.png', import.meta.url).href;
const medalIcon = new URL('../../icons/Medal icon.png', import.meta.url).href;
const heartIcon = new URL('../../icons/Heart icon.png', import.meta.url).href;

export default function AboutUs() {
  const values = [
    {
      icon: graduationHat,
      title: "Quality Education",
      description: "We connect students with qualified, verified teachers who are passionate about teaching.",
      isImage: true
    },
    {
      icon: communityIcon,
      title: "Community First",
      description: "Building a supportive learning community across all regions of Ghana.",
      isImage: true
    },
    {
      icon: medalIcon,
      title: "Excellence",
      description: "We strive for excellence in every tutoring session and student outcome.",
      isImage: true
    },
    {
      icon: heartIcon,
      title: "Accessibility",
      description: "Making quality education accessible to every student, regardless of location.",
      isImage: true
    }
  ];

  const team = [
    { role: "Founder & CEO", description: "Passionate about transforming education in Ghana" },
    { role: "Head of Education", description: "15+ years in curriculum development" },
    { role: "Technology Lead", description: "Building the future of online learning" },
    { role: "Community Manager", description: "Connecting teachers and students nationwide" }
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
                About ExtraClasses Ghana
              </h1>
              <p className="text-xl text-white/90">
                Connecting students with exceptional teachers across Ghana. 
                Our mission is to make quality education accessible to everyone.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h2 className="text-3xl font-display font-bold text-foreground mb-6">
                  Our Mission
                </h2>
                <p className="text-muted-foreground mb-4">
                  ExtraClasses Ghana was founded with a simple yet powerful vision: to bridge the gap 
                  between students seeking quality education and teachers who are passionate about 
                  sharing their knowledge.
                </p>
                <p className="text-muted-foreground mb-4">
                  We believe that every student deserves access to excellent tutoring, regardless 
                  of their location or background. Our platform connects students with verified, 
                  qualified teachers who can provide personalized learning experiences.
                </p>
                <p className="text-muted-foreground">
                  Whether you're preparing for WASSCE, BECE, or seeking help in specific subjects, 
                  ExtraClasses Ghana is your partner in academic success.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-4"
              >
                <Card className="bg-primary/5 border-0">
                  <CardContent className="pt-6 text-center">
                    <Target className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">500+</h3>
                    <p className="text-sm text-muted-foreground">Verified Teachers</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/5 border-0">
                  <CardContent className="pt-6 text-center">
                    <Users className="w-10 h-10 text-secondary mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">10,000+</h3>
                    <p className="text-sm text-muted-foreground">Active Students</p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/10 border-0">
                  <CardContent className="pt-6 text-center">
                    <GraduationCap className="w-10 h-10 text-accent mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">50,000+</h3>
                    <p className="text-sm text-muted-foreground">Sessions Completed</p>
                  </CardContent>
                </Card>
                <Card className="bg-gold/10 border-0">
                  <CardContent className="pt-6 text-center">
                    <Lightbulb className="w-10 h-10 text-gold mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">16</h3>
                    <p className="text-sm text-muted-foreground">Regions Covered</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Our Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core values guide everything we do at ExtraClasses Ghana
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full text-center hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <img src={value.icon} alt={value.title} className="w-10 h-10 object-contain" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Get In Touch
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Have questions? We'd love to hear from you.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                {
                  icon: mapIcon,
                  title: "Address",
                  details: "Accra, Ghana",
                  color: "from-blue-500/20 to-blue-600/20"
                },
                {
                  icon: emailIcon,
                  title: "Email",
                  details: "extraclassesghana@gmail.com",
                  color: "from-green-500/20 to-green-600/20"
                },
                {
                  icon: phoneIcon,
                  title: "Phone",
                  details: "0596352632",
                  color: "from-purple-500/20 to-purple-600/20"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                >
                  <Card className="text-center h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <CardContent className="pt-6 relative z-10">
                      <motion.div
                        className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <img src={item.icon} alt={item.title} className="w-7 h-7 object-contain" />
                      </motion.div>
                      <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">{item.details}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
