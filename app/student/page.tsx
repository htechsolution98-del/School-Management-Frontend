"use client";

import React from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  BookOpen,
  BookMarked,
  ClipboardList,
  Calendar,
  Trophy,
  BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut" as const,
    },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
    },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  linkText: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  linkColor: string;
  href?: string;
}

interface TimetableEntry {
  time: string;
  subject: string;
  room: string;
  dotColor: string;
}

interface HomeworkEntry {
  subject: string;
  subjectColor: string;
  title: string;
  chapter: string;
  dueText: string;
  dueColor: string;
  dueBg: string;
}

// ─────────────────────────────────────────────
// Static Data
// ─────────────────────────────────────────────
const statCards: StatCard[] = [
  {
    title: "Homework",
    value: 5,
    subtitle: "Pending",
    linkText: "View all →",
    icon: <BookOpen size={26} className="text-indigo-500" />,
    iconBg: "bg-indigo-100",
    valueColor: "text-indigo-600",
    linkColor: "text-indigo-500",
    href: "/student/homework",
  },
  {
    title: "Syllabus",
    value: "68%",
    subtitle: "Completed",
    linkText: "View details →",
    icon: <BookMarked size={26} className="text-emerald-500" />,
    iconBg: "bg-emerald-100",
    valueColor: "text-emerald-500",
    linkColor: "text-emerald-500",
    href: "/student/syllabus",
  },
  {
    title: "Tests",
    value: 2,
    subtitle: "Upcoming",
    linkText: "View all →",
    icon: <ClipboardList size={26} className="text-orange-500" />,
    iconBg: "bg-orange-100",
    valueColor: "text-orange-500",
    linkColor: "text-orange-500",
  },
  {
    title: "Timetable",
    value: 6,
    subtitle: "Today's Classes",
    linkText: "View timetable →",
    icon: <Calendar size={26} className="text-blue-500" />,
    iconBg: "bg-blue-100",
    valueColor: "text-blue-600",
    linkColor: "text-blue-500",
  },
];

const timetableEntries: TimetableEntry[] = [
  {
    time: "08:00 AM - 08:45 AM",
    subject: "Mathematics",
    room: "Room 101",
    dotColor: "bg-indigo-500",
  },
  {
    time: "08:45 AM - 09:30 AM",
    subject: "Science",
    room: "Room 205",
    dotColor: "bg-emerald-500",
  },
  {
    time: "09:45 AM - 10:30 AM",
    subject: "English",
    room: "Room 103",
    dotColor: "bg-blue-500",
  },
  {
    time: "10:30 AM - 11:15 AM",
    subject: "Social Studies",
    room: "Room 104",
    dotColor: "bg-orange-500",
  },
  {
    time: "11:30 AM - 12:15 PM",
    subject: "Hindi",
    room: "Room 102",
    dotColor: "bg-pink-500",
  },
  {
    time: "12:15 PM - 01:00 PM",
    subject: "Computer",
    room: "Lab 1",
    dotColor: "bg-purple-500",
  },
];

const homeworkEntries: HomeworkEntry[] = [
  {
    subject: "Mathematics",
    subjectColor:
      "text-indigo-600 bg-indigo-50 border border-indigo-200",
    title: "Algebra Worksheet",
    chapter: "Chapter 5",
    dueText: "Due Today",
    dueColor: "text-white",
    dueBg: "bg-indigo-500",
  },
  {
    subject: "Science",
    subjectColor:
      "text-emerald-600 bg-emerald-50 border border-emerald-200",
    title: "Lab Report – Human Eye",
    chapter: "Chapter 4",
    dueText: "Due in 2 Days",
    dueColor: "text-orange-600",
    dueBg: "bg-orange-50 border border-orange-300",
  },
  {
    subject: "English",
    subjectColor: "text-blue-600 bg-blue-50 border border-blue-200",
    title: "Essay Writing",
    chapter: "Paragraph Writing Practice",
    dueText: "Due in 3 Days",
    dueColor: "text-orange-500",
    dueBg: "bg-orange-50 border border-orange-200",
  },
  {
    subject: "Social Studies",
    subjectColor:
      "text-orange-600 bg-orange-50 border border-orange-200",
    title: "Map Work – India",
    chapter: "Political Map",
    dueText: "Due in 5 Days",
    dueColor: "text-gray-500",
    dueBg: "bg-gray-100 border border-gray-200",
  },
  {
    subject: "Hindi",
    subjectColor: "text-pink-600 bg-pink-50 border border-pink-200",
    title: "पाठ लेखन अभ्यास",
    chapter: "पाठ ३",
    dueText: "Due in 7 Days",
    dueColor: "text-gray-500",
    dueBg: "bg-gray-100 border border-gray-200",
  },
];

