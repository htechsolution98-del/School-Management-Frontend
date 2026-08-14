"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Send,
  Trash2,
  Bell,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetAudience: "Students & Parents" | "Students Only" | "Parents Only";
  className: string;
  priority: "Normal" | "Important" | "Urgent";
  postedDate: string;
}

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<AnnouncementItem["targetAudience"]>("Students & Parents");
  const [targetClass, setTargetClass] = useState("Std1 - Div A");
  const [priority, setPriority] = useState<AnnouncementItem["priority"]>("Normal");

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter announcement title.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter announcement details.");
      return;
    }

    const newAnnouncement: AnnouncementItem = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      targetAudience: audience,
      className: targetClass,
      priority: priority,
      postedDate: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    toast.success(`📣 Announcement broadcasted to ${audience}!`);

    // Reset Form
    setTitle("");
    setContent("");
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
    toast.success("Announcement deleted.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Class & Student Announcements
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Broadcast important updates, circulars, and notices directly to Student & Parent Portals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Form */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Create Announcement
            </CardTitle>
            <CardDescription className="text-xs">
              Broadcast notice to class students and guardians.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handlePost} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Notice Title *
                </label>
                <Input
                  placeholder="e.g. Science Fair Submission Date"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Target Audience</label>
                <Select value={audience} onValueChange={(v) => v && setAudience(v as any)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Students & Parents">Students & Parents</SelectItem>
                    <SelectItem value="Students Only">Students Only</SelectItem>
                    <SelectItem value="Parents Only">Parents Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Target Class</label>
                  <Select value={targetClass} onValueChange={(v) => v && setTargetClass(v)}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std 1 - Div A">Std 1 - Div A</SelectItem>
                      <SelectItem value="Std 1 - Div B">Std 1 - Div B</SelectItem>
                      <SelectItem value="Std 1 - All Divisions">Std 1 - All Divisions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Priority</label>
                  <Select value={priority} onValueChange={(v) => v && setPriority(v as any)}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Important">Important</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Announcement Details *
                </label>
                <Textarea
                  placeholder="Write clear instructions for students/parents..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 shadow-2xs"
              >
                <Send className="h-4 w-4" /> Broadcast Announcement
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Announcements Feed */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              Posted Announcements ({announcements.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Live updates visible on Student & Parent Dashboards.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {announcements.length === 0 ? (
              <div className="py-14 text-center space-y-2 p-4">
                <Megaphone className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No active announcements</p>
                <p className="text-[11px] text-slate-400">Post a new notice using the left form.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {announcements.map((item) => (
                  <div key={item.id} className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] font-bold ${
                            item.priority === "Urgent"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : item.priority === "Important"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {item.priority}
                        </Badge>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{item.title}</h4>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">{item.content}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-bold text-slate-500">
                        <Users className="h-3 w-3 text-indigo-500" /> {item.targetAudience}
                      </span>
                      <span>•</span>
                      <span>Class: {item.className}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" /> {item.postedDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
