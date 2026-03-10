"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "sonner";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { auth } from "~/utils/firebase";
import { useUploadFiles, useCreateSupportTicket } from "~/hooks/useApi";

interface CommonTopic {
  id: number;
  logo:string;
  title: string;
  description: string;
}
const commonTopics: CommonTopic[] = [
  {
    id: 1,
    logo: "/assets/support/video_camera_front.svg",
    title: "Session & Meeting",
    description: "Audio/video quality, connection drops, and recording issues.", 
  },
  {
    id: 2,  
    logo: "/assets/support/calendar_today.svg",
    title: "Booking Problems",
    description: "Calendar sync errors, double bookings, and cancellations.",
  },
  {
    id: 3,
    logo: "/assets/support/currency_rupee_circle.svg",
    title: "Payment & Payout",
    description: "Withdrawal delays, tax documents, and invoice disputes.",
  },
  {
    id: 4,
    logo: "/assets/support/space_dashboard.svg",
    title: "Dashboard Errors",
    description: "Login issues, broken analytics, or interface bugs.",
  }];
const CommonTopicsCard=({ topic }: { topic: CommonTopic })=>{
  return (
    <div className="flex flex-col items-start justify-start gap-3 bg-[#ffffff] shadow-sm shadow-[#6d6d6d6b] rounded-lg p-4 w-full">
      <div className="flex flex-col items-start justify-center gap-2">
        <img src={topic.logo} alt={`${topic.title} logo`} className="w-8 h-8" />
        <h3 className="text-md sm:text-lg font-semibold text-gray-900">{topic.title}</h3>
      </div>
      <p className="text-gray-500 text-sm">{topic.description}</p>
    </div>
  )
}

