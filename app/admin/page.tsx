"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Shield, Zap, User, ArrowUpDown, Rocket, Coffee, UserPlus, Lock, Mail, Users, BarChart3, Ghost, TrendingUp, Crown, Calendar, Globe, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ReportViewProps } from "../dashboard/ReportView";

const ReportView = dynamic(() => import("../dashboard/ReportView"), {
    ssr: false,
    loading: () => (
        <div className="h-96 flex items-center justify-center bg-card rounded-3xl border border-border-dim animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        </div>
    )
});

interface AdminUser {
    user_id: string;
    plan: string;
    audits_used: number;
    token_limit: number;
    last_active: string;
    total_scans: number;
    first_name: string;
    last_name: string;
    email: string;
    image_url: string;
    last_ip?: string;
    role?: 'user' | 'admin' | 'super_admin';
    permissions?: string[];
    plan_expires_at?: string;
}

interface AuditRecord {
    id: string;
    ui_title: string;
    created_at: string;
    score: number;
    framework: string;
    image_url: string;
    analysis?: any; // Added analysis field
}

interface DashboardStats {
    totalUsers: number;
    totalAudits: number;
    guestAudits: number;
    auditsToday: number;
    proUsers: number;
    newUsersMonth: number;
}

interface GuestAudit {
    ip: string;
    auditCount: number;
    lastAudit: string;
    firstAudit: string;
    frameworks: string[];
}

interface AllAudit {
    id: string;
    title: string;
    imageUrl: string;
    framework: string;
    createdAt: string;
    ip: string;
    score: number;
    isGuest: boolean;
    user: { id: string; name: string; email: string } | null;
    analysis?: any;
}

