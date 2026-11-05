"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Smartphone,
  Lock,
  Wifi,
  Fingerprint,
  MessageSquare,
  Activity,
  FileText,
  Network,
  HardDrive,
  ShieldAlert,
  Key,
  Database,
  Cpu,
} from "lucide-react";

const getInfraIcon = (name: string, className?: string) => {
  switch (name) {
    case "Lock": return <Lock className={className} />;
    case "Wifi": return <Wifi className={className} />;
    case "Bell": return <Bell className={className} />;
    case "Fingerprint": return <Fingerprint className={className} />;
    case "Activity": return <Activity className={className} />;
    case "Cpu": return <Cpu className={className} />;
    case "ShieldAlert": return <ShieldAlert className={className} />;
    case "Key": return <Key className={className} />;
    case "Database": return <Database className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "Smartphone": return <Smartphone className={className} />;
    default: return <Cpu className={className} />;
  }
};

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<string>("parent");
  const [sliderIndex, setSliderIndex] = useState(1); // Default center (mobile-2 is active)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tabIds, setTabIds] = useState<string[]>(["parent", "student", "teacher"]);

  const [tabsContent, setTabsContent] = useState<Record<string, any>>({
    student: {
      badge: "Student Application",
      title: "Learn Smarter, Grow Faster",
      desc: "Designed to keep students organized, motivated, and engaged.",
      points: [
        "Homework Tracker",
        "Online Examination",
        "Student Timetable",
        "Academic Analytics",
      ],
      color: "from-[#429CE4] to-[#1D496C]",
      accent: "text-[#429CE4] bg-white/10 border-[#429CE4]/20",
    },
    parent: {
      badge: "Parent Companion App",
      title: "Your Child's Progress, In Your Pocket",
      desc: "Stay intimately connected with your child's educational journey.",
      points: [
        "Real-Time Geo-Attendance",
        "Digital Fee Desk",
        "Direct Parent-Teacher Chats",
        "Comprehensive Report Cards",
      ],
      color: "from-[#FFA600] to-[#ED6708]",
      accent: "text-[#FFA600] bg-white/10 border-[#FFA600]/20",
    },
    teacher: {
      badge: "Teacher Dashboard",
      title: "Focus on Teaching, Automate the Rest",
      desc: "Powerful admin tools in the palm of your hand.",
      points: [
        "Geo-Fenced Biometric Attendance",
        "Mobile Grading Engine",
        "Broadcaster Bulletin",
        "Substitution Alerts",
      ],
      color: "from-[#6A7626] to-[#4F581D]",
      accent: "text-[#E4FF4C] bg-white/10 border-white/20",
    },
  });

  const [mobileInfrastructure, setMobileInfrastructure] = useState<any[]>([
    {
      title: "Bank-Grade Encryption",
      desc: "All financial data and API transactions are locked under high-strength TLS protocols ensuring completely secure fees transactions.",
      iconName: "Lock",
      hoverBg: "hover:bg-[#429CE4] hover:border-[#429CE4] hover:shadow-xl hover:shadow-[#429CE4]/20",
    },
    {
      title: "Offline Operations Mode",
      desc: "Never lose school data inside poor networks. The application synchronizes critical homework and logs directly from local cashiers.",
      iconName: "Wifi",
      hoverBg: "hover:bg-[#6A7626] hover:border-[#6A7626] hover:shadow-xl hover:shadow-[#6A7626]/20",
    },
    {
      title: "Instant Broadcaster Alerts",
      desc: "Integrated micro-sockets delivery engine providing notifications the exact millisecond announcements go active.",
      iconName: "Bell",
      hoverBg: "hover:bg-[#ED6708] hover:border-[#ED6708] hover:shadow-xl hover:shadow-[#ED6708]/20",
    },
    {
      title: "Biometric & Geo-location",
      desc: "Security tracking logs for teacher roll-call ensuring verifiable attendance entries using mobile GPS services.",
      iconName: "Fingerprint",
      hoverBg: "hover:bg-[#FFA600] hover:border-[#FFA600] hover:shadow-xl hover:shadow-[#FFA600]/20",
    },
  ]);

  const [capabilities, setCapabilities] = useState<any[]>([]);

  // Custom lagging cursor follower spring physics
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 30, stiffness: 220, mass: 0.6 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
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


  // Dynamic appScreens list based on loaded tabIds and content
  const appScreens = tabIds.map((tabId, idx) => {
    const tabData = tabsContent[tabId] || {};
    let img = tabData.image;
    if (!img) {
      if (tabId === "student") img = "/mobile-1.png";
      else if (tabId === "parent") img = "/mobile-2.png";
      else if (tabId === "teacher") img = "/mobile-3.png";
      else {
        // Custom tab uses rotating images
        const imgIdx = (idx % 3) + 1;
        img = `/mobile-${imgIdx}.png`;
      }
    }

    return {
      id: idx,
      title: tabData.badge || "System Portal UI",
      image: img,
      description: tabData.desc || "Complete interactive administrative workspace interface.",
      tabId: tabId
    };
  });

  const handleNextSlide = () => {
    if (appScreens.length === 0) return;
    const nextIdx = (sliderIndex + 1) % appScreens.length;
    setSliderIndex(nextIdx);
    setActiveTab(appScreens[nextIdx].tabId);
  };

  const handlePrevSlide = () => {
    if (appScreens.length === 0) return;
    const prevIdx = (sliderIndex - 1 + appScreens.length) % appScreens.length;
    setSliderIndex(prevIdx);
    setActiveTab(appScreens[prevIdx].tabId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800 overflow-x-clip relative font-sans">

      {/* Decorative Blur Blobs for Light Background */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-slate-100 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-[40%] right-[-100px] w-[600px] h-[600px] bg-[#429CE4]/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-100px] left-[20%] w-[500px] h-[500px] bg-[#FFA600]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Header (White Background) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center">
                <div className="flex h-12 w-auto items-center justify-center rounded-lg bg-white p-1.5 shadow-md border border-[#285E89]/10 group-hover:scale-105 transition-transform duration-300">
                  <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-8 w-auto max-w-[140px] object-contain" />
                </div>
                <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#FFA600] ring-2 ring-white"></div>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight"><span className="text-[#285E89]">Vidya</span><span className="text-[#FFA600]">Sanchalan</span></span>
                <p className="text-[9px] text-[#285E89]/60 font-bold uppercase tracking-wider mt-0.5">Features Hub</p>
              </div>
            </Link>

            {/* Nav Menu Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Home</Link>
              <Link href="/features" className="text-sm font-bold text-[#285E89] relative transition-colors hover:text-[#FFA600]">
                Features
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-[#285E89] to-[#FFA600]"></span>
              </Link>
              <Link href="/modules" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Modules</Link>
              <Link href="/contact" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Contact Us</Link>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-[#FFA600] text-white shadow-md hover:bg-[#ED6708] hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 bg-transparent"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3 shadow-md"
          >
            <Link href="/" className="block text-sm font-medium text-slate-600 py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link href="/features" className="block text-sm font-bold text-[#285E89] py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Features</Link>
            <Link href="/modules" className="block text-sm font-medium text-slate-600 py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Modules</Link>
            <Link href="/contact" className="block text-sm font-medium text-slate-600 py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Contact Us</Link>
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <Button variant="outline" className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 bg-transparent" asChild>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
              </Button>
              <Button className="w-full bg-[#FFA600] text-white hover:bg-[#ED6708]" asChild>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section - Background set to BRAND DARK BLUE (1D496C) */}
      <section className="relative py-8 md:py-12 flex items-center bg-[#1D496C] text-white overflow-hidden">

        {/* Soft Decorative Ambient Lights inside Hero */}
        <div className="absolute top-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#429CE4]/10 rounded-full blur-[100px] pointer-events-none -z-0"></div>
        <div className="absolute bottom-[-100px] left-[-50px] w-[400px] h-[400px] bg-[#FFA600]/10 rounded-full blur-[100px] pointer-events-none -z-0"></div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

            {/* Left Side Content - Tabs & Mobile Highlights */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="space-y-4">
                <Badge
                  variant="outline"
                  className="rounded-full px-4 py-1.5 border-[#FFA600]/30 bg-[#FFA600]/10 text-[#FFA600] shadow-sm font-bold tracking-wider uppercase text-xs"
                >
                  ✨ Mobile Ecosystem
                </Badge>
                <h1 className="text-3.5xl sm:text-5xl lg:text-5.5xl font-black tracking-tight leading-[1.15] text-white">
                  Comprehensive App <span className="bg-gradient-to-r from-[#429CE4] via-[#E4FF4C] to-[#FFA600] bg-clip-text text-transparent block">For School Roles</span>
                </h1>
                <p className="text-slate-200/90 text-base sm:text-lg leading-relaxed max-w-xl font-medium">
                  Connect trust coordinators, parents, teachers, and students through our integrated mobile application network. Real-time updates, secure transaction processing, and academic monitoring in your hand.
                </p>
              </div>

              {/* Interactive Segmented Tabs (using brand colors) */}
              <div className="bg-[#153957] border border-[#1b4363] p-1.5 rounded-2xl flex max-w-md shadow-inner shadow-black/20">
                {tabIds.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSliderIndex(tabIds.indexOf(tab));
                    }}
                    className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl capitalize tracking-wide transition-all duration-300 relative overflow-hidden ${activeTab === tab
                      ? "text-white shadow-lg z-10"
                      : "text-slate-300 hover:text-slate-100"
                      }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTabBg"
                        className={`absolute inset-0 bg-gradient-to-r ${tabsContent[tab]?.color || "from-[#429CE4] to-[#1D496C]"} -z-10`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Dynamic Feature Details based on Tab */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 max-w-xl"
                >
                  <div className="space-y-2">
                    <span className={`inline-block px-3 py-1 rounded-full border text-[11px] font-black tracking-wider uppercase ${tabsContent[activeTab]?.accent || ""}`}>
                      {tabsContent[activeTab]?.badge || ""}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">{tabsContent[activeTab]?.title || ""}</h2>
                    <p className="text-sm font-medium text-slate-200/80 leading-relaxed">{tabsContent[activeTab]?.desc || ""}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                    {tabsContent[activeTab]?.points?.map((point: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="flex items-center gap-2.5 bg-[#184467]/40 border border-[#20537c]/60 rounded-xl px-4 py-3 hover:bg-[#1f547c] transition-colors shadow-sm"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E4FF4C]">
                          <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white leading-tight">{point}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Right Side Column - Interactive 3D Mockup Slider */}
            <div className="lg:col-span-6 relative flex flex-col items-center justify-center min-h-[460px] py-4 lg:pl-10">

              {/* Giant backdrop background text: "OUR APP" */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none -z-0 w-full">
                <span className="text-[8.5rem] sm:text-[12rem] lg:text-[14rem] font-black tracking-wider text-white/[0.04] select-none uppercase font-sans">
                  OUR APP
                </span>
              </div>

              {/* Slider Deck */}
              <div className="relative w-full max-w-[420px] h-[480px] flex items-center justify-center z-10">

                {/* Underglow shadow */}
                <div className="absolute bottom-[30px] w-[240px] h-[40px] bg-[#429CE4]/20 blur-3xl rounded-full -z-10"></div>
                 {appScreens.map((screen, idx) => {
                  const total = appScreens.length;
                  let diff = idx - sliderIndex;
                  if (diff > total / 2) diff -= total;
                  if (diff < -total / 2) diff += total;

                  let scale = 0.8;
                  let zIndex = 10;
                  let opacity = 0.45;
                  let rotate = 0;
                  let translateX = "0px";

                  if (diff === 0) {
                    // Central Active Slide
                    scale = 1.0;
                    zIndex = 30;
                    opacity = 1.0;
                    rotate = 0;
                    translateX = "0px";
                  } else if (diff === 1 || (total === 2 && diff === -1)) {
                    // Right Slide
                    scale = 0.82;
                    zIndex = 20;
                    opacity = 0.65;
                    rotate = 5;
                    translateX = "110px";
                  } else if (diff === -1) {
                    // Left Slide
                    scale = 0.82;
                    zIndex = 20;
                    opacity = 0.65;
                    rotate = -5;
                    translateX = "-110px";
                  } else {
                    // Hidden Slide (for total > 3)
                    scale = 0.6;
                    zIndex = 0;
                    opacity = 0;
                    rotate = 0;
                    translateX = "0px";
                  }

                  return (
                    <motion.div
                      key={screen.id}
                      style={{ zIndex }}
                      animate={{
                        scale,
                        opacity,
                        rotate,
                        x: translateX,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 28,
                      }}
                      className="absolute w-[220px] sm:w-[245px] transition-shadow duration-500 select-none cursor-pointer"
                      onClick={() => {
                        setSliderIndex(screen.id);
                        setActiveTab(screen.tabId);
                      }}
                    >
                      {/* Premium Mobile Phone Frame */}
                      <div className="relative w-full aspect-[9/19] rounded-[2.2rem] bg-slate-950 p-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-800/85">
                        {/* Dynamic Island / Notch */}
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[70px] h-[16px] bg-slate-900 rounded-full z-40 flex items-center justify-between px-2.5">
                          <div className="w-1.5 h-1.5 bg-slate-950 rounded-full"></div>
                          <div className="w-4 h-1 bg-slate-950 rounded-full"></div>
                        </div>

                        {/* Speaker Bar */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-slate-800 rounded-full z-40"></div>

                        {/* Screenshot Content Box */}
                        <div className="w-full h-full rounded-[1.85rem] overflow-hidden bg-slate-900 relative">
                          <img
                            src={screen.image}
                            alt={screen.title}
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Left/Right Navigation Arrow Overlays */}
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-[-2rem] sm:left-[-3rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#153957] border border-[#20537c] shadow-xl flex items-center justify-center text-slate-300 hover:text-[#FFA600] hover:bg-[#20537c] hover:scale-110 active:scale-95 transition-all duration-300 z-40"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5.5 w-5.5 stroke-[2.5]" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-[-2rem] sm:right-[-3rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#153957] border border-[#20537c] shadow-xl flex items-center justify-center text-slate-300 hover:text-[#FFA600] hover:bg-[#20537c] hover:scale-110 active:scale-95 transition-all duration-300 z-40"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5.5 w-5.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Active Slide Label & Description */}
              <div className="mt-8 text-center max-w-[280px] z-10">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">{appScreens[sliderIndex]?.title || ""}</h4>
                <p className="text-xs font-semibold text-slate-300 mt-1.5 leading-relaxed">{appScreens[sliderIndex]?.description || ""}</p>

                {/* Dots indicator using 429CE4 and FFA600 */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {appScreens.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSliderIndex(i);
                        setActiveTab(appScreens[i].tabId);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === sliderIndex
                        ? "w-6 bg-[#FFA600]"
                        : "w-1.5 bg-[#429CE4]/40 hover:bg-[#429CE4]"
                        }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Feature Deep Dive Capabilities Grid (WHITE BACKGROUND) */}
      <section className="py-12 md:py-16 bg-white border-t border-slate-100 relative">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge
              variant="outline"
              className="rounded-full px-4 py-1.5 border-[#FFA600]/30 bg-[#FFA600]/10 text-[#FFA600] shadow-sm font-bold tracking-wider uppercase text-xs"
            >
              🛠️ Technical Capabilities
            </Badge>
            <h2 className="text-3xl sm:text-4.5xl font-black text-[#1D496C] leading-tight">
              State-of-the-Art <span className="text-[#285E89]">Mobile Infrastructure</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">
              Built on powerful core frameworks delivering high uptime, fast transactions, and seamless device sync.
            </p>
          </div>

          {/* Hover cards with brand-specific hover background color changes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(() => {
              const activeCapabilities = capabilities.length > 0 ? capabilities : mobileInfrastructure;
              return activeCapabilities.map((card, i) => {
                const hoverBg = card.hoverBg || [
                  "hover:bg-[#429CE4] hover:border-[#429CE4] hover:shadow-xl hover:shadow-[#429CE4]/20",
                  "hover:bg-[#6A7626] hover:border-[#6A7626] hover:shadow-xl hover:shadow-[#6A7626]/20",
                  "hover:bg-[#ED6708] hover:border-[#ED6708] hover:shadow-xl hover:shadow-[#ED6708]/20",
                  "hover:bg-[#FFA600] hover:border-[#FFA600] hover:shadow-xl hover:shadow-[#FFA600]/20"
                ][i % 4];
                return (
                  <Card
                    key={i}
                    className={`border border-slate-100 bg-white shadow-md rounded-[2rem] p-5 transition-all duration-500 hover:-translate-y-2 group cursor-pointer ${hoverBg}`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white/20 group-hover:border-transparent transition-all shadow-sm">
                      {getInfraIcon(card.iconName, "h-6 w-6 text-[#1D496C] group-hover:text-white transition-colors")}
                    </div>
                    <h3 className="text-base font-extrabold text-[#1D496C] mt-4 group-hover:text-white transition-colors">{card.title}</h3>
                    <p className="text-xs font-semibold text-slate-500 group-hover:text-white/90 leading-relaxed mt-2 transition-colors">{card.desc}</p>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* CTA Download Banner (WHITE/LIGHT BACKGROUND) */}
      <section className="py-6 bg-[#F8FAFC] relative border-t border-slate-100">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border border-slate-100 bg-gradient-to-r from-[#1D496C] via-[#285E89] to-[#1D496C] text-white shadow-2xl overflow-hidden rounded-[2.5rem] relative">
            <div className="absolute inset-0 bg-grid-white/[0.03] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>

            {/* Background design elements */}
            <div className="absolute right-[-40px] top-[-40px] w-[200px] h-[200px] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

            <CardContent className="p-12 md:p-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
              <div className="space-y-4 max-w-xl">
                <Badge variant="outline" className="rounded-lg px-3 py-1 border-[#FFA600]/30 bg-[#FFA600]/10 text-[#FFA600] font-bold text-xs tracking-wider uppercase">
                  🚀 Download Mobile Hub
                </Badge>
                <h2 className="text-2.5xl sm:text-4xl font-black text-white">
                  Get Connected to the Future of School Operations
                </h2>
                <p className="text-slate-200 text-sm sm:text-base font-medium">
                  Available now on Android and iOS devices. Contact our school admin or download the app via our trusted links.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#FFA600] text-white shadow-xl shadow-[#FFA600]/10 hover:shadow-2xl hover:shadow-[#FFA600]/20 hover:bg-[#ED6708] px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                  asChild
                >
                  <Link href="/signup">
                    Get Free Mobile Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border border-white/30 bg-transparent text-white hover:bg-white/10 px-8 py-6 text-base font-bold transition-all duration-300 transform hover:scale-105"
                  asChild
                >
                  <Link href="/">Back to Homepage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white text-slate-600">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 text-left">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-16 w-auto flex items-center justify-center rounded-xl bg-white p-2 shadow-sm border border-[#285E89]/10">
                  <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-12 w-auto max-w-[160px] object-contain" />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight"><span className="text-[#285E89]">Vidya</span><span className="text-[#FFA600]">Sanchalan</span></span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">School Management</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                Complete school management solution based on comprehensive SRS documentation.
                Automating administrative, academic, and operational tasks.
              </p>
              <div className="flex gap-3 mt-6">
                {[
                  { icon: <Twitter />, color: "from-[#285E89] to-[#1D496C]" },
                  { icon: <Github />, color: "from-[#6A7626] to-[#4F581D]" },
                  { icon: <Linkedin />, color: "from-[#429CE4] to-[#285E89]" },
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
                <h3 className="font-semibold text-slate-900 mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <Link href={getLinkHref(link)} className="text-sm text-slate-500 hover:text-[#285E89] transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/80 my-8"></div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-slate-500">© 2026 VidyaSanchalan. All rights reserved. Based on School Management SRS v1.0</p>
            <div className="flex gap-6 font-bold">
              <Link href="#" className="text-slate-500 hover:text-[#285E89] transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-slate-500 hover:text-[#285E89] transition-colors">Terms of Service</Link>
              <Link href="#" className="text-slate-500 hover:text-[#285E89] transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Lagging Custom Cursor Follower Ring */}
      {!isTouchDevice && (
        <motion.div
          className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-[#FFA600] bg-[#FFA600]/10 pointer-events-none z-[9999] shadow-[0_0_12px_rgba(255,166,0,0.4)]"
          style={{
            x: cursorX,
            y: cursorY,
          }}
        />
      )}

    </div>
  );
}

// Social icons helpers for footer
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
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0h.003z" />
    </svg>
  );
}

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
