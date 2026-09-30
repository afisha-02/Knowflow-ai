import React from 'react';
import { Settings, Sliders, Cpu, Sun, Moon, RotateCcw, Server, Cloud, Zap } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AppSettings } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const { theme, setTheme } = useTheme();

  const handleReset = () => {
    onUpdateSettings({
      theme: 'dark',
      provider: 'openrouter',
      model: 'liquid/lfm-2.5-2.6b:free',
      ollama_url: 'http://127.0.0.1:11434',
      ollama_model: 'llama3.2',
      top_k: 4,
      temperature: 0.2,
      showScores: true,
    });
    setTheme('dark');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span>System & Model Preferences</span>
        </div>
      }
      description="Configure your multi-provider RAG architecture, retrieval depth, and local synthesis fallback."
    >
      <div className="space-y-6">
        {/* Inference Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            AI Inference Engine
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* OpenRouter Cloud */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, provider: 'openrouter' })}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                settings.provider === 'openrouter'
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 ring-1 ring-brand-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-4 h-4 text-sky-500" />
                <span className="font-semibold text-xs">OpenRouter Cloud</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                High-performance frontier models via OpenRouter.
              </p>
            </button>

            {/* Ollama Local */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, provider: 'ollama' })}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                settings.provider === 'ollama'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-xs">Ollama Local</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                100% private local LLM running on your device.
              </p>
            </button>

            {/* Local Synthesizer */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, provider: 'local' })}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                settings.provider === 'local'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-xs">Local RAG Engine</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Instant offline synthesis directly from ChromaDB.
              </p>
            </button>
          </div>
        </div>

        {/* Conditional Provider Settings */}
        {settings.provider === 'openrouter' && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-500" />
                <span>OpenRouter Model</span>
              </span>
              <span className="text-[10px] text-emerald-500 font-mono">Active Key Configured</span>
            </label>
            <select
              value={settings.model}
              onChange={(e) => onUpdateSettings({ ...settings, model: e.target.value })}
              className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
            >
              <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free">
                nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free (Recommended Free)
              </option>
              <option value="liquid/lfm-2.5-2.6b:free">liquid/lfm-2.5-2.6b:free (Free Fallback)</option>
              <option value="qwen/qwen3.8-27b:free">qwen/qwen3.8-27b:free (Free)</option>
              <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
              <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001</option>
              <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
            </select>
          </div>
        )}

        {settings.provider === 'ollama' && (
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Ollama Endpoint URL
              </label>
              <input
                type="text"
                value={settings.ollama_url || 'http://127.0.0.1:11434'}
                onChange={(e) => onUpdateSettings({ ...settings, ollama_url: e.target.value })}
                placeholder="http://127.0.0.1:11434"
                className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Ollama Model Name
              </label>
              <input
                type="text"
                value={settings.ollama_model || 'llama3.2'}
                onChange={(e) => onUpdateSettings({ ...settings, ollama_model: e.target.value })}
                placeholder="llama3.2, mistral, deepseek-r1:8b"
                className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Ensure Ollama is running (`ollama serve`). If unreachable, KnowFlow AI automatically falls back to the Local RAG Engine.
              </p>
            </div>
          </div>
        )}

        {settings.provider === 'local' && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
            <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Zero-Dependency Offline Synthesis
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Synthesizes grounded answers directly from ChromaDB semantic search chunks. Requires zero cloud APIs, zero external daemons, and zero tokens.
            </p>
          </div>
        )}

        {/* Top-K Retrieval Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-brand-500" />
              <span>Retrieval Depth (Top-K Chunks)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 font-mono text-xs">
              {settings.top_k} chunks
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            value={settings.top_k}
            onChange={(e) => onUpdateSettings({ ...settings, top_k: parseInt(e.target.value, 10) })}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>2 (Concise & Strict)</span>
            <span>8 (Comprehensive Context)</span>
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
            <span>Temperature (Determinism vs Creativity)</span>
            <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 font-mono text-xs">
              {settings.temperature}
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })}
            className="w-full accent-brand-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0.0 (Strict Grounding)</span>
            <span>1.0 (Exploratory)</span>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            Interface Theme
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-brand-500 bg-brand-50/50 text-brand-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-brand-500 bg-brand-950/40 text-brand-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <Button onClick={onClose} size="sm">
            Save & Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
