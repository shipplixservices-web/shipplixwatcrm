import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Search,
  Database,
  CheckCircle,
  AlertCircle,
  Eye,
  Layers,
  X
} from 'lucide-react';

export default function KnowledgeBaseModal({
  isOpen,
  onClose,
  documents,
  onUploadDocument,
  onDeleteDocument,
}) {
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'chunks' | 'test_rag'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id || null);
  const [chunks, setChunks] = useState([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // RAG Testing sandbox state
  const [testQuery, setTestQuery] = useState('Do you offer weekend delivery in Brooklyn?');
  const [testResults, setTestResults] = useState(null);
  const [isTestingRag, setIsTestingRag] = useState(false);

  if (!isOpen) return null;

  // File Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/kb/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadDocument(data.document);
      setSelectedFile(null);
      // Switch to chunks tab to show parsed chunks
      setSelectedDocId(data.document.id);
      loadDocChunks(data.document.id);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Load Chunks for document
  const loadDocChunks = async (docId) => {
    setSelectedDocId(docId);
    setIsLoadingChunks(true);
    try {
      const res = await fetch(`/api/kb/chunks?documentId=${docId}`);
      const data = await res.json();
      if (data.success) {
        setChunks(data.chunks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Test RAG Retrieval
  const handleRunRagTest = async () => {
    if (!testQuery.trim()) return;
    setIsTestingRag(true);
    try {
      const res = await fetch('/api/kb/test-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery, topK: 3 }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingRag(false);
    }
  };

  return (
    <div className="modal-backdrop-scrim" onClick={onClose}>
      <div className="modal-dialog-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <header className="modal-dialog-header">
          <div className="modal-dialog-title">
            <Database size={20} color="#00a884" />
            <span>Knowledge Base & RAG Engine Management</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px', background: 'var(--bg-elevated)', gap: 8 }}>
          <button
            id="tab-kb-documents"
            className={`filter-pill ${activeTab === 'documents' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={14} style={{ marginRight: 6 }} />
            Indexed Documents ({documents.length})
          </button>
          <button
            id="tab-kb-chunks"
            className={`filter-pill ${activeTab === 'chunks' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => {
              setActiveTab('chunks');
              if (selectedDocId) loadDocChunks(selectedDocId);
              else if (documents[0]) loadDocChunks(documents[0].id);
            }}
          >
            <Layers size={14} style={{ marginRight: 6 }} />
            Structured Chunks Inspector
          </button>
          <button
            id="tab-kb-rag-test"
            className={`filter-pill ${activeTab === 'test_rag' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('test_rag')}
          >
            <Search size={14} style={{ marginRight: 6 }} />
            RAG Smart Memory Sandbox
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-dialog-body">
          {/* TAB 1: Documents & Upload */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Upload Drop Zone */}
              <div
                style={{
                  border: '2px dashed var(--border-bright)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <UploadCloud size={36} color="#00a884" />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: 4 }}>
                    Upload Knowledge Base Files (PDF, TXT, DOCX, Markdown)
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Files are automatically parsed, vectorized into structured chunks, and stored in Supabase.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    id="kb-file-upload-input"
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv"
                    onChange={handleFileChange}
                    style={{ fontSize: '12px', color: 'var(--text-main)' }}
                  />
                  <button
                    id="btn-upload-file-submit"
                    className="btn-action-primary"
                    onClick={handleUploadSubmit}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? 'Chunking & Indexing...' : 'Upload & Index'}
                  </button>
                </div>

                {uploadError && (
                  <div style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Document List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Active Indexed Documents
                </h4>

                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={20} color="#00a884" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {doc.chunkCount} structured chunks • {(doc.size / 1024).toFixed(1)} KB • Indexed in Supabase/Local
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="btn-action-secondary"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setActiveTab('chunks');
                          loadDocChunks(doc.id);
                        }}
                      >
                        <Eye size={12} style={{ marginRight: 4 }} />
                        View Chunks
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: '#ef4444' }}
                        title="Delete document"
                        onClick={() => onDeleteDocument(doc.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Structured Chunks Inspector */}
          {activeTab === 'chunks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Document:</span>
                <select
                  id="select-doc-for-chunks"
                  value={selectedDocId || ''}
                  onChange={(e) => loadDocChunks(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              {isLoadingChunks ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading chunk vector representations...
                </div>
              ) : chunks.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No chunks found for this document.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chunks.map((chunk, i) => (
                    <div
                      key={chunk.id || i}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '12.5px',
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#a78bfa', fontSize: '11px', fontWeight: 700 }}>
                        <span>CHUNK #{chunk.chunkIndex + 1} — {chunk.docTitle}</span>
                        <span>Estimated Tokens: ~{chunk.tokenEstimate}</span>
                      </div>
                      <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                        {chunk.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAG Smart Memory Sandbox */}
          {activeTab === 'test_rag' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>
                  Test RAG Smart Memory Retrieval
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Type a customer question below to test how RAG retrieves high-relevance chunks and saves token costs before calling Gemini 2.5 Flash.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  id="rag-test-query-input"
                  type="text"
                  className="form-input-text"
                  style={{ flex: 1 }}
                  placeholder="Enter a test question (e.g. 'What is the bulk price for 500 packages?')"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                />
                <button
                  id="btn-run-rag-test"
                  className="btn-action-primary"
                  onClick={handleRunRagTest}
                  disabled={isTestingRag}
                >
                  <Search size={14} />
                  <span>{isTestingRag ? 'Retrieving...' : 'Run RAG Search'}</span>
                </button>
              </div>

              {/* Sample Queries */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Try queries:</span>
                {[
                  'Weekend delivery in Brooklyn',
                  'Enterprise pricing for 500 parcels',
                  'How to return damaged package',
                  'Cutoff times for express shipping'
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    className="filter-pill"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setTestQuery(sample);
                    }}
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* RAG Results Breakdown */}
              {testResults && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, background: 'rgba(0, 168, 132, 0.12)', border: '1px solid var(--wa-primary)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div>Matched Chunks: <strong>{testResults.retrievedCount}</strong></div>
                    <div>Total KB Chunks Evaluated: <strong>{testResults.totalAvailable}</strong></div>
                    <div>Estimated Tokens Saved: <strong style={{ color: '#25d366' }}>~{testResults.estimatedTokensSaved} tokens</strong></div>
                  </div>

                  <h5 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Top Retrieved Context Chunks (Ranked by Relevance)
                  </h5>

                  {testResults.chunks.map((c, i) => (
                    <div
                      key={c.id || i}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '11px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--wa-primary)' }}>
                          Rank #{i + 1}: {c.docTitle} (Chunk #{c.chunkIndex + 1})
                        </span>
                        <span style={{ fontWeight: 700, color: '#a78bfa' }}>
                          Similarity Score: {c.score}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-main)', lineHeight: 1.45 }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="modal-dialog-footer">
          <button className="btn-action-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
