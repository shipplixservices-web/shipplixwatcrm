import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Send,
  Image as ImageIcon,
  FileText,
  Terminal,
  X,
  RotateCcw,
  Bot,
  User,
  Paperclip,
  CheckCheck
} from 'lucide-react';

export default function WhatsAppSimulatorDrawer({
  isOpen,
  onClose,
  activeChat,
  onSimulateMessage,
  logs,
}) {
  const [phoneTab, setPhoneTab] = useState('chat'); // 'chat' | 'logs'
  const [customerText, setCustomerText] = useState('');
  const [customerName, setCustomerName] = useState('Sarah Jenkins');
  const [customerPhone, setCustomerPhone] = useState('+14155552671');
  const [simulatedMediaType, setSimulatedMediaType] = useState('text'); // 'text' | 'image' | 'document'
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const simEndRef = useRef(null);

  // Sync with active chat if selected
  useEffect(() => {
    if (activeChat) {
      setCustomerName(activeChat.name);
      setCustomerPhone(activeChat.phoneNumber);
    }
  }, [activeChat]);

  // Fetch messages for this simulator contact
  useEffect(() => {
    if (isOpen && customerPhone) {
      fetch(`/api/chats/${encodeURIComponent(customerPhone)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.messages) {
            setMessages(data.messages);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, customerPhone]);

  useEffect(() => {
    simEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendSimulation = async (e) => {
    e?.preventDefault();
    if (!customerText.trim() && simulatedMediaType === 'text') return;

    setIsSending(true);

    let mediaUrl = null;
    let mediaName = null;
    if (simulatedMediaType === 'image') {
      mediaUrl = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600';
      mediaName = 'damaged_parcel_box.jpg';
    } else if (simulatedMediaType === 'document') {
      mediaUrl = '/uploads/sample_shipping_label.pdf';
      mediaName = 'shipping_invoice_2026.pdf';
    }

    try {
      const payload = {
        phoneNumber: customerPhone,
        customerName: customerName,
        text: customerText.trim() || (simulatedMediaType === 'image' ? 'Here is a photo of the shipment' : 'Attached invoice document'),
        type: simulatedMediaType,
        mediaUrl,
        mediaName,
      };

      await onSimulateMessage(payload);

      // Refresh simulator chat
      const res = await fetch(`/api/chats/${encodeURIComponent(customerPhone)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }

      setCustomerText('');
      setSimulatedMediaType('text');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    'Does express shipping deliver on Sunday in Brooklyn?',
    'What is your bulk price for 500+ packages weekly?',
    'Package SPX-8921 is damaged. How do I get a refund?'
  ];

  return (
    <aside className="simulator-drawer-modal" id="whatsapp-phone-simulator">
      {/* Phone Notch Bar */}
      <div className="phone-notch-bar">
        <span>9:41</span>
        <div style={{ width: '80px', height: '14px', background: '#000', borderRadius: '10px' }} />
        <span>5G 100%</span>
      </div>

      {/* WhatsApp Header */}
      <div className="phone-screen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
            WA
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e9edef' }}>
              Shipplix Support
            </div>
            <div style={{ fontSize: '10px', color: '#8696a0' }}>
              Official Business Account
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className={`btn-icon ${phoneTab === 'logs' ? 'active' : ''}`}
            style={{ width: '28px', height: '28px' }}
            title="Inspect Meta Webhook Logs"
            onClick={() => setPhoneTab(phoneTab === 'chat' ? 'logs' : 'chat')}
          >
            <Terminal size={14} />
          </button>
          <button
            className="btn-icon"
            style={{ width: '28px', height: '28px' }}
            onClick={onClose}
            title="Close simulator"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Sender Profile Switcher */}
      <div style={{ background: '#182229', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: '#8696a0' }}>Simulating customer:</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="filter-pill"
            style={{ fontSize: '10px', padding: '2px 8px', background: customerPhone === '+14155552671' ? '#00a884' : '#202c33', color: '#fff' }}
            onClick={() => {
              setCustomerName('Sarah Jenkins');
              setCustomerPhone('+14155552671');
            }}
          >
            Sarah (+1415...)
          </button>
          <button
            className="filter-pill"
            style={{ fontSize: '10px', padding: '2px 8px', background: customerPhone === '+447911123456' ? '#00a884' : '#202c33', color: '#fff' }}
            onClick={() => {
              setCustomerName('Marcus Vance');
              setCustomerPhone('+447911123456');
            }}
          >
            Marcus (+4479...)
          </button>
        </div>
      </div>

      {/* Screen Content: Chat or Webhook Logs */}
      {phoneTab === 'chat' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages Flow inside phone */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0b141a' }}>
            {messages.map((m) => {
              const isCust = m.from === 'customer';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: isCust ? 'flex-end' : 'flex-start',
                    width: '100%'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: isCust ? '#005c4b' : '#202c33',
                      color: '#e9edef',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      wordBreak: 'break-word',
                      borderTopRightRadius: isCust ? '2px' : '8px',
                      borderTopLeftRadius: !isCust ? '2px' : '8px',
                    }}
                  >
                    {m.type === 'image' && m.mediaUrl && (
                      <img src={m.mediaUrl} alt="media" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '4px', marginBottom: 4 }} />
                    )}
                    {m.type === 'document' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px', marginBottom: 4 }}>
                        <FileText size={16} color="#00a884" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{m.mediaName || 'Document.pdf'}</span>
                      </div>
                    )}
                    <div>{m.content}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isCust && <CheckCheck size={12} color="#53bdeb" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={simEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ background: '#111b21', padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                className="filter-pill"
                style={{ fontSize: '10px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                onClick={() => setCustomerText(q)}
              >
                {q.slice(0, 26)}...
              </button>
            ))}
          </div>

          {/* Simulator Message Composer */}
          <div style={{ background: '#111b21', padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <button
                className={`filter-pill ${simulatedMediaType === 'image' ? 'active' : ''}`}
                style={{ fontSize: '10px', padding: '2px 8px' }}
                onClick={() => setSimulatedMediaType(simulatedMediaType === 'image' ? 'text' : 'image')}
              >
                <ImageIcon size={10} style={{ marginRight: 3 }} /> +Photo
              </button>
              <button
                className={`filter-pill ${simulatedMediaType === 'document' ? 'active' : ''}`}
                style={{ fontSize: '10px', padding: '2px 8px' }}
                onClick={() => setSimulatedMediaType(simulatedMediaType === 'document' ? 'text' : 'document')}
              >
                <Paperclip size={10} style={{ marginRight: 3 }} /> +PDF
              </button>
            </div>

            <form onSubmit={handleSendSimulation} style={{ display: 'flex', gap: 6 }}>
              <input
                id="simulator-customer-input"
                type="text"
                placeholder="Type customer message..."
                style={{
                  flex: 1,
                  background: '#2a3942',
                  border: 'none',
                  borderRadius: '18px',
                  padding: '7px 12px',
                  color: '#e9edef',
                  fontSize: '12px',
                  outline: 'none',
                }}
                value={customerText}
                onChange={(e) => setCustomerText(e.target.value)}
              />
              <button
                id="btn-send-simulated-msg"
                type="submit"
                className="btn-action-primary"
                style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}
                disabled={isSending}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Real-Time Meta Webhook Logs Tab */
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#080d11', fontFamily: 'var(--font-mono)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: '#00a884', fontWeight: 700, marginBottom: 4 }}>
            Meta WhatsApp Webhook & Dispatch Logs:
          </div>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                background: '#111b21',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '6px',
                padding: '8px',
                lineHeight: 1.4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: log.direction === 'inbound' ? '#53bdeb' : '#a78bfa', fontWeight: 600 }}>
                <span>[{log.direction.toUpperCase()}] {log.event}</span>
                <span style={{ fontSize: '9px', color: '#8696a0' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: '#e9edef', marginTop: 3 }}>
                {log.details}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
