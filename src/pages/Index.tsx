import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedTeachers } from "@/components/home/FeaturedTeachers";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SubjectCategories } from "@/components/home/SubjectCategories";
import { Testimonials } from "@/components/home/Testimonials";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <SubjectCategories />
      <FeaturedTeachers />
      <HowItWorks />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
