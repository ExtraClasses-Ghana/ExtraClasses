import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/extraclasses-logo.webp";

// Only include pages that exist
const footerLinks = {
  platform: [
    { name: "Home", href: "/" },
    { name: "Find Teachers", href: "/teachers" },
    { name: "Subjects", href: "/subjects" },
    { name: "Course Materials", href: "/course-materials" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img 
                src={logo} 
                alt="ExtraClasses Ghana" 
                className="w-16 h-16 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-white leading-tight">
                  EXTRACLASSES
                </span>
                <span className="text-xs font-semibold text-secondary tracking-widest -mt-0.5">
                  GHANA
                </span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-sm mb-6 max-w-xs">
              Connecting Ghana's brightest students with qualified teachers for 
              personalized learning experiences, both online and in-person.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 text-secondary" />
                <span>Accra, Greater Accra Region, Ghana</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 text-secondary" />
                <span>0596352632</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 text-secondary" />
                <span>extraclassesghana@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} ExtraClasses Ghana. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors group"
                >
                  <social.icon className="w-4 h-4 text-primary-foreground/70 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
