"use client";

import { useState } from "react";
import { MessageSquare, Calendar, Mail, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/confirm-provider";

export default function InquiriesManager() {
  const confirm = useConfirm();
  const [inquiries, setInquiries] = useState<any[]>([
    {
      _id: "1",
      name: "Sanjay Mehta",
      email: "sanjay@greenwoodhigh.in",
      subject: "ERP Deployment Quote",
      message: "We are looking to implement VidyaSanchalan for our campus of 1500 students. Could you send us pricing structures for quarterly billing modules?",
      createdAt: new Date().toISOString(),
      isRead: false
    },
    {
      _id: "2",
      name: "Aditi Rao",
      email: "aditi.rao@gmail.com",
      subject: "Parent Mobile App Query",
      message: "Hello, does the parent portal application have tracking features for school buses? Our guardians are looking for real-time location alerts.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isRead: true
    }
  ]);

  const handleDelete = async (id: string) => {
    if (await confirm("Delete this inquiry record from list?")) {
      setInquiries(inquiries.filter(item => item._id !== id));
    }
  };

  const toggleRead = (id: string) => {
    setInquiries(inquiries.map(item => item._id === id ? { ...item, isRead: !item.isRead } : item));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Contact Form Inquiries</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Review feedback and inquiries submitted by potential customers via your site contact forms</p>
      </div>

      <div className="space-y-4">
        {inquiries.length === 0 ? (
          <Card className="border border-dashed border-slate-200 bg-white">
            <CardContent className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageSquare className="h-8 w-8 stroke-[1.5]" />
              <p className="text-sm font-bold">No active inquires found</p>
            </CardContent>
          </Card>
        ) : (
          inquiries.map((inq) => (
            <Card key={inq._id} className={`overflow-hidden shadow-sm border border-slate-100 rounded-2xl bg-white transition-all ${!inq.isRead ? 'border-l-4 border-l-[#429CE4]' : ''}`}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#1D496C]">{inq.name}</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono text-slate-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {inq.email}
                    </span>
                    {!inq.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#429CE4] animate-pulse"></span>
                    )}
                  </div>
                  <CardTitle className="text-sm sm:text-base font-black text-slate-800 pt-1">{inq.subject}</CardTitle>
                </div>
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(inq.createdAt).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/40">
                  {inq.message}
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                  <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => toggleRead(inq._id)}>
                    {inq.isRead ? "Mark Unread" : "Mark Read"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(inq._id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Record
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
