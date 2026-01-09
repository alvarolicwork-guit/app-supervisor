import React from 'react';
import { LayoutDashboard, Building2, Calendar, ShieldAlert, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    activeTab: 'resumen' | 'unidades' | 'extra' | 'mop';
    setActiveTab: (tab: 'resumen' | 'unidades' | 'extra' | 'mop') => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const router = useRouter();

    return (
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Supervisor AI</h1>
                <p className="text-xs text-blue-500 font-medium mt-1">Novedades Policiales v3.0</p>
            </div>

            <nav className="p-4 space-y-2 flex-1">
                <NavButton
                    active={activeTab === 'resumen'}
                    onClick={() => setActiveTab('resumen')}
                    icon={<LayoutDashboard size={20} />}
                    label="Panel General"
                />
                <div className="pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider pl-3">
                    Áreas Operativas
                </div>
                <NavButton
                    active={activeTab === 'unidades'}
                    onClick={() => setActiveTab('unidades')}
                    icon={<Building2 size={20} />}
                    label="Unidades e Instalaciones"
                />
                <NavButton
                    active={activeTab === 'extra'}
                    onClick={() => setActiveTab('extra')}
                    icon={<Calendar size={20} />}
                    label="Servicios Extraordinarios"
                />
                <NavButton
                    active={activeTab === 'mop'}
                    onClick={() => setActiveTab('mop')}
                    icon={<ShieldAlert size={20} />}
                    label="Operativos MOP"
                />
            </nav>

            <div className="p-4 border-t bg-gray-50">
                <button
                    onClick={() => router.push('/')} // Assuming '/' is the login or home page to exit
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                    <LogOut size={18} />
                    Salir del Turno
                </button>
            </div>
        </aside>
    );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 transform translate-x-1'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
