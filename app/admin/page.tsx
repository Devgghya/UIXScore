"use client";

"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Shield, Zap, User, ArrowUpDown, Rocket, Coffee } from "lucide-react";

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
}

export default function AdminPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminUser; direction: 'asc' | 'desc' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchType, setSearchType] = useState<'id' | 'email'>('id');

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

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter((u) =>
        u.user_id.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof AdminUser) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                    <p className="text-slate-400">Overview of all registered users and their usage.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative group">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value as 'id' | 'email')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-transparent text-xs text-slate-500 border-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
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
                            className="pl-24 pr-10 py-2 bg-[#121214] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-80 text-white"
                        />
                        {searchType === 'email' && (
                            <button
                                onClick={() => fetchUsers(search)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-md text-slate-500 hover:text-indigo-400 transition-all font-bold text-[10px]"
                            >
                                GO
                            </button>
                        )}
                        {searchType === 'id' && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
                    </div>
                </div>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left bg-transparent">
                    <thead>

                        <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('first_name')}>User</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('plan')}>Plan</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('audits_used')}>Monthly Usage</th>
                            <th className="px-6 py-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('total_scans')}>Lifetime Scans</th>
                            <th className="px-6 py-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort('last_active')}>Last Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedUsers.map((user) => (
                            <tr
                                key={user.user_id}
                                className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                                onClick={() => setSelectedUser(user)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden">
                                            {user.image_url ? <img src={user.image_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{user.first_name} {user.last_name}</p>
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
                                    ) : user.plan === "plus" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                                            <Rocket className="w-3 h-3" /> Plus
                                        </span>
                                    ) : user.plan === "lite" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                                            <Coffee className="w-3 h-3" /> Lite
                                        </span>
                                    ) : user.plan === "agency" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">
                                            <Shield className="w-3 h-3" /> Agency
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-bold">
                                            Free
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 w-32">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{user.audits_used}</span>
                                            <span>{user.plan === 'free' ? '2' : user.plan === 'lite' ? '5' : user.plan === 'plus' ? '12' : '∞'}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${user.plan === 'pro' ? 'bg-indigo-500' : 'bg-slate-500'}`}
                                                style={{ width: `${Math.min((user.audits_used / (user.plan === 'free' ? 2 : user.plan === 'lite' ? 5 : user.plan === 'plus' ? 12 : 100)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        {user.total_scans}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-slate-500 font-mono">
                                    {user.last_active ? new Date(user.last_active).toLocaleDateString() : "-"}
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

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#202023]">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden border-2 border-white/10">
                                    {selectedUser.image_url ? <img src={selectedUser.image_url} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedUser.first_name} {selectedUser.last_name}</h2>
                                    <p className="text-slate-400">{selectedUser.email}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-slate-400">{selectedUser.user_id}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Usage Plan</h3>
                                <div className="text-xl font-bold capitalize text-white">{selectedUser.plan} Tier</div>
                                <div className="text-sm text-slate-400 mt-1">Audit Limit: {selectedUser.plan === 'free' ? '2' : selectedUser.plan === 'lite' ? '5' : selectedUser.plan === 'plus' ? '12' : 'Unlimited'}</div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Activity</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-400 text-sm">Monthly Audits</span>
                                    <span className="text-white font-bold">{selectedUser.audits_used}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Total Lifetime</span>
                                    <span className="text-amber-500 font-bold">{selectedUser.total_scans}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4">Manage Access</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                {['free', 'lite', 'plus', 'pro', 'agency'].map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => handleUpdatePlan(selectedUser.user_id, tier)}
                                        disabled={actionLoading || selectedUser.plan === tier}
                                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedUser.plan === tier
                                            ? "bg-white/10 border-white/20 text-white cursor-default"
                                            : "bg-black/40 border-white/5 text-slate-400 hover:border-indigo-500/50 hover:text-white"
                                            } disabled:opacity-50`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-0">
                            <h3 className="text-xs uppercase font-bold text-slate-500 mb-4">Raw Data</h3>
                            <pre className="bg-black text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-40 border border-white/10">
                                {JSON.stringify(selectedUser, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