type TabType = 'users' | 'guests' | 'audits';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Guest audits state
    const [guestAudits, setGuestAudits] = useState<GuestAudit[]>([]);
    const [guestPage, setGuestPage] = useState(1);
    const [guestTotalPages, setGuestTotalPages] = useState(1);
    const [guestLoading, setGuestLoading] = useState(false);

    // All audits state
    const [allAudits, setAllAudits] = useState<AllAudit[]>([]);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditSearch, setAuditSearch] = useState("");
    const [auditFilter, setAuditFilter] = useState<'all' | 'user' | 'guest'>('all');

    // Existing state
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminUser; direction: 'asc' | 'desc' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userAudits, setUserAudits] = useState<AuditRecord[]>([]);
    const [auditsLoading, setAuditsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchType, setSearchType] = useState<'id' | 'email'>('id');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
    });
    const [expiryDate, setExpiryDate] = useState("");
    const [viewingAudit, setViewingAudit] = useState<AuditRecord | null>(null); // State for Report Viewer

    // IP Location State
    const [ipModalOpen, setIpModalOpen] = useState(false);
    const [ipDetails, setIpDetails] = useState<any>(null);
    const [ipLoading, setIpLoading] = useState(false);

    const handleIpClick = async (ip: string) => {
        if (!ip) return;

        // Reset state
        setIpModalOpen(true);
        setIpLoading(true);
        setIpDetails(null);

        try {
            const response = await fetch(`/api/admin/ip-lookup?ip=${ip}`);
            const data = await response.json();

            if (data.error) {
                setIpDetails({ error: true, message: data.message || "Failed to locate IP", ip });
            } else {
                setIpDetails(data);
            }
        } catch (err) {
            console.error("IP Fetch Error", err);
            setIpDetails({ error: true, message: "Failed to fetch IP location.", ip });
        } finally {
            setIpLoading(false);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            if (selectedUser.plan_expires_at) {
                const date = new Date(selectedUser.plan_expires_at);
                // Convert to local time string for input
                const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                setExpiryDate(localDate.toISOString().slice(0, 16));
            } else {
                setExpiryDate("");
            }

            // FETCH AUDITS
            fetchUserAudits(selectedUser.user_id);
        }
    }, [selectedUser]);

    const fetchUserAudits = async (userId: string) => {
        setAuditsLoading(true);
        try {
            const res = await fetch(`/api/admin/audits?userId=${userId}`);
            const data = await res.json();
            if (data.audits) setUserAudits(data.audits);
            else setUserAudits([]);
        } catch (e) {
            console.error(e);
        } finally {
            setAuditsLoading(false);
        }
    };

    const fetchUsers = (email?: string) => {
        setLoading(true);
        const url = email ? `/api/admin/users?email=${encodeURIComponent(email)}` : "/api/admin/users";
        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                if (data.users) setUsers(data.users);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await fetch("/api/admin/stats");
            const data = await res.json();
            if (data.stats) setStats(data.stats);
        } catch (e) {
            console.error(e);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchGuestAudits = async (page = 1) => {
        setGuestLoading(true);
        try {
            const res = await fetch(`/api/admin/guest-audits?page=${page}&limit=15`);
            const data = await res.json();
            if (data.guests) setGuestAudits(data.guests);
            if (data.pagination) {
                setGuestPage(data.pagination.page);
                setGuestTotalPages(data.pagination.totalPages);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGuestLoading(false);
        }
    };

    const fetchAllAudits = async (page = 1, search = "", type = "all") => {
        setAuditLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "15", type });
            if (search) params.append("search", search);
            const res = await fetch(`/api/admin/all-audits?${params}`);
            const data = await res.json();
            if (data.audits) setAllAudits(data.audits);
            if (data.pagination) {
                setAuditPage(data.pagination.page);
                setAuditTotalPages(data.pagination.totalPages);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);

    const filteredUsers = users.filter((u) =>
        u.user_id.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const aVal = a[key] ?? '';
        const bVal = b[key] ?? '';
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof AdminUser) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredUsers.map(u => u.user_id));
            setSelectedUserIds(allIds);
            setIsAllSelected(true);
        } else {
            setSelectedUserIds(new Set());
            setIsAllSelected(false);
        }
    };

    const handleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
        setIsAllSelected(newSelected.size === filteredUsers.length);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedUserIds.size} users? This action cannot be undone.`)) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "DELETE",
                body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                alert("Users deleted successfully.");
                fetchUsers(); // Refresh
                setSelectedUserIds(new Set());
                setIsAllSelected(false);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete users.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting users.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateAccess = async (role: string, permissions: string[]) => {
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/manage-user", {
                method: "POST",
                body: JSON.stringify({ userId: selectedUser?.user_id, action: "update-access", role, permissions }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(prev => prev.map(u => u.user_id === selectedUser?.user_id ? { ...u, role: data.role, permissions: data.permissions } : u));
                if (selectedUser) setSelectedUser({ ...selectedUser, role: data.role, permissions: data.permissions });
                alert("Access updated.");
            } else {
                alert("Failed to update access.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating access");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateExpiry = async (userId: string, expiresAt: string) => {
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/manage-user", {
                method: "POST",
                body: JSON.stringify({ userId, action: "update-expiry", expiresAt }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan_expires_at: expiresAt } : u));
                if (selectedUser) setSelectedUser({ ...selectedUser, plan_expires_at: expiresAt });
                alert("Expiration date updated.");
            } else {
                alert("Failed to update expiration.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating expiration.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdatePlan = async (userId: string, plan: string) => {
        if (!confirm(`Are you sure you want to change this user's plan to ${plan}?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/manage-user", {
                method: "POST",
                body: JSON.stringify({ userId, action: "update-plan", plan }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                // Update local state
                setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan } : u));
                if (selectedUser) setSelectedUser({ ...selectedUser, plan });
                alert(`User plan updated to ${plan}.`);
            } else {
                alert("Failed to update user.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating user.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/manage-user", {
                method: "POST",
                body: JSON.stringify({ ...newUserForm, action: "create-user" }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                alert("User created successfully (Verified).");
                setShowCreateModal(false);
                setNewUserForm({ email: "", password: "", firstName: "", lastName: "" });
                fetchUsers(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create user.");
            }
        } catch (err) {
            console.error(err);
            alert("Error creating user.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Dashboard */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
                {[
                    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "indigo", delay: 0 },
                    { label: "Total Audits", value: stats?.totalAudits || 0, icon: BarChart3, color: "emerald", delay: 0.1 },
                    { label: "Guest Audits", value: stats?.guestAudits || 0, icon: Ghost, color: "purple", delay: 0.2 },
                    { label: "Today", value: stats?.auditsToday || 0, icon: TrendingUp, color: "amber", delay: 0.3 },
                    { label: "Pro Users", value: stats?.proUsers || 0, icon: Crown, color: "blue", delay: 0.4 },
                    { label: "New This Month", value: stats?.newUsersMonth || 0, icon: Calendar, color: "rose", delay: 0.5 },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: stat.delay, duration: 0.3 }}
                        className={`bg-card border border-border-dim rounded-xl p-4 hover:border-${stat.color}-500/30 transition-all hover:shadow-lg hover:shadow-${stat.color}-500/5 group cursor-default`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-foreground">
                                    {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value.toLocaleString()}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-text">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground mb-2 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-accent-primary" />
                        Admin Console
                    </h1>
                    <p className="text-muted-text font-medium">Manage users, track activity, and monitor audits.</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 p-1 bg-card border border-border-dim rounded-xl">
                    {[
                        { id: 'users' as TabType, label: 'Users', icon: Users },
                        { id: 'guests' as TabType, label: 'Guest Activity', icon: Ghost },
                        { id: 'audits' as TabType, label: 'All Audits', icon: Eye },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'guests' && guestAudits.length === 0) fetchGuestAudits();
                                if (tab.id === 'audits' && allAudits.length === 0) fetchAllAudits();
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                ? "bg-accent-primary text-white shadow-lg"
                                : "text-muted-text hover:text-foreground hover:bg-foreground/5"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Tab Header */}
            {activeTab === 'users' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 items-center justify-end"
                >
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-accent-primary hover:bg-accent-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-accent-primary/20"
                        >
                            <UserPlus className="w-4 h-4" />
                            Create User
                        </button>
                        <div className="relative group">
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value as 'id' | 'email')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-transparent text-xs text-muted-text border-none focus:ring-0 cursor-pointer hover:text-foreground transition-colors font-bold"
                            >
                                <option value="id">ID/Name</option>
                                <option value="email">Email</option>
                            </select>
                            <input
                                type="text"
                                placeholder={searchType === 'id' ? "Search Name/ID..." : "Search Email..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchType === 'email') {
                                        fetchUsers(search);
                                    }
                                }}
                                className="pl-24 pr-10 py-2.5 bg-card border border-border-dim rounded-xl text-sm focus:outline-none focus:border-accent-primary w-80 text-foreground placeholder:text-muted-text/50 shadow-sm transition-all focus:ring-2 focus:ring-accent-primary/20"
                            />
                            {searchType === 'email' && (
                                <button
                                    onClick={() => fetchUsers(search)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-foreground/5 rounded-md text-muted-text hover:text-accent-primary transition-all font-bold text-[10px]"
                                >
                                    GO
                                </button>
                            )}
                            {searchType === 'id' && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* USERS TAB CONTENT */}
            {activeTab === 'users' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {selectedUserIds.size > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-4">
                            <span className="font-bold text-sm">{selectedUserIds.size} users selected</span>
                            <div className="h-4 w-px bg-white/20" />
                            <button
                                onClick={handleBulkDelete}
                                disabled={actionLoading}
                                className="font-bold text-sm hover:text-indigo-200 transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Delete Selected
                            </button>
                            <button
                                onClick={() => { setSelectedUserIds(new Set()); setIsAllSelected(false); }}
                                className="p-1 hover:bg-white/10 rounded-full"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="bg-card border border-border-dim rounded-xl overflow-hidden shadow-xl">
                        <table className="w-full text-left bg-transparent">
                            <thead>
                                <tr className="bg-foreground/5 border-b border-border-dim text-xs uppercase tracking-wider text-muted-text">
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            className="rounded border-border-dim bg-background text-accent-primary focus:ring-0 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('first_name')}>User</th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('plan')}>Plan</th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('audits_used')}>Monthly Usage</th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('total_scans')}>Lifetime Scans</th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('last_ip')}>Last IP</th>
                                    <th className="px-6 py-4 font-bold text-right cursor-pointer hover:text-accent-primary transition-colors" onClick={() => handleSort('last_active')}>Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {sortedUsers.map((user) => (
                                    <tr
                                        key={user.user_id}
                                        className="hover:bg-foreground/[0.03] transition-colors cursor-pointer border-t border-border-dim/50"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.has(user.user_id)}
                                                onChange={() => handleSelectUser(user.user_id)}
                                                className="rounded border-border-dim bg-background text-accent-primary focus:ring-0 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-text overflow-hidden">
                                                    {user.image_url ? <img src={user.image_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{user.first_name} {user.last_name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                    <p className="font-mono text-[10px] text-slate-600 truncate w-32" title={user.user_id}>
                                                        {user.user_id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.plan === "pro" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                                                    <SparklesIcon className="w-3 h-3" /> Pro
                                                </span>
                                            ) : user.plan === "enterprise" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                                                    <Shield className="w-3 h-3" /> Enterprise
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-bold">
                                                    Free
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 w-32">
                                                <div className="flex justify-between text-[10px] font-bold text-muted-text uppercase tracking-wider">
                                                    <span>{user.audits_used}</span>
                                                    <span>{user.plan === 'free' ? 'Unlimited' : user.plan === 'pro' ? 'Unlimited' : '∞'}</span>
                                                </div>
                                                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${user.plan === 'pro' || user.plan === 'enterprise' ? 'bg-indigo-500' : 'bg-slate-500'}`}
                                                        style={{ width: `${Math.min((user.audits_used / 100) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-foreground font-bold">
                                                <Zap className="w-4 h-4 text-amber-500" />
                                                {user.total_scans}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-text">
                                            {user.last_ip ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleIpClick(user.last_ip!);
                                                    }}
                                                    className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline text-left"
                                                >
                                                    {user.last_ip}
                                                </button>
                                            ) : (
                                                "Unknown"
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {user.last_active ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {new Date(user.last_active).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] text-muted-text font-mono">
                                                        {new Date(user.last_active).toLocaleTimeString()}
                                                    </span>
                                                    <span className="text-[10px] text-indigo-400 mt-0.5">
                                                        {(() => {
                                                            const diff = Date.now() - new Date(user.last_active).getTime();
                                                            const mins = Math.floor(diff / 60000);
                                                            const hours = Math.floor(diff / 3600000);
                                                            const days = Math.floor(diff / 86400000);
                                                            if (mins < 1) return "Just now";
                                                            if (mins < 60) return `${mins}m ago`;
                                                            if (hours < 24) return `${hours}h ago`;
                                                            if (days < 30) return `${days}d ago`;
                                                            return `${Math.floor(days / 30)}mo ago`;
                                                        })()}
                                                    </span>
                                                </div>
                                            ) : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                No users found matching your search.
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* GUEST ACTIVITY TAB */}
            {activeTab === 'guests' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="bg-card border border-border-dim rounded-xl overflow-hidden shadow-xl">
                        <table className="w-full text-left bg-transparent">
                            <thead>
                                <tr className="bg-foreground/5 border-b border-border-dim text-xs uppercase tracking-wider text-muted-text">
                                    <th className="px-6 py-4 font-bold">IP Address</th>
                                    <th className="px-6 py-4 font-bold">Total Audits</th>
                                    <th className="px-6 py-4 font-bold">Frameworks Used</th>
                                    <th className="px-6 py-4 font-bold">First Seen</th>
                                    <th className="px-6 py-4 font-bold text-right">Last Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {guestLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-text">Loading guest data...</td></tr>
                                ) : guestAudits.map((guest, idx) => (
                                    <tr key={idx} className="hover:bg-foreground/[0.03] transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            <button
                                                onClick={() => handleIpClick(guest.ip)}
                                                className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold"
                                            >
                                                {guest.ip}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-bold">{guest.auditCount}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {guest.frameworks.map(fw => (
                                                    <span key={fw} className="text-[10px] bg-foreground/10 px-1.5 py-0.5 rounded capitalize">{fw}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">
                                                    {new Date(guest.firstAudit).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-muted-text font-mono">
                                                    {new Date(guest.firstAudit).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-foreground">
                                                    {new Date(guest.lastAudit).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-muted-text font-mono">
                                                    {new Date(guest.lastAudit).toLocaleTimeString()}
                                                </span>
                                                <span className="text-[10px] text-indigo-400 mt-0.5">
                                                    {(() => {
                                                        const diff = Date.now() - new Date(guest.lastAudit).getTime();
                                                        const mins = Math.floor(diff / 60000);
                                                        const hours = Math.floor(diff / 3600000);
                                                        const days = Math.floor(diff / 86400000);
                                                        if (mins < 1) return "Just now";
                                                        if (mins < 60) return `${mins}m ago`;
                                                        if (hours < 24) return `${hours}h ago`;
                                                        if (days < 30) return `${days}d ago`;
                                                        return `${Math.floor(days / 30)}mo ago`;
                                                    })()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="p-4 border-t border-border-dim flex justify-between items-center bg-foreground/[0.02]">
                            <button
                                disabled={guestPage === 1 || guestLoading}
                                onClick={() => fetchGuestAudits(guestPage - 1)}
                                className="p-2 hover:bg-foreground/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-muted-text">Page {guestPage} of {guestTotalPages}</span>
                            <button
                                disabled={guestPage === guestTotalPages || guestLoading}
                                onClick={() => fetchGuestAudits(guestPage + 1)}
                                className="p-2 hover:bg-foreground/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ALL AUDITS TROWSER TAB */}
            {activeTab === 'audits' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="mb-4 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                            <input
                                type="text"
                                placeholder="Search by audit title..."
                                value={auditSearch}
                                onChange={(e) => setAuditSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchAllAudits(1, auditSearch, auditFilter)}
                                className="w-full pl-9 pr-3 py-2.5 bg-card border border-border-dim rounded-xl text-sm focus:outline-none focus:border-accent-primary"
                            />
                        </div>
                        <select
                            value={auditFilter}
                            onChange={(e) => {
                                setAuditFilter(e.target.value as any);
                                fetchAllAudits(1, auditSearch, e.target.value);
                            }}
                            className="bg-card border border-border-dim rounded-xl px-4 text-sm font-bold text-muted-text focus:outline-none focus:border-accent-primary"
                        >
                            <option value="all">All Users</option>
                            <option value="user">Registered</option>
                            <option value="guest">Guests</option>
                        </select>
                        <button
                            onClick={() => fetchAllAudits(1, auditSearch, auditFilter)}
                            className="bg-accent-primary text-white px-6 rounded-xl font-bold text-sm"
                        >
                            Search
                        </button>
                    </div>

                    <div className="bg-card border border-border-dim rounded-xl overflow-hidden shadow-xl">
                        <table className="w-full text-left bg-transparent">
                            <thead>
                                <tr className="bg-foreground/5 border-b border-border-dim text-xs uppercase tracking-wider text-muted-text">
                                    <th className="px-6 py-4 font-bold">Audit</th>
                                    <th className="px-6 py-4 font-bold">User</th>
                                    <th className="px-6 py-4 font-bold">Score</th>
                                    <th className="px-6 py-4 font-bold">Framework</th>
                                    <th className="px-6 py-4 font-bold text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {auditLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-text">Loading audits...</td></tr>
                                ) : allAudits.map((audit) => (
                                    <tr key={audit.id} className="hover:bg-foreground/[0.03] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-muted/20 overflow-hidden shrink-0 border border-border-dim">
                                                    {audit.imageUrl && <img src={audit.imageUrl} className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="font-bold text-sm text-foreground truncate max-w-[200px]">{audit.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {audit.user ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px] font-bold">
                                                        {audit.user.name[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-foreground">{audit.user.name}</span>
                                                        <span className="text-[10px] text-muted-text">{audit.user.email}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-500/10 text-slate-500 flex items-center justify-center">
                                                        <Ghost className="w-3 h-3" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-muted-text">Guest User</span>
                                                        <button
                                                            onClick={() => handleIpClick(audit.ip)}
                                                            className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline text-left"
                                                        >
                                                            {audit.ip}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${audit.score >= 80 ? 'bg-green-500/10 text-green-400' :
                                                audit.score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>
                                                {audit.score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs capitalize text-muted-text bg-foreground/5 px-2 py-1 rounded">{audit.framework}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-text text-right font-mono">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs text-muted-text font-mono">{new Date(audit.createdAt).toLocaleDateString()}</span>
                                                <button
                                                    onClick={() => setViewingAudit({
                                                        id: audit.id,
                                                        ui_title: audit.title,
                                                        created_at: audit.createdAt,
                                                        score: audit.score,
                                                        framework: audit.framework,
                                                        image_url: audit.imageUrl,
                                                        analysis: audit.analysis
                                                    })}
                                                    className="flex items-center gap-1 text-accent-primary hover:text-white transition-colors font-bold uppercase tracking-wider bg-accent-primary/5 hover:bg-accent-primary px-2 py-0.5 rounded text-[10px]"
                                                >
                                                    <Eye className="w-3 h-3" /> View Report
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="p-4 border-t border-border-dim flex justify-between items-center bg-foreground/[0.02]">
                            <button
                                disabled={auditPage === 1 || auditLoading}
                                onClick={() => fetchAllAudits(auditPage - 1, auditSearch, auditFilter)}
                                className="p-2 hover:bg-foreground/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-muted-text">Page {auditPage} of {auditTotalPages}</span>
                            <button
                                disabled={auditPage === auditTotalPages || auditLoading}
                                onClick={() => fetchAllAudits(auditPage + 1, auditSearch, auditFilter)}
                                className="p-2 hover:bg-foreground/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* User Detail Modal */}
            {
                selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
                        <div className="bg-card border border-border-dim rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-border-dim flex justify-between items-start bg-background/50 sticky top-0 backdrop-blur-md z-10">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-full bg-background overflow-hidden border-2 border-border-dim relative">
                                        {selectedUser.image_url ? <img src={selectedUser.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-accent-primary/10 text-accent-primary"><User className="w-8 h-8" /></div>}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">{selectedUser.first_name} {selectedUser.last_name}</h2>
                                        <p className="text-muted-text">{selectedUser.email}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="inline-block px-2 py-0.5 bg-foreground/10 rounded text-xs font-mono text-muted-text">{selectedUser.user_id}</span>
                                            <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs font-mono border border-blue-500/20" title="Last Known IP">{selectedUser.last_ip || "IP Unknown"}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="text-muted-text hover:text-foreground">✕</button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">

                                {/* Plan & Stats */}
                                <div className="space-y-6">
                                    <div className="bg-foreground/5 p-4 rounded-xl border border-border-dim">
                                        <h3 className="text-xs uppercase font-bold text-muted-text mb-2">Usage Plan</h3>
                                        <div className="text-xl font-bold capitalize text-foreground">{selectedUser.plan === 'agency' ? 'Design Studio' : selectedUser.plan === 'free' ? 'Starter' : selectedUser.plan} Tier</div>
                                        <div className="text-sm text-muted-text mt-1">Audit Limit: {selectedUser.plan === 'free' ? '3' : selectedUser.plan === 'pro' ? '60' : 'Unlimited'}</div>
                                        {selectedUser.plan !== 'free' && (
                                            <div className="mt-4 pt-4 border-t border-border-dim">
                                                <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Expires At</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="datetime-local"
                                                        className="bg-background border border-border-dim rounded px-2 py-1 text-xs text-foreground w-full focus:outline-none focus:border-accent-primary transition-colors"
                                                        value={expiryDate}
                                                        onChange={(e) => setExpiryDate(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateExpiry(selectedUser.user_id, new Date(expiryDate).toISOString())}
                                                        className="bg-accent-primary hover:bg-accent-primary/90 text-white text-xs px-3 py-1 rounded font-bold transition-colors"
                                                        disabled={actionLoading}
                                                    >
                                                        Set
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-foreground/5 p-4 rounded-xl border border-border-dim">
                                        <h3 className="text-xs uppercase font-bold text-muted-text mb-2">Activity</h3>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-muted-text text-sm">Monthly Audits</span>
                                            <span className="text-foreground font-bold">{selectedUser.audits_used}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-text text-sm">Total Lifetime</span>
                                            <span className="text-amber-500 font-bold">{selectedUser.total_scans}</span>
                                        </div>
                                    </div>

                                    <div className="bg-foreground/5 p-4 rounded-xl border border-border-dim">
                                        <h3 className="text-xs uppercase font-bold text-muted-text mb-4">Manage Access</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'free', label: 'Starter (Free)' },
                                                { id: 'pro', label: 'Pro' },
                                                { id: 'enterprise', label: 'Enterprise' }
                                            ].map((planOpt) => (
                                                <button
                                                    key={planOpt.id}
                                                    onClick={() => handleUpdatePlan(selectedUser.user_id, planOpt.id)}
                                                    disabled={actionLoading || selectedUser.plan === planOpt.id}
                                                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedUser.plan === planOpt.id
                                                        ? "bg-accent-primary border-accent-primary text-white cursor-default shadow-lg shadow-accent-primary/25"
                                                        : "bg-background border-border-dim text-muted-text hover:border-accent-primary/50 hover:text-foreground"
                                                        } disabled:opacity-50`}
                                                >
                                                    {planOpt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Audit History & RBAC */}
                                <div className="space-y-6">
                                    <div className="bg-foreground/5 p-4 rounded-xl border border-border-dim h-full max-h-[400px] overflow-y-auto">
                                        <h3 className="text-xs uppercase font-bold text-muted-text mb-4 sticky top-0 bg-transparent flex justify-between items-center">
                                            <span>Recent Audits</span>
                                            {auditsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </h3>

                                        {userAudits.length === 0 && !auditsLoading ? (
                                            <p className="text-sm text-muted-text italic">No audits found for this user.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {userAudits.map((audit) => (
                                                    <div key={audit.id} className="flex gap-3 items-center p-2 rounded-lg bg-background/40 hover:bg-background border border-border-dim transition-all group">
                                                        <div className="w-12 h-12 rounded bg-black/20 overflow-hidden flex-shrink-0 border border-border-dim/50">
                                                            {audit.image_url && <img src={audit.image_url} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <h4 className="text-sm font-bold text-foreground truncate">{audit.ui_title || "Untitled"}</h4>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${audit.score >= 80 ? 'bg-green-500/10 text-green-400' :
                                                                    audit.score >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                                                    }`}>{audit.score}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] text-muted-text">
                                                                <span>{new Date(audit.created_at).toLocaleDateString()}</span>
                                                                <button
                                                                    onClick={() => setViewingAudit(audit)}
                                                                    className="flex items-center gap-1 text-accent-primary hover:text-white transition-colors font-bold uppercase tracking-wider bg-accent-primary/5 hover:bg-accent-primary px-2 py-0.5 rounded"
                                                                >
                                                                    <Eye className="w-3 h-3" /> View Report
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-foreground/5 p-4 rounded-xl border border-border-dim">
                                        <h3 className="text-xs uppercase font-bold text-muted-text mb-4">RBAC</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-xs text-muted-text block mb-2">Role</label>
                                                <select
                                                    value={selectedUser.role || 'user'}
                                                    onChange={(e) => handleUpdateAccess(e.target.value, selectedUser.permissions || [])}
                                                    disabled={actionLoading}
                                                    className="w-full bg-background border border-border-dim rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent-primary"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                            </div>

                                            {(selectedUser.role === 'admin' || selectedUser.role === 'super_admin') && (
                                                <div>
                                                    <label className="text-xs text-muted-text block mb-2">Permissions</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['manage_users', 'delete_users', 'manage_admins'].map(perm => (
                                                            <label key={perm} className="flex items-center gap-2 cursor-pointer group bg-background/50 px-2 py-1 rounded border border-border-dim hover:border-accent-primary/50 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUser.permissions?.includes(perm) || false}
                                                                    onChange={(e) => {
                                                                        const current = selectedUser.permissions || [];
                                                                        const next = e.target.checked
                                                                            ? [...current, perm]
                                                                            : current.filter(p => p !== perm);
                                                                        handleUpdateAccess(selectedUser.role || 'admin', next);
                                                                    }}
                                                                    disabled={actionLoading || selectedUser.role === 'super_admin'}
                                                                    className="rounded border-border-dim bg-background text-accent-primary focus:ring-0"
                                                                />
                                                                <span className="text-[10px] font-bold text-muted-text group-hover:text-foreground transition-colors capitalize">{perm.replace('_', ' ')}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 pb-6 pt-0 border-t border-border-dim mt-6 pt-6">
                                <h3 className="text-xs uppercase font-bold text-muted-text mb-4">Raw Data</h3>
                                <pre className="bg-slate-950 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-40 border border-border-dim">
                                    {JSON.stringify(selectedUser, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowCreateModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card border border-border-dim rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border-dim bg-background/50 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-accent-primary" />
                                    Create New User
                                </h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-muted-text hover:text-foreground transition-colors">✕</button>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-text ml-1">First Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text group-focus-within:text-accent-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                value={newUserForm.firstName}
                                                onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                                                placeholder="John"
                                                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border-dim rounded-xl text-foreground text-sm focus:outline-none focus:border-accent-primary transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-text ml-1">Last Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text group-focus-within:text-accent-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                value={newUserForm.lastName}
                                                onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                                                placeholder="Doe"
                                                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border-dim rounded-xl text-foreground text-sm focus:outline-none focus:border-accent-primary transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-text ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text group-focus-within:text-accent-primary transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={newUserForm.email}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                            placeholder="john@example.com"
                                            className="w-full pl-9 pr-3 py-2.5 bg-background border border-border-dim rounded-xl text-foreground text-sm focus:outline-none focus:border-accent-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-text ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text group-focus-within:text-accent-primary transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={newUserForm.password}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3 py-2.5 bg-background border border-border-dim rounded-xl text-foreground text-sm focus:outline-none focus:border-accent-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full py-3 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Create Verified User
                                    </button>
                                    <p className="text-[10px] text-muted-text text-center mt-3 italic">
                                        This will create a user with <strong>is_verified: true</strong>.
                                        No email will be sent.
                                    </p>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* REPORT VIEWER MODAL - Full Screen Overlay */}
            <AnimatePresence>
                {viewingAudit && viewingAudit.analysis && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl overflow-y-auto"
                    >
                        <div className="max-w-5xl mx-auto p-6">
                            <div className="flex justify-between items-center mb-6 sticky top-0 bg-background/80 backdrop-blur-md py-4 z-10 border-b border-border-dim">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">{viewingAudit.ui_title}</h2>
                                    <p className="text-muted-text font-mono text-xs">RID: {viewingAudit.id}</p>
                                </div>
                                <button
                                    onClick={() => setViewingAudit(null)}
                                    className="px-4 py-2 bg-foreground text-background font-bold rounded-lg hover:opacity-90"
                                >
                                    Close Viewer
                                </button>
                            </div>

                            <ReportView
                                data={viewingAudit.analysis}
                                uiTitle={viewingAudit.ui_title}
                                imageUrl={viewingAudit.image_url}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* IP DETAILS MODAL */}
            <AnimatePresence>
                {ipModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIpModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border-dim rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-border-dim bg-background/50 flex justify-between items-center">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-accent-primary" />
                                    IP Location Details
                                </h3>
                                <button onClick={() => setIpModalOpen(false)} className="text-muted-text hover:text-foreground">✕</button>
                            </div>

                            <div className="p-6">
                                {ipLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
                                        <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Locating Signal...</span>
                                    </div>
                                ) : ipDetails?.error ? (
                                    <div className="text-center py-8 text-muted-text">
                                        <p className="text-red-400 font-bold mb-2">Location Lookup Failed</p>
                                        <p className="text-xs">{ipDetails.message}</p>
                                        <p className="mt-4 font-mono text-xs bg-foreground/10 inline-block px-2 py-1 rounded">{ipDetails.ip}</p>
                                    </div>
                                ) : ipDetails ? (
                                    <div className="space-y-4">
                                        <div className="text-center mb-6">
                                            <div className="inline-block px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full font-mono text-xs font-bold mb-2">
                                                {ipDetails.ip}
                                            </div>
                                            <div className="text-2xl font-black text-foreground">
                                                {ipDetails.city}, {ipDetails.region_code}
                                            </div>
                                            <div className="text-sm text-muted-text font-medium">
                                                {ipDetails.country_name}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="bg-foreground/5 p-3 rounded-lg">
                                                <div className="text-muted-text font-bold uppercase tracking-wider text-[10px] mb-1">ISP</div>
                                                <div className="font-medium text-foreground truncate" title={ipDetails.org}>{ipDetails.org || "Unknown"}</div>
                                            </div>
                                            <div className="bg-foreground/5 p-3 rounded-lg">
                                                <div className="text-muted-text font-bold uppercase tracking-wider text-[10px] mb-1">Timezone</div>
                                                <div className="font-medium text-foreground">{ipDetails.timezone || "UTC"}</div>
                                            </div>
                                            <div className="bg-foreground/5 p-3 rounded-lg">
                                                <div className="text-muted-text font-bold uppercase tracking-wider text-[10px] mb-1">Lat/Long</div>
                                                <div className="font-medium text-foreground">{ipDetails.latitude}, {ipDetails.longitude}</div>
                                            </div>
                                            <div className="bg-foreground/5 p-3 rounded-lg">
                                                <div className="text-muted-text font-bold uppercase tracking-wider text-[10px] mb-1">Postal</div>
                                                <div className="font-medium text-foreground">{ipDetails.postal || "N/A"}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-text">
                                        Could not fetch location data.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
