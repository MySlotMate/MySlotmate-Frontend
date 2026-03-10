"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { FiArrowLeft } from "react-icons/fi";

export default function ReportIssuePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    issueType: "behavioral",
    participantName: "",
    description: "",
    date: "",
    evidence: null as File | null,
    reportReason: "",
    isUrgent: false,
  });
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        evidence: file,
      });
      toast.success(`File "${file.name}" uploaded successfully`);
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
      setFormData({
        ...formData,
        evidence: file,
      });
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Report submitted successfully. Our team will review it shortly.");
    setFormData({
      issueType: "behavioral",
      participantName: "",
      description: "",
      date: "",
      evidence: null,
      reportReason: "",
      isUrgent: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e4f8ff] to-white">
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <div className="flex flex-row items-center justify-start gap-2">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-[#717171] font-medium"
          >
            Support & Safety&gt;
          </Link>
          <span className="text-[#000000] text-sm font-medium">Report a participant</span>
        </div>
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
            Report a Participant
          </h1>
          <p className="text-gray-600">
            Your safety is our priority. This report is strictly confidential and will be reviewed by our Trust & Safety team.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issue Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Type of Issue
              </label>
              <select
                name="issueType"
                value={formData.issueType}
                onChange={handleChange}
                className="w-full h-[3rem] px-4 py-2.5 rounded-lg outline-none bg-[#F8FAFC]"
              >
                <option value="behavioral">Behavioral Misconduct</option>
                <option value="harassment">Harassment or Abuse</option>
                <option value="safety">Safety Concern</option>
                <option value="fraud">Fraud or Deception</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="w-full md:w-[50%]">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Session Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  placeholder="Full name of the participant"
                  className="w-full h-[3rem] px-4 py-2.5rounded-lg focus:outline-none bg-[#F8FAFC]"
                  required
                />
              </div>
            {/* Participant Name */} 
              <div className="w-full md:w-[50%]">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Participant's Name
                </label>
                <input
                  type="text"
                  name="participantName"
                  value={formData.participantName}
                  onChange={handleChange}
                  placeholder="Full name of the participant"
                  className="w-full h-[3rem] px-4 py-2.5 bg-[#F8FAFC]"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col items-start justify-center">
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Why are you reporting this person?
              </label>
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                {["Verbal harassment", "Safety concern", "Inappropriate behavior", "Spam or scam"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFormData({ ...formData, reportReason: reason })}
                    className={`px-4 py-3 rounded-lg font-medium transition ${
                      formData.reportReason === reason
                        ? "bg-[#0094CA] text-white border-2 border-[#0094CA]"
                        : "bg-[#F8FAFC] text-gray-900 border-0 border-gray-300 hover:border-[#0094CA]"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide detailed information about what happened"
                rows={5}
                className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA] resize-none bg-[#F8FAFC]"
                required
              />
            </div>

            {/* Evidence */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Supporting Evidence<span className="text-[#5f5e5e]">(Optional)</span>
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
                {formData.evidence && (
                  <p className="text-xs text-green-600 font-medium">{formData.evidence.name}</p>
                )}
              </div>
            </div>
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-row items-start gap-3">
                <img src="/assets/support/warning.svg" alt="warning" className="w-5 h-5 flex-shrink-0 mt-1" />
                <div className="flex flex-col items-start justify-center">
                  <h1 className="font-semibold text-sm md:text-base">This is an urgent safety concern</h1>
                  <p className="text-[#484747] text-xs md:text-sm">
                    Toggle this if there is an immediate risk to you or others. We prioritize urgent reports.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isUrgent: !formData.isUrgent })}
                className={`flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  formData.isUrgent ? "bg-[#0094CA]" : "bg-[#E2E8F0]"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    formData.isUrgent ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {/* Submit Button */}
            <div className="flex flex-col md:flex-row gap-3 pt-4 w-full">
              <p className="text-[#626060] w-full md:w-[60%]">
                <span className="flex flex-row items-center justify-start">
                  <img src="/assets/support/lock.svg" alt="lock" />
                  <h3>Review Process</h3>
                </span><br/>
                We aim to review all reports within 24 hours. If you are in immediate danger, please contact local authorities.
              </p>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-[#0094CA] text-white font-semibold rounded-lg hover:bg-[#007dab] transition w-full md:w-[40%]"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
        
          <p className="text-center">Need help with something else? <a href="/help" className="text-[#0094CA] hover:underline">Visit our help center</a></p>
      </main>
    </div>
  );
}
