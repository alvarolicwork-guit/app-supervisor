import React from 'react';
import { LayoutDashboard, Building2, Calendar, ShieldAlert } from 'lucide-react';

interface MobileTabbarProps {
    activeTab: 'resumen' | 'unidades' | 'extra' | 'mop';
    setActiveTab: (tab: 'resumen' | 'unidades' | 'extra' | 'mop') => void;
}

export function MobileTabbar({ activeTab, setActiveTab }: MobileTabbarProps) {
    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 pb-safe z-50 md:hidden pb-1">
            <div className="flex justify-around items-center px-2 py-2">
                <TabButton
                    active={activeTab === 'resumen'}
                    onClick={() => setActiveTab('resumen')}
                    icon={<LayoutDashboard size={24} />}
                    label="Inicio"
                />
                <TabButton
                    active={activeTab === 'unidades'}
                    onClick={() => setActiveTab('unidades')}
                    icon={<Building2 size={24} />}
                    label="Unidades"
                />
                <TabButton
                    active={activeTab === 'extra'}
                    onClick={() => setActiveTab('extra')}
                    icon={<Calendar size={24} />}
                    label="Extras"
                />
                <TabButton
                    active={activeTab === 'mop'}
                    onClick={() => setActiveTab('mop')}
                    icon={<ShieldAlert size={24} />}
                    label="MOP"
                />
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full ${active ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <div className={`p-1 rounded-full transition-all duration-300 ${active ? 'bg-blue-100' : 'bg-transparent'}`}>
                {icon}
            </div>
            <span className={`text-[10px] font-medium mt-1 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                {label}
            </span>
        </button>
    );
}
