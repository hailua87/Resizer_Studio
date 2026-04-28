import { motion } from 'motion/react';
import { Minimize2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'pdf' | 'resize';
  onTabChange: (tab: 'pdf' | 'resize') => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <nav className="h-16 border-b border-surface-200 bg-white flex items-center justify-between px-8 shrink-0 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-brand-200 shadow-lg">
          <Minimize2 className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-surface-900 text-lg tracking-tight font-[Outfit]">Resizer Studio</span>
      </div>

      <div className="flex items-center relative">
        <div className="flex bg-surface-50 rounded-xl p-1 border border-surface-100 gap-1">
          {[
            { id: 'pdf' as const, label: 'PDF → Ảnh' },
            { id: 'resize' as const, label: 'Resize Ảnh' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-brand-700'
                  : 'text-surface-400 hover:text-surface-600'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm ring-1 ring-surface-200"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-surface-400">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Client-side only
      </div>
    </nav>
  );
}
