'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar';
import DataSourcesTable from '../components/DataSourcesTable';
import DataSourceSheet, { DataSource } from '../components/DataSourceSheet';
import AddDataSourceModal from '../components/AddDataSourceModal';
import ConnectionTestDialog from '../components/ConnectionTestDialog';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  latency?: string;
}

// Tipo per il risultato del test salvato nel DB
interface LastTestResult {
  success: boolean;
  message?: string;
  error?: string;
  latency?: string;
  testedAt: string;
}

// Trasforma i dati dal DB al formato del componente
function mapDbToDataSource(dbSource: {
  id: string;
  source_name: string;
  config: Record<string, unknown>;
  created_at: string;
}): DataSource {
  const config = dbSource.config || {};
  const lastTest = config.lastTest as LastTestResult | undefined;
  
  // Determina lo status in base all'ultimo test
  let status: DataSource['status'] = 'pending';
  let lastSync: string | undefined;
  
  if (lastTest) {
    status = lastTest.success ? 'connected' : 'error';
    // Formatta la data dell'ultimo test
    const testDate = new Date(lastTest.testedAt);
    const now = new Date();
    const diffMs = now.getTime() - testDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      lastSync = 'Just now';
    } else if (diffMins < 60) {
      lastSync = `${diffMins} min ago`;
    } else if (diffHours < 24) {
      lastSync = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      lastSync = `${diffDays}d ago`;
    } else {
      lastSync = testDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  return {
    id: dbSource.id,
    name: dbSource.source_name,
    type: (config.type as DataSource['type']) || 'postgresql',
    host: config.host as string,
    port: config.port as number,
    database: config.database as string,
    username: config.username as string,
    sslMode: config.sslMode as DataSource['sslMode'],
    schema: config.schema as string,
    charset: config.charset as string,
    encrypt: config.encrypt as boolean,
    trustServerCertificate: config.trustServerCertificate as boolean,
    instanceName: config.instanceName as string,
    filePath: config.filePath as string,
    authDatabase: config.authDatabase as string,
    replicaSet: config.replicaSet as string,
    tls: config.tls as boolean,
    status,
    lastSync,
    createdAt: new Date(dbSource.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export default function DataSourcesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  
  // Test connection state
  const [testingSource, setTestingSource] = useState<DataSource | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Fetch data sources
  const fetchDataSources = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const data = await response.json();
        const sources = data.dataSources.map(mapDbToDataSource);
        
        // Fetch documentation for each data source
        const sourcesWithDocs = await Promise.all(
          sources.map(async (source: DataSource) => {
            try {
              const docsResponse = await fetch(`/api/data-sources/${source.id}/documentation`);
              if (docsResponse.ok) {
                const docsData = await docsResponse.json();
                return { ...source, documentation: docsData.documents };
              }
            } catch (error) {
              console.error(`Failed to fetch documentation for ${source.id}:`, error);
            }
            return { ...source, documentation: [] };
          })
        );
        
        setDataSources(sourcesWithDocs);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDataSources();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading, fetchDataSources]);

  const handleAddDataSource = async (newSource: Omit<DataSource, 'id' | 'status' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSource.name,
          type: newSource.type,
          config: {
            host: newSource.host,
            port: newSource.port,
            database: newSource.database,
            username: newSource.username,
            password: (newSource as Record<string, unknown>).password,
            sslMode: newSource.sslMode,
            schema: newSource.schema,
            charset: newSource.charset,
            encrypt: newSource.encrypt,
            trustServerCertificate: newSource.trustServerCertificate,
            instanceName: newSource.instanceName,
            filePath: newSource.filePath,
            authDatabase: newSource.authDatabase,
            replicaSet: newSource.replicaSet,
            tls: newSource.tls,
          },
        }),
      });

      if (response.ok) {
        await fetchDataSources();
      }
    } catch (error) {
      console.error('Failed to add data source:', error);
    }
  };

  const handleEditDataSource = async (id: string, updatedSource: Omit<DataSource, 'id' | 'status' | 'createdAt'>) => {
    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedSource.name,
          type: updatedSource.type,
          config: {
            host: updatedSource.host,
            port: updatedSource.port,
            database: updatedSource.database,
            username: updatedSource.username,
            password: (updatedSource as Record<string, unknown>).password,
            sslMode: updatedSource.sslMode,
            schema: updatedSource.schema,
            charset: updatedSource.charset,
            encrypt: updatedSource.encrypt,
            trustServerCertificate: updatedSource.trustServerCertificate,
            instanceName: updatedSource.instanceName,
            filePath: updatedSource.filePath,
            authDatabase: updatedSource.authDatabase,
            replicaSet: updatedSource.replicaSet,
            tls: updatedSource.tls,
          },
        }),
      });

      if (response.ok) {
        await fetchDataSources();
        setSelectedSource(null);
      }
    } catch (error) {
      console.error('Failed to update data source:', error);
    }
  };

  const handleOpenEdit = (dataSource: DataSource) => {
    setEditingSource(dataSource);
    setSelectedSource(null);
  };

  const handleDeleteDataSource = async (id: string) => {
    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDataSources(dataSources.filter(ds => ds.id !== id));
        setSelectedSource(null);
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  };

  const handleTestConnection = async (id: string) => {
    const source = dataSources.find(ds => ds.id === id);
    if (!source) return;

    setTestingSource(source);
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/data-sources/${id}/test`, {
        method: 'POST',
      });

      const result = await response.json();
      setTestResult(result);

      // Ricarica i dati dal server per avere lo stato aggiornato
      const refreshResponse = await fetch('/api/data-sources');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const updatedSources = data.dataSources.map(mapDbToDataSource);
        setDataSources(updatedSources);
        
        // Aggiorna anche selectedSource se aperto
        if (selectedSource) {
          const updatedSelected = updatedSources.find((ds: DataSource) => ds.id === selectedSource.id);
          if (updatedSelected) {
            setSelectedSource(updatedSelected);
          }
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test connection. Please try again.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCloseTestDialog = () => {
    setTestingSource(null);
    setTestResult(null);
  };

  const handleRetryTest = () => {
    if (testingSource) {
      handleTestConnection(testingSource.id);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 
                className="text-xl font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                data sources
              </h1>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                manage your database connections
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!user}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ 
                background: 'var(--bg-tertiary)',
                color: user ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                cursor: user ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (user) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = user ? 'var(--text-secondary)' : 'var(--text-muted)';
              }}
            >
              <Plus size={16} />
              add source
            </button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : dataSources.length === 0 ? (
            /* Empty State */
            <div 
              className="text-center py-12 rounded-xl"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <p style={{ color: 'var(--text-secondary)' }}>
                No data sources yet.
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Click &quot;add source&quot; to connect your first database.
              </p>
            </div>
          ) : (
            /* Data Sources Table */
            <DataSourcesTable 
              dataSources={dataSources}
              onRowClick={setSelectedSource}
            />
          )}
        </div>
      </div>

      {/* Side Sheet */}
      <DataSourceSheet
        dataSource={selectedSource}
        onClose={() => setSelectedSource(null)}
        onDelete={handleDeleteDataSource}
        onTestConnection={handleTestConnection}
        onEdit={handleOpenEdit}
        onDocumentationChange={async () => {
          await fetchDataSources();
          // Aggiorna anche il selectedSource con i dati freschi
          if (selectedSource) {
            const response = await fetch(`/api/data-sources/${selectedSource.id}/documentation`);
            if (response.ok) {
              const docsData = await response.json();
              setSelectedSource({ ...selectedSource, documentation: docsData.documents });
            }
          }
        }}
      />

      {/* Add Modal */}
      <AddDataSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddDataSource}
      />

      {/* Edit Modal */}
      <AddDataSourceModal
        isOpen={!!editingSource}
        onClose={() => setEditingSource(null)}
        onAdd={handleAddDataSource}
        onEdit={handleEditDataSource}
        dataSourceToEdit={editingSource}
      />

      {/* Connection Test Dialog */}
      <ConnectionTestDialog
        isOpen={!!testingSource}
        isLoading={isTestingConnection}
        result={testResult}
        dataSourceName={testingSource?.name || ''}
        onClose={handleCloseTestDialog}
        onRetry={handleRetryTest}
      />
    </div>
  );
}
