import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedTeachers } from "@/components/home/FeaturedTeachers";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SubjectCategories } from "@/components/home/SubjectCategories";
import { Testimonials } from "@/components/home/Testimonials";
import { CTASection } from "@/components/home/CTASection";
import FloatingChat from "@/components/home/FloatingChat";
import { AdCarousel } from "@/components/home/AdCarousel";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <AdCarousel />
      <SubjectCategories />
      <FeaturedTeachers />
      <HowItWorks />
      <Testimonials />
      <CTASection />
      <Footer />
      <FloatingChat />
    </div>
  );
};

export default Index;