// ─────────────────────────────────────────────
// Greeting Header
// ─────────────────────────────────────────────
function GreetingHeader() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={0}
    >
      {/* Left: greeting text */}
      <div>
        <motion.h1
          className="text-2xl md:text-3xl font-extrabold text-gray-800 flex items-center gap-2"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.5}
        >
          Good Morning, Aarav!{" "}
          <motion.span
            animate={{ rotate: [0, 20, -10, 20, 0] }}
            transition={{ duration: 1.2, delay: 0.8, ease: "easeInOut" }}
            className="inline-block"
          >
            👋
          </motion.span>
        </motion.h1>
        <motion.p
          className="text-gray-400 text-sm mt-1"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Here's what's happening today.
        </motion.p>
      </div>

      {/* Right: date badge */}
      <motion.div
        className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm self-start sm:self-auto"
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <Calendar size={15} className="text-indigo-500" />
        <span className="font-medium">{today}</span>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────
function StatCard({ card, index }: { card: StatCard; index: number }) {
  const content = (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col gap-3 cursor-pointer group h-full"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{
        y: -5,
        boxShadow: "0 12px 30px rgba(99,102,241,0.12)",
        transition: { duration: 0.25 },
      }}
    >
      {/* Icon row */}
      <div className="flex items-center gap-3">
        <motion.div
          className={`${card.iconBg} p-3 rounded-xl`}
          whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
        >
          {card.icon}
        </motion.div>
        <span className="text-sm font-medium text-gray-400">{card.title}</span>
      </div>

      {/* Big value */}
      <motion.p
        className={`text-3xl sm:text-5xl font-extrabold ${card.valueColor}`}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 + index * 0.1, duration: 0.5, type: "spring" }}
      >
        {card.value}
      </motion.p>

      {/* Subtitle */}
      <p className="text-sm text-gray-400">{card.subtitle}</p>

      {/* CTA link */}
      <span
        className={`text-sm font-semibold ${card.linkColor} group-hover:underline text-left group-hover:tracking-wide transition-all duration-200`}
      >
        {card.linkText}
      </span>
    </motion.div>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

// ─────────────────────────────────────────────
// Today's Timetable
// ─────────────────────────────────────────────
function TodayTimetable() {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={4}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 font-bold text-gray-800 text-base">
          <Calendar size={18} className="text-indigo-500" />
          Today's Timetable
        </div>
        <button className="text-sm text-indigo-500 hover:underline font-medium">
          View full timetable →
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-gray-50">
        {timetableEntries.map((entry, idx) => (
          <motion.div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={idx}
            whileHover={{ x: 4, transition: { duration: 0.2 } }}
          >
            {/* Time */}
            <span className="text-xs text-gray-400 w-40 shrink-0">
              {entry.time}
            </span>

            {/* Dot + Subject */}
            <div className="flex items-center gap-2 flex-1">
              <motion.span
                className={`w-2.5 h-2.5 rounded-full ${entry.dotColor}`}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: idx * 0.3,
                }}
              />
              <span className="text-sm font-semibold text-gray-700">
                {entry.subject}
              </span>
            </div>

            {/* Room */}
            <span className="text-[10px] sm:text-xs font-medium text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg self-start sm:self-auto">
              {entry.room}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Today's Homework
// ─────────────────────────────────────────────
function TodayHomework() {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={5}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 font-bold text-gray-800 text-base">
          <BookOpen size={18} className="text-indigo-500" />
          Today's Homework
        </div>
        <button className="text-sm text-indigo-500 hover:underline font-medium">
          View all →
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-gray-50">
        {homeworkEntries.map((hw, idx) => (
          <motion.div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={idx}
            whileHover={{ x: 4, transition: { duration: 0.2 } }}
          >
            {/* Subject badge */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${hw.subjectColor}`}
            >
              {hw.subject}
            </span>

            {/* Title + chapter */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 break-words">
                {hw.title}
              </p>
              <p className="text-xs text-gray-400">{hw.chapter}</p>
            </div>

            {/* Due badge */}
            <motion.span
              className={`text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${hw.dueBg} ${hw.dueColor}`}
              whileHover={{ scale: 1.08 }}
            >
              {hw.dueText}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Motivation Banner
// ─────────────────────────────────────────────
function MotivationBanner() {
  return (
    <motion.div
      className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-4 sm:p-6 flex flex-col items-start sm:flex-row sm:items-center justify-between gap-4"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={7}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
    >
      {/* Decorative blobs */}
      <motion.div
        className="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-8 right-20 w-24 h-24 bg-white/10 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />

      {/* Left content */}
      <div className="flex items-center gap-4 z-10">
        <motion.div
          className="bg-white/20 text-white rounded-full p-3"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Trophy size={26} />
        </motion.div>
        <div>
          <p className="font-bold text-white text-base">
            You're doing great, Aarav! ⭐
          </p>
          <p className="text-sm text-indigo-100">
            Stay consistent and keep up the good work.
          </p>
        </div>
      </div>

      {/* CTA button */}
      <motion.button
        className="z-10 flex items-center gap-2 bg-white text-indigo-600 font-bold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-shadow shrink-0"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <BarChart2 size={16} />
        View Progress
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────
export default function StudentDashboardPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-3 sm:px-6 md:px-8 py-4 sm:py-6 bg-gray-50 min-h-screen overflow-x-hidden">
      {/* Greeting */}
      <GreetingHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <StatCard key={idx} card={card} index={idx + 1} />
        ))}
      </div>

      {/* Timetable + Homework */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayTimetable />
        <TodayHomework />
      </div>

      {/* Motivation Banner */}
      <MotivationBanner />
    </div>
  );
}