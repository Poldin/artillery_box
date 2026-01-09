'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, RefreshCw, Trash2, Edit3, Clock, FileText, Plus, Eye, Loader2 } from 'lucide-react';
import { SiPostgresql, SiMysql, SiSqlite, SiMariadb, SiMongodb } from 'react-icons/si';
import { TbSql } from 'react-icons/tb';

export interface Documentation {
  id: string;
  datasource_id: string;
  filename: string;
  markdown_content: string;
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite' | 'mariadb' | 'mongodb';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  createdAt: string;
  
  // Common fields (not used by SQLite)
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  
  // PostgreSQL specific
  sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  schema?: string;
  
  // MySQL/MariaDB specific
  charset?: string;
  
  // SQL Server specific
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  instanceName?: string;
  
  // SQLite specific
  filePath?: string;
  
  // MongoDB specific
  authDatabase?: string;
  replicaSet?: string;
  tls?: boolean;
  
  // Documentation files
  documentation?: Documentation[];
}

interface DataSourceSheetProps {
  dataSource: DataSource | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (id: string) => void;
  onEdit?: (dataSource: DataSource) => void;
  onDocumentationChange?: () => void;
}

const dbTypeConfig: Record<DataSource['type'], { label: string; color: string; icon: React.ReactNode }> = {
  postgresql: { label: 'PostgreSQL', color: '#336791', icon: <SiPostgresql size={20} /> },
  mysql: { label: 'MySQL', color: '#00758F', icon: <SiMysql size={20} /> },
  sqlserver: { label: 'SQL Server', color: '#5E5E5E', icon: <TbSql size={20} /> },
  sqlite: { label: 'SQLite', color: '#003B57', icon: <SiSqlite size={20} /> },
  mariadb: { label: 'MariaDB', color: '#003545', icon: <SiMariadb size={20} /> },
  mongodb: { label: 'MongoDB', color: '#47A248', icon: <SiMongodb size={20} /> },
};

