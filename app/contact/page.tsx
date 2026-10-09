"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowRight,
  Menu,
  Star,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Building,
  User,
  Users,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function ContactPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    schoolName: "",
    email: "",
    phone: "",
    role: "Trustee",
    strength: "",
    module: "Complete ERP",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSubmitted(true);
    toast.success("Thank you! Our team will contact you shortly.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800 overflow-x-clip relative font-sans">
      
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-slate-100 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-[40%] right-[-100px] w-[600px] h-[600px] bg-[#429CE4]/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>

      {/* Header */}
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
                <span className="text-lg font-black tracking-tight">
                  <span className="text-[#285E89]">Vidya</span><span className="text-[#FFA600]">Sanchalan</span>
                </span>
                <p className="text-[9px] text-[#285E89]/60 font-bold uppercase tracking-wider mt-0.5">Contact Desk</p>
              </div>
            </Link>

            {/* Nav Menu Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Home</Link>
              <Link href="/features" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Features</Link>
              <Link href="/modules" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#FFA600]">Modules</Link>
              <Link href="/contact" className="text-sm font-bold text-[#285E89] relative transition-colors hover:text-[#FFA600]">
                Contact Us
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-[#285E89] to-[#FFA600]"></span>
              </Link>
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
            <Link href="/features" className="block text-sm font-medium text-slate-600 py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Features</Link>
            <Link href="/modules" className="block text-sm font-medium text-slate-600 py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Modules</Link>
            <Link href="/contact" className="block text-sm font-bold text-[#285E89] py-2 hover:text-[#FFA600]" onClick={() => setIsMenuOpen(false)}>Contact Us</Link>
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

      {/* Main Grid Content */}
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* LEFT SIDE - CONTACT FORM */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 bg-[#F8FAFC] border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden"
            >
              
              {/* Decorative accent element */}
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#429CE4]/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-4 mb-8">
                <Badge
                  variant="outline"
                  className="rounded-full px-4 py-1.5 border-[#FFA600]/30 bg-[#FFA600]/10 text-[#FFA600] font-bold tracking-wider uppercase text-xs"
                >
                  ✉️ Connect With Us
                </Badge>
                <h1 className="text-2.5xl sm:text-4xl font-extrabold text-[#1D496C] tracking-tight leading-tight">
                  Get in Touch with VidhyaSanchalan
                </h1>
                <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
                  Have questions or want to digitize your school? Fill out the form and our team will contact you shortly.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form 
                    key="contact-form"
                    onSubmit={handleSubmit} 
                    className="space-y-6"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs sm:text-sm font-bold text-[#1D496C]">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                          <Input
                            id="fullName"
                            type="text"
                            required
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="pl-10.5 h-12 rounded-xl border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* School Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="schoolName" className="text-xs sm:text-sm font-bold text-[#1D496C]">School Name</Label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                          <Input
                            id="schoolName"
                            type="text"
                            required
                            placeholder="Enter your school name"
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            className="pl-10.5 h-12 rounded-xl border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs sm:text-sm font-bold text-[#1D496C]">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            required
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="pl-10.5 h-12 rounded-xl border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs sm:text-sm font-bold text-[#1D496C]">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                          <Input
                            id="phone"
                            type="tel"
                            maxLength={10}
                            required
                            placeholder="Enter 10-digit mobile number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                            className="pl-10.5 h-12 rounded-xl border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Your Role Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="role" className="text-xs sm:text-sm font-bold text-[#1D496C]">Your Role</Label>
                        <div className="relative">
                          <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all appearance-none cursor-pointer text-sm font-medium"
                          >
                            {["Trustee", "Principal", "Clerk", "Teacher", "Other"].map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* School Strength */}
                      <div className="space-y-1.5">
                        <Label htmlFor="strength" className="text-xs sm:text-sm font-bold text-[#1D496C]">School Strength</Label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                          <Input
                            id="strength"
                            type="number"
                            required
                            placeholder="Number of students"
                            value={formData.strength}
                            onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                            className="pl-10.5 h-12 rounded-xl border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interested Module Dropdown */}
                    <div className="space-y-1.5">
                      <Label htmlFor="module" className="text-xs sm:text-sm font-bold text-[#1D496C]">Interested Module</Label>
                      <div className="relative">
                        <select
                          id="module"
                          value={formData.module}
                          onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all appearance-none cursor-pointer text-sm font-medium"
                        >
                          {["Admission", "Fees", "Attendance", "Exam", "Complete ERP"].map((module) => (
                            <option key={module} value={module}>{module}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Message Box */}
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs sm:text-sm font-bold text-[#1D496C]">Message</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                        <textarea
                          id="message"
                          required
                          rows={4}
                          placeholder="Write your requirement"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full pl-10.5 py-3 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/10 transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Request a Demo Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-[#1D496C] via-[#285E89] to-[#429CE4] text-white font-bold text-sm shadow-md hover:shadow-lg hover:from-[#153957] hover:to-[#2e7ca8] active:scale-[0.98] transition-all duration-200"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Processing Request…
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Request a Demo
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </div>

                  </motion.form>
                ) : (
                  <motion.div 
                    key="success-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 px-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm mb-2">
                      <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#1D496C]">Thank you!</h2>
                    <p className="text-sm font-semibold text-slate-500 max-w-sm leading-relaxed">
                      Your demo request has been successfully registered. One of our educational coordinator will get in touch with you shortly at <span className="font-bold text-[#FFA600]">{formData.email}</span>.
                    </p>
                    <Button 
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                      className="mt-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      Fill another request
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* RIGHT SIDE - BRANDING & CONTACT INFO */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-5 space-y-8"
            >
              {/* Headline Card */}
              <div className="space-y-4">
                <Badge
                  variant="outline"
                  className="rounded-full px-4.5 py-1.5 border-[#429CE4]/30 bg-[#429CE4]/10 text-[#429CE4] shadow-sm font-bold tracking-wider uppercase text-xs"
                >
                  🚀 Let's Innovate Together
                </Badge>
                <h2 className="text-3xl sm:text-4.5xl font-extrabold text-[#1D496C] tracking-tight leading-[1.12]">
                  Let’s Build a <span className="text-[#285E89]">Smarter School</span> Together
                </h2>
                <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
                  VidhyaSanchalan helps schools manage admission, fees, attendance, exams, homework, announcements, progress reports, and parent communication from one powerful platform.
                </p>
              </div>

              {/* Ultra-Premium Glassmorphic Contact Details Box (using Brand Colors) */}
              <Card className="border border-slate-100 bg-[#F8FAFC] shadow-2xl rounded-[2.5rem] overflow-hidden relative group cursor-pointer hover:shadow-slate-200/50 transition-all duration-300">
                
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-tr from-[#1D496C]/10 to-[#FFA600]/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform"></div>

                <CardContent className="p-8 sm:p-10 relative space-y-6">
                  
                  {/* Contact Info Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200/60">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1D496C] to-[#285E89] text-white flex items-center justify-center shadow-md">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#1D496C] leading-none mb-0.5">Contact Details</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Get in Touch</p>
                    </div>
                  </div>

                  {/* Info points */}
                  <div className="space-y-5">
                    {/* Email */}
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-[#1D496C] shadow-sm shrink-0 group-hover/item:bg-[#1D496C] group-hover/item:text-white transition-colors duration-300">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Email Us</span>
                        <a href="mailto:info@vidhyasanchalan.com" className="text-sm font-bold text-slate-800 hover:text-[#FFA600] transition-colors leading-tight">
                          info@vidhyasanchalan.com
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-[#285E89] shadow-sm shrink-0 group-hover/item:bg-[#285E89] group-hover/item:text-white transition-colors duration-300">
                        <Phone className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Call Us</span>
                        <a href="tel:+91XXXXXXXXXX" className="text-sm font-bold text-slate-800 hover:text-[#FFA600] transition-colors leading-tight">
                          +91 XXXXX XXXXX
                        </a>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-[#FFA600] shadow-sm shrink-0 group-hover/item:bg-[#FFA600] group-hover/item:text-white transition-colors duration-300">
                        <MapPin className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Our Location</span>
                        <span className="text-sm font-bold text-slate-800 leading-tight">
                          Ahmedabad, Gujarat
                        </span>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Extra Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Free 14-Day Setup",
                  "Dedicated Support Team",
                  "No Hidden Modules Fees",
                  "Double Security Audited"
                ].map((highlight, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shadow-sm hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E4FF4C]/30 text-[#6A7626]">
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700">{highlight}</span>
                  </div>
                ))}
              </div>

            </motion.div>

          </div>
        </div>
      </main>

      {/* Footer (WHITE/LIGHT BACKGROUND) */}
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
