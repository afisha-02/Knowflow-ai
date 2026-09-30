import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { EmptyState } from './components/chat/EmptyState';
import { MessageItem } from './components/chat/MessageItem';
import { ChatInput } from './components/chat/ChatInput';
import { CitationModal } from './components/sources/CitationModal';
import { DocumentStudio } from './components/documents/DocumentStudio';
import { UploadProgressModal } from './components/documents/UploadProgressModal';
import { LandingPage } from './components/landing/LandingPage';
import { StudyToolsModal } from './components/study/StudyToolsModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { AboutModal } from './components/common/AboutModal';
import { ToastProvider, useToast } from './components/common/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { DocumentItem, Conversation, Message, SourceCitation, AppSettings } from './types';
import { api } from './services/api';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  provider: 'openrouter',
  model: 'liquid/lfm-2.5-2.6b:free',
  ollama_url: 'http://127.0.0.1:11434',
  ollama_model: 'llama3.2',
  top_k: 4,
  temperature: 0.2,
  showScores: true,
};

const KnowFlowApp: React.FC = () => {
  const { success, error, info } = useToast();

  // Navigation & View State ('chat' | 'documents' | 'landing')
  const [currentView, setCurrentView] = useState<'chat' | 'documents' | 'landing'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>('all');

  // Citations & Lightweight Inspection Modal (No permanent right panel!)
  const [currentSources, setCurrentSources] = useState<SourceCitation[]>([]);
  const [activeCitationModal, setActiveCitationModal] = useState<SourceCitation | null>(null);

  // Safe RAG Status (Non-CoT pipeline progress)
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  // Upload Progress State
  const [activeUploadingDoc, setActiveUploadingDoc] = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('knowflow_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [studyDocId, setStudyDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = () => {
    if (globalFileInputRef.current) {
      globalFileInputRef.current.value = '';
      globalFileInputRef.current.click();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load initial documents and conversations
  const refreshDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents);
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
    refreshConversations();
  }, [refreshDocuments, refreshConversations]);

  // Poll status for any processing documents & update active upload modal
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.status !== 'COMPLETED' && d.status !== 'FAILED'
    );

    if (processingDocs.length === 0 && !activeUploadingDoc) return;

    const interval = setInterval(async () => {
      let anyChanged = false;

      // Poll active uploading doc if present
      if (activeUploadingDoc && activeUploadingDoc.status !== 'COMPLETED' && activeUploadingDoc.status !== 'FAILED') {
        try {
          const status = await api.getDocumentStatus(activeUploadingDoc.id);
          setActiveUploadingDoc((prev) => (prev ? { ...prev, ...status } : null));
          if (status.status === 'COMPLETED') {
            success(`"${activeUploadingDoc.original_name}" ready (${status.page_count} pages)!`, 'Ingestion Complete');
          }
        } catch (e) {}
      }

      for (const doc of processingDocs) {
        try {
          const status = await api.getDocumentStatus(doc.id);
          if (status.status !== doc.status || status.progress !== doc.progress) {
            anyChanged = true;
          }
          if (status.status === 'COMPLETED' && doc.status !== 'COMPLETED') {
            success(`"${doc.original_name}" indexed successfully (${status.page_count} pages)!`, 'Ready to Chat');
          } else if (status.status === 'FAILED' && doc.status !== 'FAILED') {
            error(`Failed to process "${doc.original_name}": ${status.error_message || 'Unknown error'}`, 'Processing Error');
          }
        } catch (err) {
          console.error(`Error polling status for ${doc.id}:`, err);
        }
      }
      if (anyChanged) {
        refreshDocuments();
      }
    }, 650);

    return () => clearInterval(interval);
  }, [documents, activeUploadingDoc, refreshDocuments, success, error]);

  // Select conversation session
  const handleSelectConversation = async (convId: string) => {
    try {
      const detail = await api.getConversation(convId);
      setActiveConversationId(detail.id);
      setMessages(detail.messages);
      setSelectedScope(detail.document_scope || 'all');
      setCurrentView('chat');
      setIsMobileMenuOpen(false);

      // Extract last sources if present
      const lastAsst = [...detail.messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.sources && m.sources.length > 0);
      if (lastAsst && lastAsst.sources) {
        setCurrentSources(lastAsst.sources);
      } else {
        setCurrentSources([]);
      }
    } catch (e: any) {
      error('Failed to load conversation messages');
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentSources([]);
    setActiveCitationModal(null);
    setCurrentView('chat');
    setIsMobileMenuOpen(false);
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.deleteConversation(convId);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      refreshConversations();
      info('Conversation removed');
    } catch (e: any) {
      error('Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    try {
      await api.renameConversation(convId, newTitle);
      refreshConversations();
    } catch (e: any) {
      error('Failed to rename conversation');
    }
  };

  // Upload PDF handler with professional 6-step progress modal
  const handleUploadFile = async (file: File) => {
    try {
      const newDoc = await api.uploadDocument(file);
      setActiveUploadingDoc(newDoc);
      setIsUploadModalOpen(true);
      refreshDocuments();
    } catch (e: any) {
      error(e.message || 'Failed to upload document', 'Upload Failed');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      success('Document and embeddings deleted successfully');
      refreshDocuments();
      if (selectedScope === docId) {
        setSelectedScope('all');
      }
    } catch (e: any) {
      error('Failed to delete document');
    }
  };

  // Chat Submission with Real-Time Streaming & Safe RAG Pipeline Transitions
  const handleSendMessage = async (userQuery: string) => {
    if (!userQuery.trim() || isStreaming) return;

    // Optimistically add user message
    const tempUserMsgId = `temp_user_${Date.now()}`;
    const userMessage: Message = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || '',
      role: 'user',
      content: userQuery,
      created_at: new Date().toISOString(),
    };

    const tempAsstMsgId = `temp_asst_${Date.now()}`;
    const initialAsstMsg: Message = {
      id: tempAsstMsgId,
      conversation_id: activeConversationId || '',
      role: 'assistant',
      content: '',
      sources: [],
      provider: settings.provider,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, initialAsstMsg]);
    setIsStreaming(true);
    setRagStatus('Searching documents...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';

    await api.sendChatStream(
      {
        message: userQuery,
        conversation_id: activeConversationId,
        document_scope: selectedScope === 'all' ? 'all' : 'single',
        selected_document_ids: selectedScope !== 'all' ? [selectedScope] : undefined,
        top_k: settings.top_k,
        temperature: settings.temperature,
        model: settings.model,
        provider: settings.provider,
      },
      {
        onSession: (convId) => {
          if (!activeConversationId) {
            setActiveConversationId(convId);
            refreshConversations();
          }
        },
        onSources: (sources, mode, documentSupport) => {
          setCurrentSources(sources);
          setRagStatus(mode === 'general' ? 'Synthesizing response...' : 'Verifying sources...');
          // Update assistant message sources WITHOUT opening any right sidebar
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAsstMsgId
                ? {
                    ...m,
                    sources,
                    mode: mode as any,
                    document_support: documentSupport as any,
                  }
                : m
            )
          );
        },
        onToken: (token) => {
          accumulatedText += token;
          setRagStatus(null); // Clear status once text arrives
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAsstMsgId ? { ...m, content: accumulatedText } : m
            )
          );
        },
        onDone: (_model, mode, documentSupport, provider) => {
          setIsStreaming(false);
          setRagStatus(null);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAsstMsgId
                ? {
                    ...m,
                    ...(mode ? { mode: mode as any } : {}),
                    ...(documentSupport ? { document_support: documentSupport as any } : {}),
                    ...(provider ? { provider: provider as any } : {}),
                  }
                : m
            )
          );
          refreshConversations();
        },
        onError: (err) => {
          setIsStreaming(false);
          setRagStatus(null);
          error(err.message || 'Error receiving assistant response');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAsstMsgId && !m.content
                ? {
                    ...m,
                    content:
                      "I couldn't find enough information about this in your uploaded knowledge or encountered a network timeout.",
                  }
                : m
            )
          );
        },
      },
      controller.signal
    );
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setRagStatus(null);
      info('Generation stopped');
    }
  };

  // Inspect citation handler: opens lightweight modal only (NO right-side inspector)
  const handleSelectCitation = (citation: SourceCitation) => {
    setActiveCitationModal(citation);
  };

  const handleOpenPageCitation = (pageNumber: number, docName?: string) => {
    const match =
      currentSources.find(
        (s) =>
          s.page_number === pageNumber &&
          (!docName || s.document_name.toLowerCase().includes(docName.toLowerCase()))
      ) || currentSources.find((s) => s.page_number === pageNumber);

    if (match) {
      setActiveCitationModal(match);
    } else if (currentSources.length > 0) {
      setActiveCitationModal({
        ...currentSources[0],
        page_number: pageNumber,
      });
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('knowflow_settings', JSON.stringify(newSettings));
    success('Preferences saved');
  };

  const handleOpenStudyForDoc = (docId: string) => {
    setStudyDocId(docId);
    setIsStudyModalOpen(true);
  };

  const handleChatWithDoc = (docId: string) => {
    setSelectedScope(docId);
    setCurrentView('chat');
    handleNewChat();
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#070b16] text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <AppHeader
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
        documents={documents}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        currentModel={settings.model}
        provider={settings.provider}
        onProviderChange={(prov) => handleUpdateSettings({ ...settings, provider: prov })}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop) - Hidden on landing page view */}
        {currentView !== 'landing' && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onNewChat={handleNewChat}
            onOpenDocuments={() => setCurrentView('documents')}
            documents={documents}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            onSelectDocument={handleChatWithDoc}
            onTriggerUpload={handleTriggerUpload}
            onOpenAbout={() => setIsAboutOpen(true)}
          />
        )}

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#070b16] shadow-2xl z-50 flex flex-col">
              <Sidebar
                isOpen={true}
                onToggle={() => setIsMobileMenuOpen(false)}
                onNewChat={() => {
                  handleNewChat();
                  setIsMobileMenuOpen(false);
                }}
                onOpenDocuments={() => {
                  setCurrentView('documents');
                  setIsMobileMenuOpen(false);
                }}
                documents={documents}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={handleRenameConversation}
                onSelectDocument={(id) => {
                  handleChatWithDoc(id);
                  setIsMobileMenuOpen(false);
                }}
                onTriggerUpload={() => {
                  setIsMobileMenuOpen(false);
                  handleTriggerUpload();
                }}
                onOpenAbout={() => {
                  setIsAboutOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Center Main Stage — FULL WIDTH (NO RIGHT-SIDE SOURCE INSPECTOR) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-[#090e1c]">
          {currentView === 'landing' ? (
            <LandingPage
              onStartChat={() => setCurrentView('chat')}
              onExploreDocuments={() => setCurrentView('documents')}
            />
          ) : currentView === 'documents' ? (
            <DocumentStudio
              documents={documents}
              onUploadFile={handleUploadFile}
              onDeleteDocument={handleDeleteDocument}
              onStartChatWithDoc={handleChatWithDoc}
              onOpenStudyTools={handleOpenStudyForDoc}
            />
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <EmptyState
                    onUploadFile={handleUploadFile}
                    onPromptClick={handleSendMessage}
                    documents={documents}
                    onOpenDocuments={() => setCurrentView('documents')}
                  />
                ) : (
                  <div className="pb-4">
                    {messages.map((m, idx) => (
                      <MessageItem
                        key={m.id || idx}
                        message={m}
                        onSelectCitation={handleSelectCitation}
                        onOpenPage={handleOpenPageCitation}
                        onSmartAction={handleSendMessage}
                        isLatestAssistant={idx === messages.length - 1 && m.role === 'assistant'}
                        onRegenerate={() => {
                          const lastUser = [...messages]
                            .reverse()
                            .find((x) => x.role === 'user');
                          if (lastUser) {
                            handleSendMessage(lastUser.content);
                          }
                        }}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <ChatInput
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                onStopStreaming={handleStopStreaming}
                ragStatus={ragStatus}
                onTriggerUpload={handleTriggerUpload}
                selectedScope={selectedScope}
                onScopeChange={setSelectedScope}
                documents={documents}
                provider={settings.provider}
              />
            </div>
          )}
        </main>
      </div>

      {/* Lightweight Non-Intrusive Citation Modal */}
      <CitationModal
        citation={activeCitationModal}
        onClose={() => setActiveCitationModal(null)}
        allCitations={currentSources}
        onSelectCitation={setActiveCitationModal}
      />

      {/* Professional Upload Progress Stepper Modal */}
      <UploadProgressModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        document={activeUploadingDoc}
        onStartChatWithDoc={handleChatWithDoc}
      />

      {/* Study Tools Modal */}
      <StudyToolsModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        documents={documents}
        preselectedDocId={studyDocId}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* About & Architecture Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Permanent Global Hidden File Input for 100% reliable browser file selection */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
        className="hidden"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KnowFlowApp />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
