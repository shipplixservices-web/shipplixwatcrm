import React, { useState, useEffect } from 'react';
import TopNavbar from './components/TopNavbar.jsx';
import ChatSidebar from './components/ChatSidebar.jsx';
import ChatViewport from './components/ChatViewport.jsx';
import ContextSidebar from './components/ContextSidebar.jsx';
import KnowledgeBaseModal from './components/KnowledgeBaseModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import WhatsAppSimulatorDrawer from './components/WhatsAppSimulatorDrawer.jsx';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState({
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    systemPrompt: '',
    defaultMode: 'ai',
    globalAutoPilot: true,
    featureLimits: {
      plan: 'Pro Tier',
      maxMonthlyMessages: 10000,
      ragTopK: 3
    }
  });
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [globalAutoPilot, setGlobalAutoPilot] = useState(true);

  // Modals state
  const [isKBOpen, setIsKBOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true); // Open simulator by default so user can test immediately!

  // Copilot reply suggestion
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Sync theme class to document body
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
  }, [theme]);

  // Initial Data Fetch
  useEffect(() => {
    // 1. Fetch Chats
    fetch('/api/chats')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.chats) {
          setChats(d.chats);
          if (d.chats.length > 0 && !selectedChatId) {
            setSelectedChatId(d.chats[0].id);
          }
        }
      })
      .catch(console.error);

    // 2. Fetch Knowledge Base Documents
    fetch('/api/kb/documents')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.documents) {
          setDocuments(d.documents);
        }
      })
      .catch(console.error);

    // 3. Fetch Settings
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setSettings(d.settings);
          setGlobalAutoPilot(d.settings.globalAutoPilot !== false);
        }
      })
      .catch(console.error);

    // 4. Fetch Webhook Logs
    fetch('/api/simulator/logs')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.logs) {
          setWebhookLogs(d.logs);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Messages when active chat changes
  useEffect(() => {
    if (!selectedChatId) return;

    fetch(`/api/chats/${selectedChatId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMessages(d.messages);
          setAiSuggestion('');
        }
      })
      .catch(console.error);
  }, [selectedChatId]);

  // Real-Time Server-Sent Events (SSE) Listener
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, data } = payload;

        if (type === 'new_message') {
          // If message belongs to active chat, append to messages
          setMessages((prev) => {
            if (data.chatId === selectedChatId && !prev.some(m => m.id === data.id)) {
              return [...prev, data];
            }
            return prev;
          });

          // Refresh chats snippet
          fetch('/api/chats')
            .then(r => r.json())
            .then(d => { if (d.success) setChats(d.chats); });

          // Refresh logs
          fetch('/api/simulator/logs')
            .then(r => r.json())
            .then(d => { if (d.success) setWebhookLogs(d.logs); });
        } else if (type === 'chat_updated') {
          setChats((prev) =>
            prev.map(c => c.id === data.id ? { ...c, ...data } : c)
          );
        } else if (type === 'chat_mode_changed') {
          setChats((prev) =>
            prev.map(c => c.id === data.chatId ? { ...c, mode: data.mode } : c)
          );
        } else if (type === 'kb_updated') {
          fetch('/api/kb/documents')
            .then(r => r.json())
            .then(d => { if (d.success) setDocuments(d.documents); });
        }
      } catch (err) {
        // Heartbeat or malformed frame
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedChatId]);

  // Select Chat
  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    // Mark as read on server
    fetch(`/api/chats/${chatId}/read`, { method: 'POST' }).catch(console.error);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  };

  // Send message from Admin
  const handleSendMessage = async ({ content, type, mediaUrl, mediaName }) => {
    if (!selectedChatId) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type, mediaUrl, mediaName })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setAiSuggestion('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle Mode for specific chat
  const handleToggleChatMode = async (chatId, mode) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, mode } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Global Autopilot Toggle
  const handleToggleGlobalAutoPilot = async () => {
    const nextVal = !globalAutoPilot;
    setGlobalAutoPilot(nextVal);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalAutoPilot: nextVal })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // AI Copilot Suggestion
  const handleSuggestReply = async () => {
    if (!selectedChatId) return;
    setIsLoadingSuggestion(true);
    try {
      const res = await fetch(`/api/chats/${selectedChatId}/suggest-reply`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.suggestion) {
        setAiSuggestion(data.suggestion);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Upload Document callback
  const handleUploadDocument = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Delete Document
  const handleDeleteDocument = async (docId) => {
    try {
      await fetch(`/api/kb/documents/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error(e);
    }
  };

  // Simulator incoming message trigger
  const handleSimulateMessage = async (payload) => {
    const res = await fetch('/api/simulator/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success && data.chat) {
      // If new chat or current chat, update state
      setChats(prev => {
        const exists = prev.some(c => c.id === data.chat.id);
        if (exists) {
          return prev.map(c => c.id === data.chat.id ? data.chat : c);
        }
        return [data.chat, ...prev];
      });

      if (selectedChatId === data.chat.id) {
        if (data.incomingMessage) setMessages(prev => [...prev, data.incomingMessage]);
        if (data.aiMessage) setMessages(prev => [...prev, data.aiMessage]);
      }
    }
    return data;
  };

  // Quick simulate a brand new contact
  const handleQuickSimulateNewChat = async () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newPhone = `+1650555${randomDigits}`;
    const names = ['Liam Bennett', 'Zoe Chen', 'Alexander Wright', 'Chloe Morales'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const samplePrompts = [
      'Hi! Can I request a Saturday morning courier pickup for our Manhattan warehouse?',
      'Hello, what is the policy for international hazardous shipping?',
      'Could you confirm if tracking parcel SPX-9941 is out for delivery today?'
    ];
    const text = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];

    await handleSimulateMessage({
      phoneNumber: newPhone,
      customerName: randomName,
      text,
      type: 'text'
    });
  };

  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // Calculated Stats
  const activeChatsCount = chats.length;
  const aiChatsCount = chats.filter(c => c.mode === 'ai').length;
  const aiHandledPercentage = activeChatsCount > 0 ? Math.round((aiChatsCount / activeChatsCount) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Top Navbar */}
      <TopNavbar
        globalAutoPilot={globalAutoPilot}
        onToggleGlobalAutoPilot={handleToggleGlobalAutoPilot}
        stats={{
          activeChatsCount,
          aiHandledPercentage,
          tokensSaved: 2380,
        }}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenKB={() => setIsKBOpen(true)}
        onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
        isSimulatorOpen={isSimulatorOpen}
      />

      {/* Main 3-Column SaaS CRM Layout */}
      <div className="dashboard-workspace">
        {/* Left Column: WhatsApp Chat List */}
        <ChatSidebar
          chats={chats}
          selectedChatId={activeChat?.id}
          onSelectChat={handleSelectChat}
          onQuickSimulateNewChat={handleQuickSimulateNewChat}
        />

        {/* Center Column: WhatsApp Chat Viewport */}
        <ChatViewport
          chat={activeChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onToggleChatMode={handleToggleChatMode}
          onSuggestReply={handleSuggestReply}
          aiSuggestion={aiSuggestion}
          isLoadingSuggestion={isLoadingSuggestion}
          isSending={isSending}
        />

        {/* Right Column: Customer Details & RAG Context */}
        <ContextSidebar
          chat={activeChat}
          documents={documents}
          settings={settings}
        />
      </div>

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKBOpen}
        onClose={() => setIsKBOpen(false)}
        documents={documents}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Interactive WhatsApp Mobile Phone Simulator */}
      <WhatsAppSimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        activeChat={activeChat}
        onSimulateMessage={handleSimulateMessage}
        logs={webhookLogs}
      />
    </div>
  );
}