export default function TechnicalSupportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user] = useAuthState(auth);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadFilesMutation = useUploadFiles();
  const createTicketMutation = useCreateSupportTicket();
  
  const [contactDetails, setContactDetails] = useState({
    issueCategory: "session",
    selectedExperience: "",
    priorityLevel: "medium",
    description: "",
    attachments: null as File | null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setContactDetails({
      ...contactDetails,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setContactDetails({
        ...contactDetails,
        attachments: file,
      });
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setContactDetails({
        ...contactDetails,
        attachments: file,
      });
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleFAQToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error("Please sign in to submit a support ticket");
      return;
    }

    if (!contactDetails.description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    setIsSubmitting(true);
    try {
      let evidenceUrls: string[] = [];

      // Upload attachment if exists
      if (contactDetails.attachments) {
        const uploadRes = await uploadFilesMutation.mutateAsync({
          files: [contactDetails.attachments],
          folder: "support/evidence",
        });
        if (uploadRes.success && uploadRes.data) {
          evidenceUrls = uploadRes.data.map((item) => item.url);
        }
      }

      // Create support ticket
      await createTicketMutation.mutateAsync({
        user_id: user.uid,
        category: "technical_support",
        subject: `${contactDetails.issueCategory} - Priority: ${contactDetails.priorityLevel}`,
        message: contactDetails.description,
        evidence_urls: evidenceUrls,
        is_urgent: contactDetails.priorityLevel === "critical",
      });

      toast.success("Your support ticket has been submitted successfully!");
      setContactDetails({
        issueCategory: "session",
        selectedExperience: "",
        priorityLevel: "medium",
        description: "",
        attachments: null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      toast.error("Failed to submit support ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e4f8ff] to-white">
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <div className="flex flex-row items-center justify-start gap-2 mb-12">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-[#717171] font-medium"
          >
            Support & Safety&gt;
          </Link>
          <span className="text-[#000000] text-sm font-medium">Technical Support</span>
        </div>
        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-2 justify-center">
          <h1 className="text-2xl sm:text-4xl font-semibold text-gray-900 mb-2">
            How can we help you today?
          </h1>
          <p className="text-gray-400">
            Find answers, troubleshoot issues, or connect with our specialized support team for hosts.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center bg-[#ffffff] shadow-sm shadow-[#6d6d6d6b] rounded-full w-full md:w-[80%] lg:w-[60%]">
            <FiSearch color="#0094CA" size={20} className="ml-3" />
            <input type="text" placeholder="Search for articles, errors or anything you need..." className="rounded-lg py-2 px-4 text-[#474956] border-0 bg-transparent outline-0 w-full" />
          </div>
        </div>
        <section>
          <h2 className="text-[#000000] font-semibold text-md sm:text-xl">
            Common Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {commonTopics.map((topic) => (
              <CommonTopicsCard key={topic.id} topic={topic} />
            ))} 
          </div>
        </section>
        {/* Contact Support Form */}
        <div className="flex items-center gap-4 my-8">
          <hr className="flex-1 border-t border-gray-300" />
          <span className="text-gray-600 font-semibold whitespace-nowrap">STILL NEED HELP?</span>
          <hr className="flex-1 border-t border-gray-300" />
        </div>

        <section>
          <div className="flex flex-row items-center justify-around">
            <div className="flex flex-col items-start justify-center">
              <h2 className="text-[#000000] font-semibold text-md sm:text-xl">Submit a Request</h2>
              <p className="text-gray-500 mt-2">
                Our technical team typically responds within 2 hours.
              </p>
            </div>
            <div className="flex flex-row items-center justify-center bg-[#DCFCE7] text-[#166534]">
              <span className="text-[#22C55E] font-extrabold text-xl">.</span>
              <span className="text-sm font-medium">System Operational</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 sm:p-8">
            <form onSubmit={handleContactSubmit} className="space-y-6">
              {/* Row 1: Issue Category & Which Experience */}
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <div className="w-full md:w-[50%]">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Issue Category
                  </label>
                  <select
                    name="issueCategory"
                    value={contactDetails.issueCategory}
                    onChange={handleChange}
                    className="w-full h-[3rem] px-4 py-2.5 rounded-lg outline-none bg-[#F8FAFC] border border-gray-300"
                  >
                    <option value="session">Session & Meeting</option>
                    <option value="booking">Booking Problems</option>
                    <option value="payment">Payment & Payout</option>
                    <option value="dashboard">Dashboard Errors</option>
                  </select>
                </div>
                <div className="w-full md:w-[50%]">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Which Experience
                  </label>
                  <select
                    name="selectedExperience"
                    value={contactDetails.selectedExperience}
                    onChange={handleChange}
                    className="w-full h-[3rem] px-4 py-2.5 rounded-lg outline-none bg-[#F8FAFC] border border-gray-300"
                  >
                    <option value="">Select an experience</option>
                    <option value="exp1">Experience 1</option>
                    <option value="exp2">Experience 2</option>
                    <option value="exp3">Experience 3</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Priority Level */}
              <div className="flex flex-col items-start justify-center">
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  Priority Level
                </label>
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["Low", "Medium", "Critical"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setContactDetails({ ...contactDetails, priorityLevel: level.toLowerCase() })}
                      className={`px-4 py-3 rounded-lg font-medium transition ${
                        contactDetails.priorityLevel === level.toLowerCase()
                          ? "bg-[#0094CA] text-white border-2 border-[#0094CA]"
                          : "bg-[#F8FAFC] text-gray-900 border-2 border-gray-300 hover:border-[#0094CA]"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={contactDetails.description}
                  onChange={handleChange}
                  placeholder="Describe your technical issue in detail"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA] resize-none bg-[#F8FAFC] border border-gray-300"
                  required
                />
              </div>

              {/* Row 4: Attachments */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Attachments <span className="text-[#5f5e5e]">(Optional)</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-lg p-8 cursor-pointer transition ${
                    dragActive
                      ? "border-[#0094CA] bg-blue-50"
                      : "border-gray-300 bg-[#F8FAFC] hover:border-[#0094CA]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".svg,.png,.jpg,.jpeg,.pdf"
                    className="hidden"
                  />
                  <img src="/assets/support/upload.svg" alt="Upload button" className="w-12 h-12" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-600">SVG, PNG, JPG or PDF (max. 10MB)</p>
                  </div>
                  {contactDetails.attachments && (
                    <p className="text-xs text-green-600 font-medium">{contactDetails.attachments.name}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className="flex-1 px-6 py-3 bg-[#0094CA] text-white font-semibold rounded-lg hover:bg-[#007dab] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
                <Link
                  href="/support"
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
