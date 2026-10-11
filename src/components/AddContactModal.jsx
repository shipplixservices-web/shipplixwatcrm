import React, { useState } from 'react';
import {
  UserPlus,
  User,
  Phone,
  Bot,
  Tag,
  X,
  Check,
  AlertCircle,
  Plus
} from 'lucide-react';

const PRESET_TAGS = ['VIP', 'Sales Lead', 'Order Tracking', 'Enterprise', 'Support'];

export default function AddContactModal({
  isOpen,
  onClose,
  onAddContact,
  onSelectChat
}) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mode, setMode] = useState('ai'); // 'ai' | 'human'
  const [selectedTags, setSelectedTags] = useState(['Sales Lead']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingChat, setExistingChat] = useState(null);

  if (!isOpen) return null;

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e) => {
    e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExistingChat(null);

    // Validate phone number
    const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.replace(/[^\d]/g, '').length < 6) {
      setError('Please enter a valid phone number with country code (e.g., +1 415 555 2671 or +234 707 720 0962).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim() || cleanPhone,
        phoneNumber: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
        mode,
        tags: selectedTags.length > 0 ? selectedTags : ['New Contact'],
        initialMessage: initialMessage.trim()
      };

      const result = await onAddContact(payload);
      if (result?.success) {
        // Reset and close
        setName('');
        setPhoneNumber('');
        setInitialMessage('');
        setMode('ai');
        setSelectedTags(['Sales Lead']);
        onClose();
      } else if (result?.error) {
        setError(result.error);
        if (result?.chat) {
          setExistingChat(result.chat);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-scrim" onClick={onClose}>
      <div
        className="modal-dialog-container"
        style={{ maxWidth: '580px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-dialog-header">
          <div className="modal-dialog-title">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00a884 0%, #005c4b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Add New WhatsApp Contact</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                Start a conversation or enroll in AI Auto-Pilot support
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-dialog-body" style={{ gap: 16 }}>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: '13px',
                  color: '#f87171',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div>{error}</div>
                  {existingChat && (
                    <button
                      type="button"
                      style={{
                        marginTop: 6,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--wa-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                      onClick={() => {
                        if (onSelectChat && existingChat?.id) {
                          onSelectChat(existingChat.id);
                        }
                        onClose();
                      }}
                    >
                      Open existing chat with {existingChat.name} →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Phone Number Input */}
            <div className="form-field-group">
              <label className="form-label" htmlFor="new-contact-phone">
                <span>Phone Number (with Country Code) *</span>
                <span style={{ fontSize: '11px', color: 'var(--wa-primary)', fontWeight: 500 }}>
                  E.164 Format: +[country][number]
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  id="new-contact-phone"
                  type="text"
                  required
                  placeholder="+14155552671 or +2347077200962"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="form-input-text"
                  style={{ paddingLeft: 36, fontFamily: 'var(--font-mono)' }}
                  autoFocus
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Required to identify customer and route official WhatsApp Business Cloud API messages.
              </span>
            </div>

            {/* Contact Name */}
            <div className="form-field-group">
              <label className="form-label" htmlFor="new-contact-name">
                <span>Contact Name / Business Name</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Optional</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  id="new-contact-name"
                  type="text"
                  placeholder="e.g. David Miller (Apex Stores)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input-text"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Initial Agent Mode Selector */}
            <div className="form-field-group">
              <label className="form-label">
                <span>Conversation Handling Mode</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: mode === 'ai' ? '1.5px solid var(--ai-purple)' : '1px solid var(--border-color)',
                    background: mode === 'ai' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-elevated)',
                    color: mode === 'ai' ? '#c4b5fd' : 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Bot size={20} color={mode === 'ai' ? '#a78bfa' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>🤖 AI Auto-Pilot</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gemini + RAG replies automatically</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('human')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: mode === 'human' ? '1.5px solid var(--human-amber)' : '1px solid var(--border-color)',
                    background: mode === 'human' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-elevated)',
                    color: mode === 'human' ? '#fcd34d' : 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <User size={20} color={mode === 'human' ? '#fbbf24' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>👤 Human Support</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agent replies manually</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tags Section */}
            <div className="form-field-group">
              <label className="form-label">
                <span>Tags & Categorization</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Helps segment contacts</span>
              </label>

              {/* Tag Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className="filter-pill"
                      style={{
                        background: isSelected ? 'rgba(0, 168, 132, 0.15)' : 'var(--bg-elevated)',
                        borderColor: isSelected ? 'var(--wa-primary)' : 'var(--border-color)',
                        color: isSelected ? 'var(--wa-primary)' : 'var(--text-muted)',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      {isSelected ? <Check size={12} /> : <Tag size={11} />}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Input */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag(e);
                    }
                  }}
                  className="form-input-text"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="btn-action-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={13} style={{ marginRight: 4 }} /> Add
                </button>
              </div>
            </div>

            {/* Optional Initial Message */}
            <div className="form-field-group">
              <label className="form-label" htmlFor="new-contact-message">
                <span>Initial WhatsApp Message (Optional)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dispatched immediately</span>
              </label>
              <textarea
                id="new-contact-message"
                rows={2}
                placeholder="Hi David! Welcome to Shipplix Support. How can our team help your deliveries today?"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="form-textarea"
                style={{ fontSize: '12.5px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Leave empty if you just want to add the contact to the list without dispatching a greeting.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-dialog-footer">
            <button
              type="button"
              className="btn-action-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              id="submit-create-contact-btn"
              type="submit"
              className="btn-action-primary"
              disabled={isSubmitting || !phoneNumber.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
              }}
            >
              {isSubmitting ? (
                <>Adding Contact...</>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Create Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
