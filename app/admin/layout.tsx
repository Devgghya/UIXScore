import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "devkulshrestha27@gmail.com").split(",");

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0].emailAddress)) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-indigo-500/30">
            <nav className="border-b border-white/10 bg-[#121214]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">A</div>
                        <span className="font-bold text-lg">Admin Console</span>
                    </div>
                    <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                        Back to App
                    </a>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
