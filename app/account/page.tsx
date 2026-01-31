"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Loader2, User, Save, LogOut, ArrowLeft, CreditCard, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AccountPage() {
    const { user, refresh } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [imageUrl, setImageUrl] = useState(user?.imageUrl || "");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Basic validation
            if (file.size > 5 * 1024 * 1024) {
                setError("Image must be less than 5MB");
                return;
            }

            setUploading(true);
            setError("");

            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload/avatar", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Upload failed");
                }

                const blob = await res.json();
                setImageUrl(blob.url);
                setSuccess("Image uploaded! Click Save Changes to confirm.");
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to upload image. Please try again.");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/user/update", {
                method: "POST",
                body: JSON.stringify({ firstName, lastName, imageUrl }),
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                setSuccess("Profile updated successfully");
                await refresh();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update profile");
            }
        } catch (err) {
            setError("Error updating profile");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm("Are you sure you want to log out?")) return;

        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh(); // Refresh to clear auth state
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 text-white">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6 md:mb-8 flex flex-col gap-3 md:gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs md:text-sm font-medium w-fit group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                Account Settings
                            </h1>
                            <p className="text-slate-400 text-sm md:text-base">Manage your profile and preferences.</p>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#121214] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-xl"
                >
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white/10 transition-colors group-hover:border-indigo-500/50">
                                    {imageUrl || user?.imageUrl ? (
                                        <img src={imageUrl || user?.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-slate-400" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-10">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Profile Photo</label>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload Image
                                    </button>
                                    {imageUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl("")}
                                            className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                />
                                <p className="text-xs text-slate-500 mt-2">Recommended: Square JPG or PNG, max 5MB.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
                            <input
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-[10px] text-slate-600 mt-1">Email address cannot be changed currently.</p>
                        </div>

                        {success && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                                {success}
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/5">
                            <Link
                                href="/account/plan"
                                className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-all group mb-6"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">Current Plan & Usage</div>
                                        <div className="text-xs text-slate-400">View subscription details and limits</div>
                                    </div>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-4 py-2.5 md:py-2 flex items-center justify-center md:justify-start gap-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs md:text-sm font-bold order-2 md:order-1"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 md:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 order-1 md:order-2 text-sm md:text-base"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
