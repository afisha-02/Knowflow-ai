import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  BookOpen,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { DocumentItem, Conversation } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onOpenDocuments: () => void;
  documents: DocumentItem[];
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onSelectDocument: (docId: string) => void;
  onTriggerUpload: () => void;
  onOpenAbout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onNewChat,
  onOpenDocuments,
  documents,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSelectDocument,
  onTriggerUpload,
  onOpenAbout,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [docSearch, setDocSearch] = useState('');

  const handleStartRename = (e: React.MouseEvent, c: Conversation) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const filteredDocs = documents.filter((d) =>
    d.original_name.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <aside
      className={`relative h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070b16] transition-all duration-300 z-10 shrink-0 ${
        isOpen ? 'w-72' : 'w-16'
      }`}
    >
      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xs z-30 transition-transform cursor-pointer"
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Top Action */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-xs transition-all shadow-xs bg-brand-600 hover:bg-brand-700 text-white cursor-pointer ${
            !isOpen ? 'px-0' : 'px-3'
          }`}
          title="New Knowledge Chat"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {isOpen && <span>New Knowledge Chat</span>}
        </button>

        {isOpen && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onOpenDocuments}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-500" />
              <span>Library ({documents.length})</span>
            </button>
            <button
              onClick={onTriggerUpload}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-brand-500" />
              <span>Upload PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Content area: Documents & Chats */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Documents Section */}
        {isOpen && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Documents
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {documents.length} files
              </span>
            </div>

            {/* Document search if multiple docs */}
            {documents.length > 2 && (
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
            )}

            {documents.length === 0 ? (
              <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No documents uploaded
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDocs.slice(0, 6).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc.id)}
                    className="group flex items-center justify-between p-2 rounded-lg text-xs hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer transition-all"
                    title={`Chat with ${doc.original_name}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium text-xs">
                        {doc.original_name}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {doc.status === 'COMPLETED' ? (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          {doc.page_count}p
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3 animate-spin" />
                          {doc.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversations History */}
        <div>
          {isOpen && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent Chats
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {conversations.length}
              </span>
            </div>
          )}

          {conversations.length === 0 ? (
            isOpen && (
              <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No conversations yet
              </div>
            )
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                const isEditing = editingId === c.id;

                if (!isOpen) {
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                          : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                      }`}
                      title={c.title}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  );
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className={`group relative flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 shadow-2xs text-brand-600 dark:text-brand-400 font-semibold'
                        : 'border-transparent hover:bg-white/80 dark:hover:bg-slate-900/60 hover:border-slate-200 dark:hover:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded border border-brand-500 focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{c.title}</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => handleSaveRename(e, c.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-600"
                            title="Save title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleStartRename(e, c)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(c.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80">
        <button
          onClick={onOpenAbout}
          className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="About KnowFlow AI"
        >
          <Info className="w-4 h-4 text-brand-500 shrink-0" />
          {isOpen && <span>About KnowFlow AI</span>}
        </button>
      </div>
    </aside>
  );
};
