"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring, useInView, animate } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Shield,
  Bell,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Menu,
  Star,
  TrendingUp,
  Award,
  Heart,
  Rocket,
  DollarSign,
  BookMarked,
  Lightbulb,
  Target,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react";
import { getPublishedFormLink } from "@/lib/principal";

function StatCounter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, target, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (latest) => setCount(Math.floor(latest)),
      });
      return () => controls.stop();
    }
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Helper to render lucide icons dynamically based on name
const getIcon = (name: string, className?: string) => {
  switch (name) {
    case "GraduationCap": return <GraduationCap className={className} />;
    case "Users": return <Users className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "Calendar": return <Calendar className={className} />;
    case "Shield": return <Shield className={className} />;
    case "Bell": return <Bell className={className} />;
    case "CreditCard": return <CreditCard className={className} />;
    case "ArrowRight": return <ArrowRight className={className} />;
    case "CheckCircle2": return <CheckCircle2 className={className} />;
    case "ChevronDown": return <ChevronDown className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "Star": return <Star className={className} />;
    case "TrendingUp": return <TrendingUp className={className} />;
    case "Award": return <Award className={className} />;
    case "Heart": return <Heart className={className} />;
    case "Rocket": return <Rocket className={className} />;
    case "DollarSign": return <DollarSign className={className} />;
    case "BookMarked": return <BookMarked className={className} />;
    case "Lightbulb": return <Lightbulb className={className} />;
    case "Target": return <Target className={className} />;
    default: return <Sparkles className={className} />;
  }
};

