import React from 'react';
import {
  Sparkles,
  Layers,
  Settings,
  Sun,
  Moon,
  Menu,
  BookOpen,
  MessageSquare,
  Compass,
  Info,
  Server,
  Zap,
  Cloud
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { DocumentItem } from '../../types';

interface AppHeaderProps {
  currentView: 'chat' | 'documents' | 'landing';
  onViewChange: (view: 'chat' | 'documents' | 'landing') => void;
  selectedScope: string;
  onScopeChange: (scope: string) => void;
  documents: DocumentItem[];
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenMobileMenu: () => void;
  currentModel: string;
  provider: 'openrouter' | 'ollama' | 'local';
  onProviderChange: (provider: 'openrouter' | 'ollama' | 'local') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  onViewChange,
  selectedScope,
  onScopeChange,
  documents,
  onOpenSettings,
  onOpenAbout,
  onOpenMobileMenu,
  currentModel,
  provider,
  onProviderChange,
}) => {
  const { theme, toggleTheme } = useTheme();

  const providerLabels = {
    openrouter: {
      name: 'OpenRouter Cloud',
      short: 'OpenRouter',
      icon: Cloud,
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      dotColor: 'bg-sky-500',
    },
    ollama: {
      name: 'Ollama Local (11434)',
      short: 'Ollama',
      icon: Server,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dotColor: 'bg-emerald-500',
    },
    local: {
      name: 'Local Synthesizer',
      short: 'Local RAG',
      icon: Zap,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      dotColor: 'bg-amber-500',
    },
  };

  const currentProviderInfo = providerLabels[provider] || providerLabels.openrouter;
  const ProviderIcon = currentProviderInfo.icon;

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 glass-header px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 sticky top-0 transition-colors">
      {/* Left section: Logo & Mobile button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => onViewChange('chat')}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                KnowFlow <span className="text-brand-600 dark:text-brand-400">AI</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800">
                PRO RAG
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Multi-Engine Document Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Center section: View switcher tabs & Scope */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center p-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs backdrop-blur-sm">
          <button
            onClick={() => onViewChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'chat'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => onViewChange('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'documents'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-brand-500" />
            <span>Library</span>
            {documents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 text-[10px] font-bold">
                {documents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewChange('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              currentView === 'landing'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-brand-500" />
            <span>Architecture</span>
          </button>
        </div>

        {/* Scope Selector in Header */}
        {currentView === 'chat' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs">
            <Layers className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="text-slate-400 dark:text-slate-500 font-medium">Scope:</span>
            <select
              value={selectedScope}
              onChange={(e) => onScopeChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-900">
                All Documents ({documents.length})
              </option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id} className="bg-white dark:bg-slate-900">
                  {doc.original_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: Provider Switcher, Model Pill, About, Theme, Settings */}
      <div className="flex items-center gap-2">
        {/* Quick Provider Switcher Dropdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-850/90 border border-slate-200/80 dark:border-slate-750 text-xs">
          <span className={`w-2 h-2 rounded-full ${currentProviderInfo.dotColor} animate-pulse`} />
          <ProviderIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as any)}
            className="bg-transparent text-slate-700 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer pr-1"
            title="Switch AI Inference Provider"
          >
            <option value="openrouter" className="bg-white dark:bg-slate-900">
              OpenRouter Cloud
            </option>
            <option value="ollama" className="bg-white dark:bg-slate-900">
              Ollama Local
            </option>
            <option value="local" className="bg-white dark:bg-slate-900">
              Local Synthesizer (Offline)
            </option>
          </select>
        </div>

        {/* Model Pill (Visible on large screens) */}
        {currentModel && provider === 'openrouter' && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-[11px] font-mono border border-slate-200/70 dark:border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="truncate max-w-[120px]">{currentModel.split('/')[1] || currentModel}</span>
          </div>
        )}

        <button
          onClick={onOpenAbout}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="About & Architecture"
        >
          <Info className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