export default function DataSourceSheet({ dataSource, onClose, onDelete, onTestConnection, onEdit, onDocumentationChange }: DataSourceSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  
  // Documentation state
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [showViewDocDialog, setShowViewDocDialog] = useState(false);
  const [showDeleteDocDialog, setShowDeleteDocDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null);
  const [editingDoc, setEditingDoc] = useState<Documentation | null>(null);
  const [docToDelete, setDocToDelete] = useState<Documentation | null>(null);
  const [newDocFilename, setNewDocFilename] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  if (!dataSource) return null;

  const config = dbTypeConfig[dataSource.type];

  const statusConfig = {
    connected: { label: 'connected', color: 'var(--success)', icon: <CheckCircle size={16} /> },
    disconnected: { label: 'disconnected', color: 'var(--text-muted)', icon: <XCircle size={16} /> },
    error: { label: 'error', color: 'var(--error)', icon: <XCircle size={16} /> },
    pending: { label: 'not tested', color: 'var(--text-muted)', icon: <Clock size={16} /> },
  };

  const status = statusConfig[dataSource.status];

  const handleDelete = () => {
    if (deleteConfirmName === dataSource.name) {
      onDelete?.(dataSource.id);
      setShowDeleteDialog(false);
      setDeleteConfirmName('');
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmName('');
  };

  // Documentation handlers
  const handleAddDocument = async () => {
    if (!newDocFilename || !newDocContent) return;
    
    setIsUploadingDoc(true);
    try {
      const url = editingDoc 
        ? `/api/data-sources/${dataSource.id}/documentation/${editingDoc.id}`
        : `/api/data-sources/${dataSource.id}/documentation`;
      
      const method = editingDoc ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: newDocFilename,
          markdown_content: newDocContent,
        }),
      });

      if (response.ok) {
        setShowAddDocDialog(false);
        setNewDocFilename('');
        setNewDocContent('');
        setEditingDoc(null);
        onDocumentationChange?.();
      }
    } catch (error) {
      console.error('Failed to save documentation:', error);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    
    setIsDeletingDoc(true);
    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}/documentation/${docToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteDocDialog(false);
        setDocToDelete(null);
        onDocumentationChange?.();
      }
    } catch (error) {
      console.error('Failed to delete documentation:', error);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleOpenDeleteDocDialog = (doc: Documentation) => {
    setDocToDelete(doc);
    setShowDeleteDocDialog(true);
  };

  const handleViewDocument = (doc: Documentation) => {
    setSelectedDoc(doc);
    setShowViewDocDialog(true);
  };

  const handleEditDocument = (doc: Documentation) => {
    setEditingDoc(doc);
    setNewDocFilename(doc.filename);
    setNewDocContent(doc.markdown_content);
    setShowAddDocDialog(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 flex flex-col animate-slide-in"
        style={{ 
          background: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border-default)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-tertiary)', color: config.color }}
            >
              {config.icon}
            </div>
            <div>
              <h2 
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {dataSource.name}
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {config.label}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Status Card */}
          <div 
            className="rounded-xl p-4 mb-6"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: status.color }}>{status.icon}</span>
                <span 
                  className="font-medium"
                  style={{ color: status.color }}
                >
                  {status.label}
                </span>
              </div>
              <button
                onClick={() => onTestConnection?.(dataSource.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <RefreshCw size={14} />
                test connection
              </button>
            </div>
            {dataSource.lastSync && (
              <p 
                className="text-xs mt-2"
                style={{ color: 'var(--text-muted)' }}
              >
                last synced: {dataSource.lastSync}
              </p>
            )}
          </div>

          {/* Connection Details */}
          <div className="mb-6">
            <h3 
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              connection details
            </h3>
            <div 
              className="rounded-xl overflow-hidden"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {dataSource.type === 'sqlite' ? (
                // SQLite - file path only
                <DetailRow label="file path" value={dataSource.filePath || ''} isLast />
              ) : (
                // All other databases
                <>
                  <DetailRow label="host" value={dataSource.host || ''} />
                  <DetailRow label="port" value={dataSource.port?.toString() || ''} />
                  <DetailRow label="database" value={dataSource.database || ''} />
                  {(dataSource.type !== 'mongodb' || dataSource.username) && (
                    <>
                      <DetailRow label="username" value={dataSource.username || ''} />
                      <DetailRow label="password" value="••••••••" />
                    </>
                  )}
                  
                  {/* PostgreSQL specific */}
                  {dataSource.type === 'postgresql' && (
                    <>
                      <DetailRow label="ssl mode" value={dataSource.sslMode || 'disable'} />
                      <DetailRow label="schema" value={dataSource.schema || 'public'} isLast />
                    </>
                  )}
                  
                  {/* MySQL/MariaDB specific */}
                  {(dataSource.type === 'mysql' || dataSource.type === 'mariadb') && (
                    <>
                      <DetailRow label="ssl" value={dataSource.sslMode === 'require' ? 'enabled' : 'disabled'} />
                      <DetailRow label="charset" value={dataSource.charset || 'utf8mb4'} isLast />
                    </>
                  )}
                  
                  {/* SQL Server specific */}
                  {dataSource.type === 'sqlserver' && (
                    <>
                      <DetailRow label="encrypt" value={dataSource.encrypt ? 'yes' : 'no'} />
                      <DetailRow label="trust certificate" value={dataSource.trustServerCertificate ? 'yes' : 'no'} isLast={!dataSource.instanceName} />
                      {dataSource.instanceName && <DetailRow label="instance" value={dataSource.instanceName} isLast />}
                    </>
                  )}
                  
                  {/* MongoDB specific */}
                  {dataSource.type === 'mongodb' && (
                    <>
                      <DetailRow label="auth database" value={dataSource.authDatabase || 'admin'} />
                      <DetailRow label="tls" value={dataSource.tls ? 'enabled' : 'disabled'} isLast={!dataSource.replicaSet} />
                      {dataSource.replicaSet && <DetailRow label="replica set" value={dataSource.replicaSet} isLast />}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Connection String Preview */}
          <div className="mb-6">
            <h3 
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              connection string
            </h3>
            <div 
              className="rounded-xl p-4 font-mono text-xs break-all"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {dataSource.type}://{dataSource.username}:****@{dataSource.host}:{dataSource.port}/{dataSource.database}
            </div>
          </div>

          {/* Edit Connection Button */}
          <div className="mb-6">
            <button
              onClick={() => onEdit?.(dataSource)}
              className="w-fit flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Edit3 size={16} />
              edit connection
            </button>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <h3 
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              metadata
            </h3>
            <div 
              className="rounded-xl overflow-hidden"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <DetailRow label="created" value={dataSource.createdAt} />
              <DetailRow label="id" value={dataSource.id} isLast />
            </div>
          </div>

          {/* Documentation Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                documentation
              </h3>
              <button
                onClick={() => setShowAddDocDialog(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Plus size={14} />
                add file
              </button>
            </div>
            
            {dataSource.documentation && dataSource.documentation.length > 0 ? (
              <div 
                className="rounded-xl overflow-hidden"
                style={{ 
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {dataSource.documentation.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 group"
                    style={{ 
                      borderBottom: index === dataSource.documentation!.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {doc.filename}
                        </p>
                        <p 
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {new Date(doc.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                        title="view"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleEditDocument(doc)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                        title="edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteDocDialog(doc)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.color = 'var(--error)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                        title="delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="rounded-xl p-6 text-center"
                style={{ 
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <FileText 
                  size={24} 
                  className="mx-auto mb-2"
                  style={{ color: 'var(--text-muted)' }} 
                />
                <p 
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  no documentation files yet
                </p>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-fit flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'var(--error)';
                e.currentTarget.style.color = 'var(--error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Trash2 size={16} />
              delete data source
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <>
          <div 
            className="fixed inset-0 z-60"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={handleCloseDeleteDialog}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-70 rounded-xl p-6"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              delete data source
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              this action cannot be undone. type <strong style={{ color: 'var(--text-primary)' }}>{dataSource.name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="type the name to confirm"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
              style={{ 
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCloseDeleteDialog}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmName !== dataSource.name}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: deleteConfirmName === dataSource.name ? 'var(--error)' : 'var(--bg-tertiary)',
                  color: deleteConfirmName === dataSource.name ? 'white' : 'var(--text-muted)',
                  cursor: deleteConfirmName === dataSource.name ? 'pointer' : 'not-allowed'
                }}
              >
                delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Documentation Dialog */}
      {showAddDocDialog && (
        <>
          <div 
            className="fixed inset-0 z-60"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setShowAddDocDialog(false);
              setNewDocFilename('');
              setNewDocContent('');
              setEditingDoc(null);
            }}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-70 rounded-xl p-6 flex flex-col"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              width: '60vw',
              height: '95vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {editingDoc ? 'edit documentation' : 'add documentation'}
            </h3>
            
            <div className="flex-1 flex flex-col space-y-4 mb-4 overflow-hidden">
              <div>
                <label 
                  className="block text-sm mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  filename
                </label>
                <input
                  type="text"
                  value={newDocFilename}
                  onChange={(e) => setNewDocFilename(e.target.value)}
                  placeholder="schema-notes.md"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <label 
                  className="block text-sm mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  content (markdown)
                </label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="# Database Schema&#10;&#10;## Tables&#10;..."
                  className="flex-1 w-full px-3 py-2 rounded-lg text-sm outline-none font-mono resize-none"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddDocDialog(false);
                  setNewDocFilename('');
                  setNewDocContent('');
                  setEditingDoc(null);
                }}
                disabled={isUploadingDoc}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  if (!isUploadingDoc) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!newDocFilename || !newDocContent || isUploadingDoc}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: (newDocFilename && newDocContent && !isUploadingDoc) ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                  color: (newDocFilename && newDocContent && !isUploadingDoc) ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-default)',
                  cursor: (newDocFilename && newDocContent && !isUploadingDoc) ? 'pointer' : 'not-allowed'
                }}
              >
                {isUploadingDoc && <Loader2 size={14} className="animate-spin" />}
                {isUploadingDoc 
                  ? (editingDoc ? 'saving...' : 'adding...') 
                  : (editingDoc ? 'save changes' : 'add file')
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Documentation Confirmation Dialog */}
      {showDeleteDocDialog && docToDelete && (
        <>
          <div 
            className="fixed inset-0 z-60"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setShowDeleteDocDialog(false);
              setDocToDelete(null);
            }}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-70 rounded-xl p-6"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              delete documentation
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{docToDelete.filename}</strong>? this action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteDocDialog(false);
                  setDocToDelete(null);
                }}
                disabled={isDeletingDoc}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  if (!isDeletingDoc) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                cancel
              </button>
              <button
                onClick={handleDeleteDocument}
                disabled={isDeletingDoc}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ 
                  background: isDeletingDoc ? 'var(--bg-tertiary)' : 'var(--error)',
                  color: isDeletingDoc ? 'var(--text-muted)' : 'white',
                  cursor: isDeletingDoc ? 'not-allowed' : 'pointer'
                }}
              >
                {isDeletingDoc && <Loader2 size={14} className="animate-spin" />}
                {isDeletingDoc ? 'deleting...' : 'delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* View Documentation Dialog */}
      {showViewDocDialog && selectedDoc && (
        <>
          <div 
            className="fixed inset-0 z-60"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => {
              setShowViewDocDialog(false);
              setSelectedDoc(null);
            }}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[95vh] z-70 rounded-xl flex flex-col"
            style={{ 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              width: '60vw',
              height: '95vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {selectedDoc.filename}
                  </h3>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    created: {new Date(selectedDoc.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewDocDialog(false);
                    setSelectedDoc(null);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <pre 
                className="text-sm whitespace-pre-wrap font-mono"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedDoc.markdown_content}
              </pre>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function DetailRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div 
      className="flex items-center justify-between px-4 py-3"
      style={{ 
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)'
      }}
    >
      <span 
        className="text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <span 
        className="text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}