export default function LandingPage() {
  const [formLink, setFormLink] = useState("");
  const [activeFeatureIdx, setActiveFeatureIdx] = useState<number | null>(null);
  const [expandedCardIdxs, setExpandedCardIdxs] = useState<number[]>([]);

  // States restored from Sudhir branch for Interactive Panels
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [activeChooseIdx, setActiveChooseIdx] = useState<number | null>(0);

  // Dynamic MongoDB Landing Page States
  const [heroBadge, setHeroBadge] = useState("★ Smart School ERP Platform");
  const [heroTitle, setHeroTitle] = useState("VidhyaSanchalan");
  const [heroSubtitle, setHeroSubtitle] = useState("Complete Smart School Management System");
  const [heroDescription, setHeroDescription] = useState("Manage the complete school journey — from student admission to leaving certificate — with powerful digital panels for Trustees, Principals, Clerks, Teachers, Students, and Guardians.");
  const [satisfactionRate, setSatisfactionRate] = useState(99.8);
  const [heroImage, setHeroImage] = useState("/sms hero.jpg");
  const [heroImages, setHeroImages] = useState<string[]>(["/sms hero.jpg"]);
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const [stats, setStats] = useState([
    { label: "Schools", target: 500, suffix: "+", iconName: "GraduationCap" },
    { label: "Students", target: 50, suffix: "K+", iconName: "Users" },
    { label: "Teachers", target: 5, suffix: "K+", iconName: "BookOpen" },
    { label: "Parents", target: 100, suffix: "K+", iconName: "Heart" },
  ]);
  const [whyChooseUs, setWhyChooseUs] = useState([
    {
      title: "Innovation at our core",
      description: "VidyaSanchalan stands as the vanguard of school-management solutions, consistently pioneering the integration of next-generation technologies that redefine educational administration worldwide.",
      iconName: "Lightbulb",
      color: "text-[#5D3FD3]"
    },
    {
      title: "Simplifying complexity",
      description: "Infographics & animations distill complex academic data into intuitive visuals—transforming every report and result into an easily grasped, optimized experience for students, parents, and educators.",
      iconName: "Target",
      color: "text-[#285E89]"
    },
    {
      title: "Empowering institutional growth",
      description: "Our platform equips schools with automated workflows, real-time communication, and scalable features designed for any school size to thrive in the modern age.",
      iconName: "TrendingUp",
      color: "text-[#FFA600]"
    }
  ]);

  const [whyBadge, setWhyBadge] = useState("Why Choose Us?");
  const [whyTitle, setWhyTitle] = useState("VidyaSanchalan is a revolution in education management");
  const [whyTitleHighlight, setWhyTitleHighlight] = useState("revolution");
  const [whyPills, setWhyPills] = useState<string[]>(["100% Free Forever", "Instant Insights", "Limitless Scale"]);

  const [whyImageMain, setWhyImageMain] = useState("/why chooseus.jpeg");
  const [whyImagesMain, setWhyImagesMain] = useState<string[]>(["/why chooseus.jpeg"]);
  const [currentWhyIdx, setCurrentWhyIdx] = useState(0);
  const [whyImageLeft, setWhyImageLeft] = useState("/why choose us.jpg");
  const [whyImageBottomLeft, setWhyImageBottomLeft] = useState("/progress report.jpeg");
  const [whyImageBottomRight, setWhyImageBottomRight] = useState("/admission (1).jpg");
  const [whyCollageCards, setWhyCollageCards] = useState<any[]>([
    { label: "Smart Campus", image: "/why choose us.jpg", position: "behind-left" },
    { label: "Analytics Panel", image: "/progress report.jpeg", position: "bottom-left" },
    { label: "Admission Desk", image: "/admission (1).jpg", position: "bottom-right" }
  ]);

  // About Section States
  const [aboutBadge, setAboutBadge] = useState("★ About VidhyaSanchalan");
  const [aboutTitle, setAboutTitle] = useState("One Platform for Complete School Management");
  const [aboutTitleHighlight, setAboutTitleHighlight] = useState("Complete School");
  const [aboutDescription, setAboutDescription] = useState("VidhyaSanchalan is an advanced school ERP and management system designed to simplify daily school operations. It helps schools manage admissions, fees, staff, attendance, examinations, homework, reports, announcements, and student progress through separate role-based panels.");
  const [aboutQuote, setAboutQuote] = useState("The system supports both online and offline processes and provides transparency between school staff, students, and parents.");
  const [aboutImage, setAboutImage] = useState("/about sms.jpg");
  const [aboutImages, setAboutImages] = useState<string[]>(["/about sms.jpg"]);
  const [currentAboutIdx, setCurrentAboutIdx] = useState(0);
  const [aboutHighlights, setAboutHighlights] = useState<any[]>([
    { title: "Transparency", desc: "For staff, students & parents" },
    { title: "Role-Based Access", desc: "Private secure panels" }
  ]);

  const [features, setFeatures] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [testimonialsList, setTestimonialsList] = useState<any[]>([]);

  // Set initial fallbacks on mount, then fetch live data from MongoDB
  useEffect(() => {
    setFeatures(fallbackFeatures);
    setModules(fallbackModules);
    setBadges(fallbackBadges);
    setTestimonialsList(fallbackTestimonials);

    // 1. Fetch Landing Settings
    fetch("/api/landing/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isSeeded && data.settings) {
          setHeroBadge(data.settings.heroBadge || "★ Smart School ERP Platform");
          setHeroTitle(data.settings.heroTitle || "VidhyaSanchalan");
          setHeroSubtitle(data.settings.heroSubtitle || "Complete Smart School Management System");
          setHeroDescription(data.settings.heroDescription || "");
          setSatisfactionRate(data.settings.satisfactionRate || 99.8);
          if (data.settings.heroImage) setHeroImage(data.settings.heroImage);
          if (data.settings.heroImages && data.settings.heroImages.length > 0) {
            setHeroImages(data.settings.heroImages);
          } else if (data.settings.heroImage) {
            setHeroImages([data.settings.heroImage]);
          }
          if (data.settings.stats && data.settings.stats.length > 0) {
            setStats(data.settings.stats);
          }
          if (data.settings.whyChooseUs && data.settings.whyChooseUs.length > 0) {
            setWhyChooseUs(data.settings.whyChooseUs);
          }
          if (data.settings.whyBadge) setWhyBadge(data.settings.whyBadge);
          if (data.settings.whyTitle) setWhyTitle(data.settings.whyTitle);
          if (data.settings.whyTitleHighlight) setWhyTitleHighlight(data.settings.whyTitleHighlight);
          if (data.settings.whyPills && data.settings.whyPills.length > 0) {
            setWhyPills(data.settings.whyPills);
          }
          if (data.settings.whyImageMain) setWhyImageMain(data.settings.whyImageMain);
          if (data.settings.whyImagesMain && data.settings.whyImagesMain.length > 0) {
            setWhyImagesMain(data.settings.whyImagesMain);
          } else if (data.settings.whyImageMain) {
            setWhyImagesMain([data.settings.whyImageMain]);
          }
          if (data.settings.whyImageLeft) setWhyImageLeft(data.settings.whyImageLeft);
          if (data.settings.whyImageBottomLeft) setWhyImageBottomLeft(data.settings.whyImageBottomLeft);
          if (data.settings.whyImageBottomRight) setWhyImageBottomRight(data.settings.whyImageBottomRight);
          if (data.settings.whyCollageCards && data.settings.whyCollageCards.length > 0) {
            setWhyCollageCards(data.settings.whyCollageCards);
          } else {
            setWhyCollageCards([
              { label: "Smart Campus", image: data.settings.whyImageLeft || "/why choose us.jpg", position: "behind-left" },
              { label: "Analytics Panel", image: data.settings.whyImageBottomLeft || "/progress report.jpeg", position: "bottom-left" },
              { label: "Admission Desk", image: data.settings.whyImageBottomRight || "/admission (1).jpg", position: "bottom-right" }
            ]);
          }
          if (data.settings.aboutBadge) setAboutBadge(data.settings.aboutBadge);
          if (data.settings.aboutTitle) setAboutTitle(data.settings.aboutTitle);
          if (data.settings.aboutTitleHighlight) setAboutTitleHighlight(data.settings.aboutTitleHighlight);
          if (data.settings.aboutDescription) setAboutDescription(data.settings.aboutDescription);
          if (data.settings.aboutQuote) setAboutQuote(data.settings.aboutQuote);
          if (data.settings.aboutImage) setAboutImage(data.settings.aboutImage);
          if (data.settings.aboutImages && data.settings.aboutImages.length > 0) {
            setAboutImages(data.settings.aboutImages);
          } else if (data.settings.aboutImage) {
            setAboutImages([data.settings.aboutImage]);
          }
          if (data.settings.aboutHighlights && data.settings.aboutHighlights.length > 0) {
            setAboutHighlights(data.settings.aboutHighlights);
          }
        }
      })
      .catch((err) => console.log("Failed to fetch settings from DB, using fallback", err));

    // 2. Fetch Features
    fetch("/api/landing/features")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.features && data.features.length > 0) {
          setFeatures(data.features);
        }
      })
      .catch((err) => console.log("Failed to fetch features from DB, using fallback", err));

    // 3. Fetch Slider Modules
    fetch("/api/landing/modules")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.modules && data.modules.length > 0) setModules(data.modules);
          if (data.badges && data.badges.length > 0) setBadges(data.badges);
        }
      })
      .catch((err) => console.log("Failed to fetch slider modules from DB, using fallback", err));

    // 4. Fetch Testimonials
    fetch("/api/landing/testimonials")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.testimonials && data.testimonials.length > 0) {
          setTestimonialsList(data.testimonials);
        }
      })
      .catch((err) => console.log("Failed to fetch testimonials from DB, using fallback", err));
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIdx((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroImages]);

  useEffect(() => {
    if (aboutImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAboutIdx((prev) => (prev + 1) % aboutImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [aboutImages]);

  useEffect(() => {
    if (whyImagesMain.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentWhyIdx((prev) => (prev + 1) % whyImagesMain.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [whyImagesMain]);

  const toggleCardPoints = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardIdxs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Testimonial slider states
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isTestimonialPaused, setIsTestimonialPaused] = useState(false);

  // Custom lagging cursor follower spring physics
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 30, stiffness: 220, mass: 0.6 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Detect touchscreen query
    const touchQuery = window.matchMedia("(pointer: coarse)");
    setIsTouchDevice(touchQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setIsTouchDevice(e.matches);
    };
    touchQuery.addEventListener("change", listener);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      touchQuery.removeEventListener("change", listener);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  const activeBgStyles = [
    { bg: "bg-[#1D496C] text-white border-[#1D496C] shadow-[#1D496C]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#429CE4] text-white border-[#429CE4] shadow-[#429CE4]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#6A7626] text-white border-[#6A7626] shadow-[#6A7626]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#E4FF4C] text-[#1D496C] border-[#E4FF4C] shadow-[#E4FF4C]/25", text: "text-[#1D496C]/85", check: "text-[#1D496C]" },
    { bg: "bg-[#FFA600] text-white border-[#FFA600] shadow-[#FFA600]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#ED6708] text-white border-[#ED6708] shadow-[#ED6708]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#285E89] text-white border-[#285E89] shadow-[#285E89]/25", text: "text-slate-100/90", check: "text-white" },
    { bg: "bg-[#FFA600] text-white border-[#FFA600] shadow-[#FFA600]/25", text: "text-slate-100/90", check: "text-white" }
  ];

  useEffect(() => {
    if (isTestimonialPaused || testimonialsList.length === 0) return;
    const timer = setInterval(() => {
      setSlideDirection(1);
      setCurrentTestimonial((prev) => (prev + 1) % testimonialsList.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isTestimonialPaused, testimonialsList]);

  useEffect(() => {
    getPublishedFormLink()
      .then((data: any) => setFormLink(data.form_link))
      .catch((err: any) => console.error("Failed to fetch link", err));
  }, []);

  const handleNextTestimonial = () => {
    if (testimonialsList.length === 0) return;
    setSlideDirection(1);
    setCurrentTestimonial((prev) => (prev + 1) % testimonialsList.length);
  };

  const handlePrevTestimonial = () => {
    if (testimonialsList.length === 0) return;
    setSlideDirection(-1);
    setCurrentTestimonial((prev) => (prev - 1 + testimonialsList.length) % testimonialsList.length);
  };

  const handleDotClick = (index: number) => {
    setSlideDirection(index > currentTestimonial ? 1 : -1);
    setCurrentTestimonial(index);
  };

  const gsapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);



      const ctx = gsap.context(() => {
        gsap.fromTo(".main-feature-card",
          { opacity: 0, y: 60, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gsapContainerRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
            }
          }
        );
      }, gsapContainerRef);

      return () => ctx.revert();
    }
  }, []);

  const handleGetStarted = () => {
    window.location.href = "/signup";
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#F8FAFC] via-white to-[#429CE4]/5">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gradient-to-r from-[#1D496C]/95 via-[#285E89]/95 to-[#1D496C]/95 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-gradient-to-r">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <div className="flex h-14 w-auto items-center justify-center rounded-xl bg-white p-1.5 shadow-md border border-white/10">
                  <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-10 w-auto max-w-[160px] object-contain" />
                </div>
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#FFA600] ring-2 ring-white"></div>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight"><span className="text-white">Vidya</span><span className="text-[#FFA600]">Sanchalan</span></span>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mt-0.5">School Management</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              {[
                { name: "Home", href: "/" },
                { name: "Features", href: "/features" },
                { name: "Modules", href: "/modules" },
                { name: "Contact Us", href: "/contact" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group relative text-sm font-medium text-white/90 transition-colors hover:text-[#FFA600]"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-[#FFA600] to-[#ED6708] transition-all group-hover:w-full"></span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-lg text-white/90 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-[#FFA600] text-white shadow-md hover:bg-[#ED6708] hover:scale-105 transition-all duration-300"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="md:hidden rounded-lg border-white/20 text-white hover:bg-white/10">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Admission Marquee */}
      {formLink && (
        <div className="sticky top-16 z-40 overflow-hidden bg-[#ED6708] py-2 border-b border-[#ED6708]/20 shadow-sm">
          <div className="flex whitespace-nowrap items-center gap-12 px-4 w-max animate-marquee-left-fast pause-on-hover">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-white/80" />
                <span>Admission forms are available! Follow the link to apply:</span>
                <a
                  href={formLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full border border-white/30 underline decoration-white/50 underline-offset-4 transition-all"
                >
                  {formLink}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        className="relative overflow-hidden pt-8 pb-8 lg:pt-8 lg:pb-12 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(255, 255, 255, 0.90), rgba(244, 249, 254, 0.85)), url('/bg-image.png')" }}
      >
        {/* Soft background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Automatic sliding blue gradient blobs */}
          <motion.div
            animate={{
              x: ["-20%", "120%", "-20%"],
              y: ["0%", "15%", "0%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#429CE4]/15 via-[#285E89]/15 to-[#1D496C]/10 blur-[90px]"
          />

          <motion.div
            animate={{
              x: ["120%", "-20%", "120%"],
              y: ["15%", "0%", "15%"],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#285E89]/10 via-[#429CE4]/15 to-[#FFA600]/10 blur-[90px]"
          />
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Side Content */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-8 text-left"
            >
              <div className="space-y-4">
                <Badge
                  variant="outline"
                  className="rounded-full px-4 py-1.5 border-[#6A7626]/30 bg-[#6A7626]/10 text-[#6A7626] shadow-sm font-bold tracking-wider uppercase text-xs"
                >
                  {heroBadge}
                </Badge>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
                  <span className="bg-gradient-to-r from-[#285E89] to-[#FFA600] bg-clip-text text-transparent block font-black mb-2 text-5xl sm:text-6xl lg:text-7.5xl tracking-tighter">
                    {heroTitle}
                  </span>
                  <span className="text-[#1D496C] text-2xl sm:text-3xl lg:text-4xl font-extrabold block">
                    {heroSubtitle}
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-lg text-[#475569] leading-relaxed font-medium">
                {heroDescription}
              </p>

              {/* Small Highlights Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  "Online & Offline Admission",
                  "Smart Fee Management",
                  "Attendance & Geo Tracking",
                  "Parent Progress Reports",
                  "Homework & Online Exams"
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
                    className="flex items-center gap-3 bg-[#1D496C]/5 hover:bg-[#1D496C]/10 border border-[#1D496C]/10 rounded-xl px-4 py-3 transition-colors shadow-sm"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6A7626]/20 text-[#6A7626]">
                      <CheckCircle2 className="h-4 w-4 stroke-[3]" />
                    </div>
                    <span className="text-sm font-semibold text-[#1D496C]">{item}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#429CE4] text-white shadow-xl shadow-[#429CE4]/20 hover:shadow-2xl hover:shadow-[#429CE4]/30 hover:bg-[#1D496C] px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                  onClick={handleGetStarted}
                >
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-2 border-[#6A7626] bg-white text-[#6A7626] hover:bg-[#6A7626]/5 px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                  asChild
                >
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </motion.div>

            {/* Right Side Image with translate curv & motion effect */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="lg:col-span-5 relative flex justify-center"
            >
              {/* Ambient glow under the image */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#429CE4]/30 to-[#6A7626]/20 rounded-[2.5rem] blur-2xl opacity-70 -z-10 animate-pulse"></div>

              {/* Floating 3D image frame */}
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 1.5, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative overflow-hidden rounded-[2.5rem] border-4 border-white bg-slate-100 shadow-2xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-shadow duration-500 max-w-[480px] w-full aspect-[4/3] flex items-center justify-center group"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentHeroIdx}
                    src={heroImages[currentHeroIdx] || "/sms hero.jpg"}
                    alt="VidhyaSanchalan Smart School Management"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 w-full h-full object-cover rounded-[2.2rem] group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </AnimatePresence>

                {/* Decorative glass overlay elements */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none"></div>

                {/* Dots indicator overlays inside the frame */}
                {heroImages.length > 1 && (
                  <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-slate-950/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                    {heroImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentHeroIdx(idx);
                        }}
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                          idx === currentHeroIdx 
                            ? "bg-[#FFA600] scale-125 w-3.5" 
                            : "bg-white/40 hover:bg-white"
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-6 left-6 right-6 backdrop-blur-md bg-white/80 border border-white/20 p-4 rounded-2xl shadow-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6A7626] font-bold">Admission Portal</p>
                    <p className="text-sm font-extrabold text-[#1D496C]">Active & Open for 2026</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                </motion.div>
              </motion.div>

              {/* Additional floating card to create a 3D overlay aesthetic */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-4 backdrop-blur-md bg-white/90 border border-slate-100 px-4 py-3 rounded-2xl shadow-lg hidden sm:flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-xl bg-[#6A7626]/10 flex items-center justify-center text-[#6A7626]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Parent Portal</p>
                  <p className="text-sm font-black text-[#1D496C]">Geo Tracking Enabled</p>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Infinite Horizontal Sliders Section */}
      <section className="py-6 bg-slate-50 overflow-hidden border-b border-[#1D496C]/10 relative z-10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="text-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D496C]/75">VidyaSanchalan Ecosystem Modules & Highlights</span>
            </div>

            {/* Slider 1: Modules (Right to Left) */}
            <div className="relative w-full overflow-hidden py-1.5" style={{ maskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)" }}>
              <div className="flex whitespace-nowrap gap-4 w-max animate-marquee-left pause-on-hover">
                {/* First set */}
                {modules.map((item, idx) => (
                  <div
                    key={`m1-${idx}`}
                    className="flex items-center gap-3 backdrop-blur-md bg-white/60 border border-slate-200/60 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md hover:border-[#429CE4]/40 transition-all cursor-pointer group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#429CE4]/10 text-[#429CE4] group-hover:scale-110 transition-transform">
                      {getIcon(item.iconName, "h-4 w-4")}
                    </div>
                    <span className="text-sm font-bold text-[#1D496C]">{item.label}</span>
                  </div>
                ))}
                {/* Duplicated set for infinite loop */}
                {modules.map((item, idx) => (
                  <div
                    key={`m1-dup-${idx}`}
                    className="flex items-center gap-3 backdrop-blur-md bg-white/60 border border-slate-200/60 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md hover:border-[#429CE4]/40 transition-all cursor-pointer group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#429CE4]/10 text-[#429CE4] group-hover:scale-110 transition-transform">
                      {getIcon(item.iconName, "h-4 w-4")}
                    </div>
                    <span className="text-sm font-bold text-[#1D496C]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider 2: Badges (Left to Right) */}
            <div className="relative w-full overflow-hidden py-1.5" style={{ maskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)" }}>
              <div className="flex whitespace-nowrap gap-4 w-max animate-marquee-right pause-on-hover">
                {/* First set */}
                {badges.map((item, idx) => (
                  <div
                    key={`b1-${idx}`}
                    className="flex items-center gap-3 backdrop-blur-md bg-white/60 border border-slate-200/60 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md hover:border-[#6A7626]/40 transition-all cursor-pointer group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6A7626]/10 text-[#6A7626] group-hover:scale-110 transition-transform">
                      {getIcon(item.iconName, item.iconName === "Star" ? "h-4 w-4 text-amber-500 fill-amber-500" : "h-4 w-4")}
                    </div>
                    <span className="text-sm font-bold text-[#475569]">{item.label}</span>
                  </div>
                ))}
                {/* Duplicated set for infinite loop */}
                {badges.map((item, idx) => (
                  <div
                    key={`b1-dup-${idx}`}
                    className="flex items-center gap-3 backdrop-blur-md bg-white/60 border border-slate-200/60 rounded-full px-5 py-2.5 shadow-sm hover:shadow-md hover:border-[#6A7626]/40 transition-all cursor-pointer group"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6A7626]/10 text-[#6A7626] group-hover:scale-110 transition-transform">
                      {getIcon(item.iconName, item.iconName === "Star" ? "h-4 w-4 text-amber-500 fill-amber-500" : "h-4 w-4")}
                    </div>
                    <span className="text-sm font-bold text-[#475569]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 overflow-hidden bg-gradient-to-br from-[#1D496C]/5 via-white to-white border-y border-[#1D496C]/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative flex justify-center"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#6A7626]/20 to-[#429CE4]/20 rounded-[2.5rem] blur-2xl opacity-75 -z-10 animate-pulse"></div>
              
              <motion.div
                animate={{
                  y: [0, 10, 0],
                  rotate: [0, -1, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative overflow-hidden rounded-[2.5rem] border-4 border-white bg-slate-100 shadow-2xl shadow-slate-900/10 max-w-[480px] w-full aspect-[4/3] flex items-center justify-center group"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentAboutIdx}
                    src={aboutImages[currentAboutIdx] || "/about sms.jpg"}
                    alt={aboutTitle}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 w-full h-full object-cover rounded-[2.2rem] group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </AnimatePresence>

                {/* Dots indicator overlays inside the frame */}
                {aboutImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-slate-950/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                    {aboutImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentAboutIdx(idx);
                        }}
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                          idx === currentAboutIdx 
                            ? "bg-[#FFA600] scale-125 w-3.5" 
                            : "bg-white/40 hover:bg-white"
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
                
                <div className="absolute top-4 left-4 backdrop-blur-md bg-white/80 border border-white/20 px-3 py-1.5 rounded-full shadow-sm z-20">
                  <span className="text-xs font-bold text-[#1D496C] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#FFA600]"></span>
                    ERP System
                  </span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-6 text-left"
            >
              <div className="space-y-3">
                <Badge 
                  variant="outline" 
                  className="rounded-full px-4 py-1.5 border-[#6A7626]/30 bg-[#6A7626]/10 text-[#6A7626] shadow-sm font-bold tracking-wider uppercase text-xs"
                >
                  {aboutBadge}
                </Badge>
                
                <h2 className="text-3.5xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1D496C] leading-tight">
                  {aboutTitle.includes(aboutTitleHighlight) ? (
                    <>
                      {aboutTitle.split(aboutTitleHighlight)[0]}
                      <span className="bg-gradient-to-r from-[#285E89] to-[#FFA600] bg-clip-text text-transparent">
                        {aboutTitleHighlight}
                      </span>
                      {aboutTitle.split(aboutTitleHighlight)[1]}
                    </>
                  ) : (
                    aboutTitle
                  )}
                </h2>
              </div>
              
              <div className="space-y-4 text-slate-600 font-medium leading-relaxed text-base sm:text-lg">
                <p>
                  {aboutDescription}
                </p>
                <p className="border-l-4 border-[#FFA600] pl-4 italic text-[#1D496C]/90 bg-[#FFA600]/5 py-2.5 rounded-r-xl">
                  {aboutQuote}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {aboutHighlights.map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#429CE4]/10 flex items-center justify-center text-[#429CE4] shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-[#1D496C] text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="pt-10 pb-4 bg-white overflow-hidden border-b border-[#1D496C]/10" ref={gsapContainerRef}>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-4">
            <Badge
              variant="outline"
              className="rounded-full px-4 py-1.5 border-[#6A7626]/30 bg-[#6A7626]/10 text-[#6A7626] shadow-sm font-bold tracking-wider uppercase text-xs"
            >
              ★ Full Capabilities
            </Badge>
            <h2 className="text-3.5xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1D496C] leading-tight">
              Powerful Features of <span className="bg-gradient-to-r from-[#285E89] to-[#FFA600] bg-clip-text text-transparent">VidhyaSanchalan</span>
            </h2>
            <p className="text-slate-500 font-medium text-base sm:text-lg">
              Empower your school with 8 advanced modules custom-built to maximize academic transparency and administrative efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 pt-4">
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={() => setActiveFeatureIdx(activeFeatureIdx === index ? null : index)}
                className={`main-feature-card relative rounded-[24px] border shadow-lg hover:shadow-2xl flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 overflow-hidden cursor-pointer w-full p-6 transition-colors duration-300 ${activeFeatureIdx === index
                  ? activeBgStyles[index].bg
                  : "group bg-white text-slate-800 border-slate-100 shadow-slate-200/50 hover:bg-[#1D496C] hover:text-white hover:border-[#1D496C] hover:shadow-[#1D496C]/25"
                  }`}
              >
                <div>
                  {/* Accent color bar */}
                  <div className={`w-12 h-1 bg-gradient-to-r ${feature.color} rounded-full mb-4 group-hover:w-20 transition-all duration-300 ${activeFeatureIdx === index ? "opacity-0" : "group-hover:opacity-0"}`}></div>

                  <h3 className={`font-extrabold text-xl leading-snug mb-4 transition-colors duration-300 ${activeFeatureIdx === index
                    ? (index === 3 ? "text-[#1D496C]" : "text-white")
                    : "text-[#1D496C] group-hover:text-white"
                    }`}>
                    {feature.title}
                  </h3>

                  <ul className="space-y-3.5 pl-0.5">
                    {((expandedCardIdxs.includes(index) || feature.points.length <= 4)
                      ? feature.points
                      : feature.points.slice(0, 4)
                    ).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className={`mt-0.5 h-4.5 w-4.5 stroke-[2.5] shrink-0 transition-colors ${activeFeatureIdx === index
                          ? (activeBgStyles[index].check === "text-white"
                            ? "text-white"
                            : "text-[#1D496C]")
                          : "text-[#6A7626] group-hover:text-white"
                          }`} />
                        <span className={`font-semibold leading-relaxed transition-colors ${activeFeatureIdx === index
                          ? activeBgStyles[index].text
                          : "text-slate-600 group-hover:text-slate-200"
                          }`}>
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {feature.points.length > 4 && (
                    <button
                      onClick={(e) => toggleCardPoints(index, e)}
                      className={`mt-4 text-xs font-black transition-colors inline-flex items-center gap-1.5 hover:underline ${
                        activeFeatureIdx === index
                          ? (index === 3 ? "text-[#1D496C]/90 hover:text-[#1D496C]" : "text-white/90 hover:text-white")
                          : "text-[#1D496C] hover:text-[#285E89] group-hover:text-white/90"
                      }`}
                    >
                      {expandedCardIdxs.includes(index) ? (
                        <>
                          Read Less
                          <ChevronDown className="h-3 w-3 rotate-180 transition-transform duration-300" />
                        </>
                      ) : (
                        <>
                          Read More
                          <ChevronDown className="h-3 w-3 transition-transform duration-300" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section
        id="why-choose-us"
        className="pt-12 pb-16 bg-[#F8FAFC] relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(248, 250, 252, 0.96), rgba(248, 250, 252, 0.92)), url('/bg-image.png')" }}
      >
        {/* Soft background decor blobs */}
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#5D3FD3]/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#429CE4]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
            {/* Left Column - Graphic Column */}
            <div className="lg:col-span-5 relative flex items-center justify-center min-h-[500px] sm:min-h-[580px] py-10">
              <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-square flex items-center justify-center group">
                
                {/* Behind-Left Image Card */}
                {(() => {
                  const card = whyCollageCards.find(c => c.position === "behind-left");
                  if (!card) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -30, y: -20, rotate: -6 }}
                      whileInView={{ opacity: 1, x: 0, y: 0, rotate: -4 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute left-[-1.5rem] md:left-[-3rem] top-[1.5rem] w-[180px] sm:w-[220px] bg-white border border-slate-100 shadow-2xl rounded-3xl p-1.5 sm:p-2 z-10 hidden xs:block transition-all duration-300 hover:rotate-[-2deg] hover:scale-105"
                    >
                      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-slate-100">
                        <img 
                          src={card.image} 
                          alt={card.label} 
                          className="w-full h-full object-cover rounded-2xl" 
                        />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-[#5D3FD3]">
                          {card.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Main Card (Slideshow and Dot indicators with scale fix) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative w-[280px] sm:w-[320px] aspect-square rounded-[2rem] shadow-2xl border border-slate-100 bg-white flex items-center justify-center overflow-visible z-20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentWhyIdx}
                        src={whyImagesMain[currentWhyIdx] || "/why chooseus.jpeg"}
                        alt="Laptop and Mobile Dashboard Mockup"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 w-full h-full object-cover rounded-[2rem] group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </AnimatePresence>
                  </div>

                  {/* Dots indicator overlays inside the frame */}
                  {whyImagesMain.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 bg-slate-950/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                      {whyImagesMain.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentWhyIdx(idx);
                          }}
                          className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                            idx === currentWhyIdx
                              ? "bg-[#FFA600] scale-125 w-3.5"
                              : "bg-white/40 hover:bg-white"
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Floating User Satisfaction Badge */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[2rem] right-[-1.5rem] sm:right-[-3rem] bg-white border border-slate-100 shadow-2xl rounded-2xl p-3 sm:p-4 flex items-center gap-3 z-35 transition-transform duration-500 hover:translate-x-2"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-slate-950/20">
                      😊
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-950 leading-none mb-0.5">{satisfactionRate}%</div>
                      <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">User Satisfaction</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Bottom-Left Image Card */}
                {(() => {
                  const card = whyCollageCards.find(c => c.position === "bottom-left");
                  if (!card) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -20, y: 30, rotate: 2 }}
                      whileInView={{ opacity: 1, x: 0, y: 0, rotate: 2 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="absolute left-[-2rem] md:left-[-3.5rem] bottom-[-1.5rem] w-[170px] sm:w-[200px] bg-white border border-slate-100 shadow-2xl rounded-3xl p-1.5 sm:p-2 z-30 hidden xs:block transition-all duration-300 hover:rotate-[0deg] hover:scale-105"
                    >
                      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-slate-100">
                        <img 
                          src={card.image} 
                          alt={card.label} 
                          className="w-full h-full object-cover rounded-2xl" 
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-white">
                          {card.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Bottom-Right Image Card */}
                {(() => {
                  const card = whyCollageCards.find(c => c.position === "bottom-right");
                  if (!card) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 20, y: 20, rotate: -2 }}
                      whileInView={{ opacity: 1, x: 0, y: 0, rotate: -2 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="absolute right-[-2.5rem] bottom-[-2.5rem] w-[150px] sm:w-[180px] bg-white border border-slate-100 shadow-2xl rounded-3xl p-1.5 sm:p-2 z-30 hidden xs:block transition-all duration-300 hover:rotate-[0deg] hover:scale-105"
                    >
                      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-slate-100">
                        <img 
                          src={card.image} 
                          alt={card.label} 
                          className="w-full h-full object-cover rounded-2xl" 
                        />
                        <div className="absolute bottom-2 left-2 bg-[#5D3FD3]/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-white">
                          {card.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Floating Capsule Pills underneath */}
                <div className="absolute bottom-[-4.5rem] left-[1rem] sm:left-[3rem] md:left-0 flex flex-wrap gap-2 z-40 max-w-[340px]">
                  {whyPills.map((pill, idx) => {
                    const pillBgClasses = ["bg-[#5D3FD3] shadow-[#5D3FD3]/20", "bg-[#1C1C1E] border border-white/10", "bg-[#285E89] shadow-[#285E89]/20"];
                    const activeBg = pillBgClasses[idx % pillBgClasses.length];
                    return (
                      <span key={idx} className={`inline-flex items-center px-4 py-2 rounded-full text-white text-[10px] font-black tracking-wide shadow-lg hover:scale-105 transition-transform cursor-pointer border-0 ${activeBg}`}>
                        {pill}
                      </span>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Right Column - White Content Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 relative bg-white border border-slate-100 shadow-xl rounded-[2.5rem] p-6 sm:p-8 lg:p-10"
            >
              {/* Soft visual background glow */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#5D3FD3]/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-6">
                {/* Purple pill badge */}
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#5D3FD3]/10 text-[#5D3FD3] text-[11px] font-black tracking-wide uppercase">
                    {whyBadge}
                  </span>
                </div>

                {/* Main Styled Heading */}
                <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-slate-900 leading-[1.2]">
                  {whyTitle.includes(whyTitleHighlight) ? (
                    <>
                      {whyTitle.split(whyTitleHighlight)[0]}
                      <span className="font-black text-[#5D3FD3] relative inline-block">
                        {whyTitleHighlight}
                        <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#5D3FD3]/20 rounded-full"></span>
                      </span>
                      {whyTitle.split(whyTitleHighlight)[1]}
                    </>
                  ) : (
                    whyTitle
                  )}
                </h2>

                {/* Structured Points list */}
                <div className="space-y-6 pt-2">
                  {whyChooseUs.map((point, index) => {
                    const colorMap: any = {
                      "text-[#5D3FD3]": { border: "border-[#5D3FD3]/20", bg: "group-hover:bg-[#5D3FD3]", text: "text-[#5D3FD3]", hoverText: "group-hover:text-[#5D3FD3]", hoverBorder: "group-hover:border-[#5D3FD3]" },
                      "text-[#285E89]": { border: "border-[#285E89]/20", bg: "group-hover:bg-[#285E89]", text: "text-[#285E89]", hoverText: "group-hover:text-[#285E89]", hoverBorder: "group-hover:border-[#285E89]" },
                      "text-[#FFA600]": { border: "border-[#FFA600]/20", bg: "group-hover:bg-[#FFA600]", text: "text-[#FFA600]", hoverText: "group-hover:text-[#FFA600]", hoverBorder: "group-hover:border-[#FFA600]" },
                    };
                    const colors = colorMap[point.color] || colorMap["text-[#5D3FD3]"];
                    return (
                      <div key={index} className="flex gap-4 group">
                        <div className={`w-11 h-11 rounded-full border-[2px] ${colors.border} bg-white flex items-center justify-center ${colors.text} shadow-sm shrink-0 group-hover:scale-110 ${colors.hoverBorder} ${colors.bg} group-hover:text-white transition-all duration-300`}>
                          {getIcon(point.iconName, "h-5.5 w-5.5 stroke-[2.2]")}
                        </div>
                        <div className="space-y-1">
                          <h3 className={`text-base sm:text-lg font-extrabold text-slate-900 ${colors.hoverText} transition-colors duration-300`}>{point.title}</h3>
                          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed max-w-xl">
                            {point.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-6">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-0 bg-gradient-to-r from-[#1D496C] to-[#15354F] text-white shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.08] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
            <CardContent className="py-6 px-8 md:px-12 relative">
              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {stats.map((stat, i) => (
                  <motion.div 
                    key={i} 
                    className="group hover:scale-110 transition-transform duration-300 cursor-pointer"
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  >
                    <div className="group-hover:scale-110 group-hover:text-[#FFA600] transition-all duration-300">
                      {getIcon(stat.iconName, "h-6 w-6 mx-auto mb-2 opacity-80")}
                    </div>
                    <div className="text-3xl font-extrabold mb-2 tracking-tight group-hover:text-[#FFA600] transition-colors duration-300">
                      <StatCounter target={stat.target} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors duration-300">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="pt-10 pb-6 bg-[#F8FAFC]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge className="rounded-lg px-4 py-2 bg-white text-[#1D496C] border-0 mb-4">
              <Star className="mr-2 h-3 w-3 fill-[#FFA600] text-[#FFA600]" />
              Testimonials
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-[#0F172A]">
              Trusted by Schools & Educators
            </h2>
            <p className="text-[#475569]">
              See what schools are saying about VidyaSanchalan
            </p>
          </div>

          {testimonialsList.length > 0 && (
            <div 
              className="relative max-w-4xl mx-auto px-4 py-4"
              onMouseEnter={() => setIsTestimonialPaused(true)}
              onMouseLeave={() => setIsTestimonialPaused(false)}
            >
              {/* Testimonial slider viewport */}
              <div className="relative w-full overflow-hidden min-h-[360px] sm:min-h-[280px] flex items-center justify-center">
                <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 350, damping: 35 },
                      opacity: { duration: 0.25 }
                    }}
                    className="w-full"
                  >
                    <Card className="border border-slate-100 bg-white shadow-xl rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
                      {/* Subtle quote icon background */}
                      <div className="absolute top-6 right-8 text-slate-100 pointer-events-none">
                        <Quote className="h-24 w-24 stroke-[1.5] opacity-20" />
                      </div>

                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        {/* Left side: Avatar */}
                        <div className="relative shrink-0">
                          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#1D496C] to-[#6A7626] opacity-35 blur-[3px]"></div>
                          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white relative shadow-xl">
                            <AvatarImage 
                              src={testimonialsList[currentTestimonial].image} 
                              alt={testimonialsList[currentTestimonial].name}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-[#1D496C] to-[#6A7626] text-white text-2xl font-black">
                              {testimonialsList[currentTestimonial].name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Right side: Review */}
                        <div className="flex-1 space-y-4 text-center md:text-left">
                          {/* Rating */}
                          <div className="flex gap-1 justify-center md:justify-start">
                            {[...Array(testimonialsList[currentTestimonial].rating)].map((_, idx) => (
                              <Star key={idx} className="h-5 w-5 fill-[#FFA600] text-[#FFA600]" />
                            ))}
                          </div>

                          {/* Content */}
                          <blockquote className="text-lg sm:text-xl font-extrabold text-slate-800 leading-relaxed italic">
                            &ldquo;{testimonialsList[currentTestimonial].content}&rdquo;
                          </blockquote>

                          {/* Author info */}
                          <div>
                            <cite className="not-italic font-black text-[#0F172A] text-lg block">
                              {testimonialsList[currentTestimonial].name}
                            </cite>
                            <span className="text-sm font-semibold text-slate-500 block mt-0.5">
                              {testimonialsList[currentTestimonial].role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={handlePrevTestimonial}
                className="absolute left-[-1.5rem] sm:left-[-3rem] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-slate-100 shadow-lg flex items-center justify-center text-slate-600 hover:text-[#1D496C] hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all duration-300 z-20"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
              </button>
              <button
                onClick={handleNextTestimonial}
                className="absolute right-[-1.5rem] sm:right-[-3rem] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-slate-100 shadow-lg flex items-center justify-center text-slate-600 hover:text-[#1D496C] hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all duration-300 z-20"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-6 w-6 stroke-[2.5]" />
              </button>

              {/* Navigation Dots */}
              <div className="flex justify-center gap-2.5 mt-8 relative z-20">
                {testimonialsList.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      index === currentTestimonial 
                        ? "w-8 bg-[#1D496C]" 
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-6 pb-10 bg-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-0 bg-gradient-to-br from-[#1D496C] to-[#15354F] text-white shadow-2xl overflow-hidden rounded-[2.5rem] cursor-pointer">
            <div className="absolute inset-0 bg-grid-white/[0.08] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
            <CardContent className="p-16 text-center relative">
              <div className="max-w-2xl mx-auto space-y-6">
                <Badge variant="outline" className="rounded-lg px-4 py-2 border-white/20 bg-white/10 text-white shadow-sm font-semibold">
                  <Rocket className="mr-2 h-3.5 w-3.5 text-[#FFA600]" />
                  Get Started Today
                </Badge>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-white">
                  Ready to Transform Your School Management?
                </h2>
                <p className="text-slate-200/90 text-base sm:text-lg font-medium">
                  Join thousands of schools already using VidyaSanchalan to streamline their operations
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <Button
                    size="lg"
                    className="rounded-xl bg-[#FFA600] text-white shadow-xl shadow-[#FFA600]/10 hover:shadow-2xl hover:shadow-[#FFA600]/20 hover:bg-[#ED6708] px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                    onClick={handleGetStarted}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white/50 px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                    asChild
                  >
                    <Link href="/login">Contact Sales</Link>
                  </Button>
                </div>
                <p className="text-sm text-slate-300/80">
                  No credit card required • Free 14-day trial • 24/7 support
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-[#6A7626]/20 bg-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-20 w-auto flex items-center justify-center rounded-xl bg-white p-2 shadow-md border border-[#1D496C]/10">
                  <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-16 w-auto max-w-[180px] object-contain" />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight"><span className="text-[#285E89]">Vidya</span><span className="text-[#FFA600]">Sanchalan</span></span>
                  <p className="text-[10px] text-[#475569]/80 font-bold uppercase tracking-wider mt-0.5">School Management</p>
                </div>
              </div>
              <p className="text-sm text-[#475569] max-w-md leading-relaxed">
                Complete school management solution based on comprehensive SRS documentation.
                Automating administrative, academic, and operational tasks.
              </p>
              <div className="flex gap-3 mt-6">
                {[
                  { icon: <Twitter />, color: "from-[#1D496C] to-[#15354F]" },
                  { icon: <Github />, color: "from-[#6A7626] to-[#4F581D]" },
                  { icon: <Linkedin />, color: "from-[#429CE4] to-[#1D496C]" },
                ].map((social, i) => (
                  <Button
                    key={i}
                    size="icon"
                    className={`rounded-lg bg-gradient-to-br ${social.color} text-white hover:shadow-md transition-all duration-300 hover:scale-110`}
                  >
                    {social.icon}
                  </Button>
                ))}
              </div>
            </div>

            {footerLinks.map((section, i) => (
              <div key={i}>
                <h3 className="font-semibold text-[#0F172A] mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <Link href={getLinkHref(link)} className="text-sm text-[#475569] hover:text-[#285E89] transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="my-8 bg-[#6A7626]/20" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-[#475569]">© 2026 VidyaSanchalan. All rights reserved. Based on School Management SRS v1.0</p>
            <div className="flex gap-6">
              <Link href="#" className="text-[#475569] hover:text-[#285E89] transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-[#475569] hover:text-[#285E89] transition-colors">Terms of Service</Link>
              <Link href="#" className="text-[#475569] hover:text-[#285E89] transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Lagging Custom Cursor Follower Ring */}
      {!isTouchDevice && (
        <motion.div
          className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-[#429CE4] bg-[#429CE4]/10 pointer-events-none z-[9999] shadow-[0_0_12px_rgba(66,156,228,0.4)]"
          style={{
            x: cursorX,
            y: cursorY,
          }}
        />
      )}

    </div>
  );
}


// Social icons
function Twitter() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  );
}

function Github() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function Linkedin() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}



const fallbackFeatures = [
  {
    title: "Admission Management",
    image: "/admission (1).jpg",
    iconName: "GraduationCap",
    color: "from-[#1D496C] to-[#1A3F5C]",
    points: [
      "Online admission forms",
      "Offline admission entries",
      "Public admission form sharing",
      "Student document management",
      "Admission approval system"
    ]
  },
  {
    title: "Fee Management",
    image: "/fees (1).jpg",
    iconName: "CreditCard",
    color: "from-[#6A7626] to-[#596420]",
    points: [
      "Online & offline fee collection",
      "Dynamic fee structure creation",
      "Monthly / Quarterly / Custom fee setup",
      "Tuition fee, library fee, transport fee, etc.",
      "Fee verification by clerk and principal",
      "Fee receipt generation"
    ]
  },
  {
    title: "Timetable Management",
    image: "/timetable (1).jpg",
    iconName: "Calendar",
    color: "from-[#429CE4] to-[#2E85CC]",
    points: [
      "Class-wise timetable creation",
      "Subject assignment",
      "Teacher allocation",
      "Editable schedules for teachers and students"
    ]
  },
  {
    title: "Homework & Assignment",
    image: "/homework (1).jpg",
    iconName: "BookOpen",
    color: "from-[#ED6708] to-[#CD5804]",
    points: [
      "Online and offline homework",
      "Assignment uploads",
      "Subject-wise homework tracking",
      "Teacher to student communication"
    ]
  },
  {
    title: "Progress Reports",
    image: "/progress report.jpeg",
    iconName: "TrendingUp",
    color: "from-[#FFA600] to-[#E09200]",
    points: [
      "Report cards",
      "Marksheets",
      "Attendance tracking",
      "Student performance analytics",
      "Guardian visibility panel"
    ]
  },
  {
    title: "Announcement System",
    image: "/announcement.jpeg",
    iconName: "Bell",
    color: "from-[#1D496C] to-[#6A7626]",
    points: [
      "School announcements",
      "Holiday notices",
      "Emergency alerts",
      "Event updates for students and parents"
    ]
  },
  {
    title: "Geo Attendance Feature",
    image: "/geo mapping.jpeg",
    iconName: "Shield",
    color: "from-[#6A7626] to-[#1D496C]",
    points: [
      "Staff attendance with geo-location tracking",
      "Secure attendance monitoring",
      "Real-time attendance records"
    ]
  },
  {
    title: "Online Examination",
    image: "/examination.jpeg",
    iconName: "Award",
    color: "from-[#429CE4] to-[#ED6708]",
    points: [
      "Conduct online exams",
      "MCQ and written tests",
      "Result generation",
      "Student performance reports"
    ]
  }
];

// Panels data removed to keep workspace clean

const whyChooseUsData = [
  "Easy to use interface",
  "Complete school automation",
  "Separate role-based panels",
  "Secure data management",
  "Online & offline support",
  "Real-time communication",
  "Smart attendance tracking",
  "Scalable for any school size"
];

const getLinkHref = (link: string) => {
  switch (link) {
    case "Modules": return "/modules";
    case "Contact": return "/contact";
    case "About Us": return "https://h-techsolutions.in/aboutus";
    case "Service": return "https://h-techsolutions.in/service";
    case "Gallery": return "https://h-techsolutions.in/gallery";
    default: return "#";
  }
};

const footerLinks = [
  {
    title: "Product",
    links: ["Modules", "Pricing", "Integrations", "Changelog"]
  },
  {
    title: "Company",
    links: ["About Us", "Service", "Gallery", "Blog", "Contact"]
  }
];

const fallbackModules = [
  { label: "Online & Offline Admissions", iconName: "GraduationCap" },
  { label: "Smart Fee Collection", iconName: "DollarSign" },
  { label: "Dynamic Timetable Planner", iconName: "Calendar" },
  { label: "Classroom Homework", iconName: "BookOpen" },
  { label: "Online Examination Desk", iconName: "Award" },
  { label: "Real-time Progress Reports", iconName: "TrendingUp" },
  { label: "GPS Attendance Tracking", iconName: "Shield" },
  { label: "Instant Announcement System", iconName: "Bell" }
];

const fallbackBadges = [
  { label: "Trusted by 500+ Schools", iconName: "Star" },
  { label: "ISO 27001 Secure Data", iconName: "CheckCircle2" },
  { label: "99.9% Cloud Uptime", iconName: "Rocket" },
  { label: "Dedicated Guardian App", iconName: "Users" },
  { label: "Encrypted Database Logs", iconName: "Shield" },
  { label: "24/7 Priority Support Desk", iconName: "Heart" },
  { label: "AI Powered Report Cards", iconName: "Sparkles" },
  { label: "SRS Compliance Approved", iconName: "BookMarked" }
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 150 : -150,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 150 : -150,
    opacity: 0
  })
};

const fallbackTestimonials = [
  {
    name: "Rajesh Sharma",
    role: "Principal, Apex International School",
    content: "VidyaSanchalan simplified our complete admission and fee management process, saving our staff hundreds of hours.",
    rating: 5,
    image: "/testimonial-1.jpg"
  },
  {
    name: "Sunita Deshmukh",
    role: "Parent of Class IX Student",
    content: "Parents can now easily track student performance and attendance. The mobile app experience is absolutely seamless.",
    rating: 5,
    image: "/testimonial-2.jpg"
  },
  {
    name: "Devendra Patel",
    role: "Administration Trustee",
    content: "The geo-attendance feature made staff management much easier, and the financial audit logs are completely transparent.",
    rating: 5,
    image: "/testimonial-3.svg"
  }
];

const panelsData = [
  {
    id: "trustee",
    name: "Trustee Panel",
    icon: Shield,
    color: "from-[#1D496C] to-[#15354F]",
    bgColor: "bg-[#1D496C]/5",
    accentColor: "#1D496C",
    glowColor: "shadow-[#1D496C]/20",
    description: "Manage overall school operations, monitor administration, and analyze school performance with high-level summaries.",
    features: [
      "Create and manage staff",
      "Add teachers, principals, peons, and office staff",
      "Monitor school activities",
      "Access reports and analytics",
      "Control overall management"
    ],
    mockup: {
      title: "Trustee Analytics Dashboard",
      metrics: [
        { label: "Total Schools", value: "1", change: "Active" },
        { label: "Total Staff Created", value: "48", change: "+4 this month" },
        { label: "Overall Revenue Analytics", value: "₹24.8 Lakhs", change: "92% collected" },
        { label: "System Health & Audits", value: "Optimal", change: "No alerts" }
      ],
      previewText: "Staff control, active school logs, fee collections graphs, and branch management dashboard."
    }
  },
  {
    id: "principal",
    name: "Principal Panel",
    icon: GraduationCap,
    color: "from-[#6A7626] to-[#4F581D]",
    bgColor: "bg-[#6A7626]/5",
    accentColor: "#6A7626",
    glowColor: "shadow-[#6A7626]/20",
    description: "Maintain academic quality, oversee admissions, verify student fee structures, and streamline staff requests.",
    features: [
      "Create and publish admission forms",
      "Verify fees",
      "Approve or reject staff leave requests",
      "Manage academic activities",
      "View school reports"
    ],
    mockup: {
      title: "Principal Portal",
      metrics: [
        { label: "Admissions Pending", value: "14", change: "Review required" },
        { label: "Staff Leave Requests", value: "3", change: "2 pending approval" },
        { label: "Active Classes", value: "18", change: "All teachers assigned" },
        { label: "Today's Attendance", value: "96.4%", change: "High attendance" }
      ],
      previewText: "Admission portal pipelines, leave approval tables, time-table review grid, and class monitoring widget."
    }
  },
  {
    id: "clerk",
    name: "Clerk Panel",
    icon: BookMarked,
    color: "from-[#429CE4] to-[#2E85CC]",
    bgColor: "bg-[#429CE4]/5",
    accentColor: "#429CE4",
    glowColor: "shadow-[#429CE4]/20",
    description: "Handle core student records, assign academic schedules, generate unique GR numbers, and manage location settings.",
    features: [
      "Assign class divisions",
      "Allocate class teachers and subjects",
      "Generate student GR numbers",
      "Verify student fees",
      "Manage records and documents",
      "Geo attendance management"
    ],
    mockup: {
      title: "Clerk Records Portal",
      metrics: [
        { label: "GR Numbers Issued", value: "1,248", change: "+12 today" },
        { label: "Fee Records Staged", value: "85", change: "Pending verification" },
        { label: "Geo Attendance Status", value: "Active", change: "9 locations synced" },
        { label: "Class Assignments", value: "100%", change: "Completed" }
      ],
      previewText: "GR register generation tool, document uploader workspace, division allocator, and geo-tracking logs."
    }
  },
  {
    id: "fee-management",
    name: "Fee Management Panel",
    icon: DollarSign,
    color: "from-[#FFA600] to-[#E09200]",
    bgColor: "bg-[#FFA600]/5",
    accentColor: "#FFA600",
    glowColor: "shadow-[#FFA600]/20",
    description: "Define custom, highly flexible fee categories, manage automated billing cycles, and track collection modes.",
    features: [
      "Create dynamic fee structures",
      "Manage tuition, library, transport, and activity fees",
      "Monthly, quarterly, yearly fee setup",
      "Online and offline payment options",
      "Track pending fees and receipts"
    ],
    mockup: {
      title: "Fee Collections Desk",
      metrics: [
        { label: "Pending Fees", value: "₹4.2 Lakhs", change: "28 accounts overdue" },
        { label: "Today's Receipts", value: "₹84,000", change: "15 receipts printed" },
        { label: "Online Payments", value: "65%", change: "Via gateway" },
        { label: "Offline Collections", value: "35%", change: "Cash/cheque synced" }
      ],
      previewText: "Dynamic fee structure creator, automatic reminders control panel, transaction registers, and outstanding fees summary."
    }
  },
  {
    id: "teacher",
    name: "Teacher Panel",
    icon: BookOpen,
    color: "from-[#ED6708] to-[#CD5804]",
    bgColor: "bg-[#ED6708]/5",
    accentColor: "#ED6708",
    glowColor: "shadow-[#ED6708]/20",
    description: "Simplify classroom teaching workflows, publish homework and assignments, mark student attendance, and run online quizzes.",
    features: [
      "Upload homework and assignments",
      "Manage attendance",
      "Conduct online exams",
      "Update marks and progress",
      "Share announcements",
      "Manage class timetable"
    ],
    mockup: {
      title: "Teacher Classroom Center",
      metrics: [
        { label: "Assignments Checked", value: "24/28", change: "Grade pending" },
        { label: "Today's Classes", value: "4 periods", change: "Next: Grade X Science" },
        { label: "Active Exams", value: "1 Quiz", change: "MCQ Live" },
        { label: "Announcements Sent", value: "2", change: "To Grade X Parents" }
      ],
      previewText: "Attendance calendar marker, mark entries sheet, assignment submission dashboard, and interactive quiz creator."
    }
  },
  {
    id: "student",
    name: "Student Panel",
    icon: Rocket,
    color: "from-[#285E89] to-[#1D496C]",
    bgColor: "bg-[#285E89]/5",
    accentColor: "#285E89",
    glowColor: "shadow-[#285E89]/20",
    description: "Access a personalized study environment to track learning progress, submit assignments, take exams, and stay connected.",
    features: [
      "View homework and assignments",
      "Attend online exams",
      "Access timetable and syllabus",
      "Login credentials via email",
      "Track attendance and marks"
    ],
    mockup: {
      title: "Student Portal Home",
      metrics: [
        { label: "Homework Pending", value: "2 items", change: "Due tomorrow" },
        { label: "Your Attendance", value: "98.2%", change: "Excellent" },
        { label: "Upcoming Exams", value: "1", change: "Friday 10:00 AM" },
        { label: "Average GPA Score", value: "A+", change: "Top 5% in class" }
      ],
      previewText: "Timetable viewer widget, assignment uploader form, exam console panel, and progress report dashboard."
    }
  },
  {
    id: "parent",
    name: "Guardian / Parent Panel",
    icon: Heart,
    color: "from-[#E11D48] to-[#BE123C]",
    bgColor: "bg-[#E11D48]/5",
    accentColor: "#E11D48",
    glowColor: "shadow-[#E11D48]/20",
    description: "Stay involved in your child's education. Monitor daily school life, track progress, review marksheets, and see official school news.",
    features: [
      "Track student progress",
      "View attendance and marksheets",
      "Check exam results",
      "Monitor homework completion",
      "Receive school announcements"
    ],
    mockup: {
      title: "Parent Dashboard",
      metrics: [
        { label: "Child Progress", value: "Improving", change: "+5% last term" },
        { label: "Outstanding Fees", value: "₹0", change: "Fully paid" },
        { label: "School Notifications", value: "3 new", change: "Holiday alert included" },
        { label: "Homework Verified", value: "100%", change: "All checked" }
      ],
      previewText: "Performance progress graphs, report card download console, fee dues tracking, and school announcement logs."
    }
  }
];

