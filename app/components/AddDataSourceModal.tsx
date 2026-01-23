'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { SiPostgresql, SiMysql, SiSqlite, SiMariadb, SiMongodb } from 'react-icons/si';
import { TbSql } from 'react-icons/tb';
import { DataSource } from './DataSourceSheet';

interface AddDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dataSource: Omit<DataSource, 'id' | 'status' | 'createdAt'>) => void;
  onEdit?: (id: string, dataSource: Omit<DataSource, 'id' | 'status' | 'createdAt'>) => void;
  dataSourceToEdit?: DataSource | null;
}

type DatabaseType = DataSource['type'];

interface DatabaseOption {
  type: DatabaseType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  defaultPort: number;
}

const databaseOptions: DatabaseOption[] = [
  { type: 'postgresql', label: 'PostgreSQL', icon: <SiPostgresql size={24} />, color: '#336791', description: 'advanced open-source relational database', defaultPort: 5432 },
  { type: 'mysql', label: 'MySQL', icon: <SiMysql size={24} />, color: '#00758F', description: 'popular open-source relational database', defaultPort: 3306 },
  { type: 'mariadb', label: 'MariaDB', icon: <SiMariadb size={24} />, color: '#003545', description: 'MySQL-compatible database fork', defaultPort: 3306 },
  { type: 'sqlserver', label: 'SQL Server', icon: <TbSql size={24} />, color: '#5E5E5E', description: 'Microsoft enterprise database', defaultPort: 1433 },
  { type: 'sqlite', label: 'SQLite', icon: <SiSqlite size={24} />, color: '#003B57', description: 'lightweight file-based database', defaultPort: 0 },
  { type: 'mongodb', label: 'MongoDB', icon: <SiMongodb size={24} />, color: '#47A248', description: 'NoSQL document database', defaultPort: 27017 },
];

export default function AddDataSourceModal({ isOpen, onClose, onAdd, onEdit, dataSourceToEdit }: AddDataSourceModalProps) {
  const isEditMode = !!dataSourceToEdit;
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedType, setSelectedType] = useState<DatabaseOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Common form state
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // PostgreSQL specific
  const [sslMode, setSslMode] = useState<'disable' | 'require' | 'verify-ca' | 'verify-full'>('disable');
  const [schema, setSchema] = useState('');
  
  // MySQL/MariaDB specific
  const [charset, setCharset] = useState('utf8mb4');
  const [mysqlSsl, setMysqlSsl] = useState(false);
  
  // SQL Server specific
  const [encrypt, setEncrypt] = useState(true);
  const [trustServerCertificate, setTrustServerCertificate] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  
  // SQLite specific
  const [filePath, setFilePath] = useState('');
  
  // MongoDB specific
  const [authDatabase, setAuthDatabase] = useState('admin');
  const [replicaSet, setReplicaSet] = useState('');
  const [tls, setTls] = useState(false);

  // Pre-populate form when editing
  useEffect(() => {
    if (dataSourceToEdit && isOpen) {
      const dbOption = databaseOptions.find(opt => opt.type === dataSourceToEdit.type);
      setSelectedType(dbOption || null);
      setStep('configure');
      
      // Common fields
      setName(dataSourceToEdit.name);
      setHost(dataSourceToEdit.host || '');
      setPort(dataSourceToEdit.port?.toString() || '');
      setDatabase(dataSourceToEdit.database || '');
      setUsername(dataSourceToEdit.username || '');
      setPassword(''); // Don't pre-fill password for security
      
      // PostgreSQL
      setSslMode(dataSourceToEdit.sslMode || 'disable');
      setSchema(dataSourceToEdit.schema || '');
      
      // MySQL/MariaDB
      setCharset(dataSourceToEdit.charset || 'utf8mb4');
      setMysqlSsl(dataSourceToEdit.sslMode === 'require');
      
      // SQL Server
      setEncrypt(dataSourceToEdit.encrypt ?? true);
      setTrustServerCertificate(dataSourceToEdit.trustServerCertificate ?? false);
      setInstanceName(dataSourceToEdit.instanceName || '');
      
      // SQLite
      setFilePath(dataSourceToEdit.filePath || '');
      
      // MongoDB
      setAuthDatabase(dataSourceToEdit.authDatabase || 'admin');
      setReplicaSet(dataSourceToEdit.replicaSet || '');
      setTls(dataSourceToEdit.tls ?? false);
    }
  }, [dataSourceToEdit, isOpen]);

  const resetForm = () => {
    setStep('select');
    setSelectedType(null);
    setName('');
    setHost('');
    setPort('');
    setDatabase('');
    setUsername('');
    setPassword('');
    setSslMode('disable');
    setSchema('');
    setCharset('utf8mb4');
    setMysqlSsl(false);
    setEncrypt(true);
    setTrustServerCertificate(false);
    setInstanceName('');
    setFilePath('');
    setAuthDatabase('admin');
    setReplicaSet('');
    setTls(false);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectType = (option: DatabaseOption) => {
    setSelectedType(option);
    if (option.defaultPort > 0) {
      setPort(option.defaultPort.toString());
    }
    setStep('configure');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setIsLoading(true);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));

    const baseData: Omit<DataSource, 'id' | 'status' | 'createdAt'> = {
      name,
      type: selectedType.type,
    };

    let finalData: Omit<DataSource, 'id' | 'status' | 'createdAt'>;

    // Add type-specific fields
    if (selectedType.type === 'sqlite') {
      finalData = { ...baseData, filePath };
    } else if (selectedType.type === 'postgresql') {
      finalData = { 
        ...baseData, 
        host, 
        port: parseInt(port), 
        database, 
        username,
        password: password || undefined,  // Include password
        sslMode,
        schema: schema || undefined
      } as Omit<DataSource, 'id' | 'status' | 'createdAt'> & { password?: string };
    } else if (selectedType.type === 'mysql' || selectedType.type === 'mariadb') {
      finalData = { 
        ...baseData, 
        host, 
        port: parseInt(port), 
        database, 
        username,
        password: password || undefined,  // Include password
        sslMode: mysqlSsl ? 'require' : 'disable',
        charset
      } as Omit<DataSource, 'id' | 'status' | 'createdAt'> & { password?: string };
    } else if (selectedType.type === 'sqlserver') {
      finalData = { 
        ...baseData, 
        host, 
        port: parseInt(port), 
        database, 
        username,
        password: password || undefined,  // Include password
        encrypt,
        trustServerCertificate,
        instanceName: instanceName || undefined
      } as Omit<DataSource, 'id' | 'status' | 'createdAt'> & { password?: string };
    } else if (selectedType.type === 'mongodb') {
      finalData = { 
        ...baseData, 
        host, 
        port: parseInt(port), 
        database, 
        username: username || undefined,
        password: password || undefined,  // Include password
        authDatabase,
        replicaSet: replicaSet || undefined,
        tls
      } as Omit<DataSource, 'id' | 'status' | 'createdAt'> & { password?: string };
    } else {
      finalData = baseData;
    }

    if (isEditMode && dataSourceToEdit && onEdit) {
      onEdit(dataSourceToEdit.id, finalData);
    } else {
      onAdd(finalData);
    }

    handleClose();
  };

  const isFormValid = () => {
    if (!name) return false;
    
    if (selectedType?.type === 'sqlite') {
      return !!filePath;
    }
    
    if (!host || !port || !database) return false;
    
    // MongoDB can work without auth
    if (selectedType?.type === 'mongodb') {
      return true;
    }
    
    // In edit mode, password is optional (keep existing if not changed)
    if (isEditMode) {
      return !!username;
    }
    
    return !!username && !!password;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            {step === 'configure' && !isEditMode && (
              <button
                onClick={() => setStep('select')}
                className="p-1 rounded-lg transition-colors"
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
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {isEditMode 
                  ? `edit ${selectedType?.label} connection`
                  : step === 'select' 
                    ? 'add data source' 
                    : `connect to ${selectedType?.label}`
                }
              </h2>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isEditMode 
                  ? 'update connection details'
                  : step === 'select' 
                    ? 'choose a database type' 
                    : 'enter connection details'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
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
        {step === 'select' ? (
          <div className="p-4 grid grid-cols-2 gap-3 overflow-auto">
            {databaseOptions.map((option) => {
              const isAvailable = option.type === 'postgresql';
              
              return (
                <button
                  key={option.type}
                  onClick={() => isAvailable && handleSelectType(option)}
                  disabled={!isAvailable}
                  className="flex items-start gap-3 p-4 rounded-xl text-left transition-all relative"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    opacity: isAvailable ? 1 : 0.6,
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      color: isAvailable ? option.color : 'var(--text-muted)'
                    }}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 
                        className="font-medium text-sm"
                        style={{ color: isAvailable ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {option.label}
                      </h3>
                      {!isAvailable && (
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ 
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-muted)',
                            fontSize: '10px'
                          }}
                        >
                          coming soon
                        </span>
                      )}
                    </div>
                    <p 
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {option.description}
                    </p>
                  </div>
                  {isAvailable && (
                    <ChevronRight 
                      size={16} 
                      className="shrink-0 mt-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
            <div className="p-6 space-y-4">
              {/* Connection Name - always shown */}
              <FormInput
                label="connection name"
                value={name}
                onChange={setName}
                placeholder="my production database"
              />

              {/* SQLite specific fields */}
              {selectedType?.type === 'sqlite' && (
                <FormInput
                  label="file path"
                  value={filePath}
                  onChange={setFilePath}
                  placeholder="/path/to/database.db"
                />
              )}

              {/* Non-SQLite databases */}
              {selectedType?.type !== 'sqlite' && (
                <>
                  {/* Host & Port */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormInput
                        label="host"
                        value={host}
                        onChange={setHost}
                        placeholder="localhost"
                      />
                    </div>
                    <FormInput
                      label="port"
                      value={port}
                      onChange={setPort}
                      placeholder={selectedType?.defaultPort.toString() || ''}
                    />
                  </div>

                  {/* Database */}
                  <FormInput
                    label="database"
                    value={database}
                    onChange={setDatabase}
                    placeholder={selectedType?.type === 'mongodb' ? 'mydb' : 'my_database'}
                  />

                  {/* Username & Password - optional for MongoDB */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label={selectedType?.type === 'mongodb' ? 'username (optional)' : 'username'}
                      value={username}
                      onChange={setUsername}
                      placeholder={selectedType?.type === 'postgresql' ? 'postgres' : selectedType?.type === 'mysql' || selectedType?.type === 'mariadb' ? 'root' : selectedType?.type === 'sqlserver' ? 'sa' : 'admin'}
                    />
                    <FormInput
                      label={selectedType?.type === 'mongodb' ? 'password (optional)' : 'password'}
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      type="password"
                    />
                  </div>

                  {/* PostgreSQL specific options */}
                  {selectedType?.type === 'postgresql' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <FormSelect
                          label="ssl mode"
                          value={sslMode}
                          onChange={(v) => setSslMode(v as typeof sslMode)}
                          options={[
                            { value: 'disable', label: 'disable' },
                            { value: 'require', label: 'require' },
                            { value: 'verify-ca', label: 'verify-ca' },
                            { value: 'verify-full', label: 'verify-full' },
                          ]}
                        />
                        <FormInput
                          label="schema (optional)"
                          value={schema}
                          onChange={setSchema}
                          placeholder="public"
                        />
                      </div>
                    </>
                  )}

                  {/* MySQL/MariaDB specific options */}
                  {(selectedType?.type === 'mysql' || selectedType?.type === 'mariadb') && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormSelect
                        label="charset"
                        value={charset}
                        onChange={setCharset}
                        options={[
                          { value: 'utf8mb4', label: 'utf8mb4' },
                          { value: 'utf8', label: 'utf8' },
                          { value: 'latin1', label: 'latin1' },
                        ]}
                      />
                      <FormCheckbox
                        label="use ssl"
                        checked={mysqlSsl}
                        onChange={setMysqlSsl}
                      />
                    </div>
                  )}

                  {/* SQL Server specific options */}
                  {selectedType?.type === 'sqlserver' && (
                    <>
                      <FormInput
                        label="instance name (optional)"
                        value={instanceName}
                        onChange={setInstanceName}
                        placeholder="SQLEXPRESS"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormCheckbox
                          label="encrypt connection"
                          checked={encrypt}
                          onChange={setEncrypt}
                        />
                        <FormCheckbox
                          label="trust server certificate"
                          checked={trustServerCertificate}
                          onChange={setTrustServerCertificate}
                        />
                      </div>
                    </>
                  )}

                  {/* MongoDB specific options */}
                  {selectedType?.type === 'mongodb' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          label="auth database"
                          value={authDatabase}
                          onChange={setAuthDatabase}
                          placeholder="admin"
                        />
                        <FormInput
                          label="replica set (optional)"
                          value={replicaSet}
                          onChange={setReplicaSet}
                          placeholder="rs0"
                        />
                      </div>
                      <FormCheckbox
                        label="use tls/ssl"
                        checked={tls}
                        onChange={setTls}
                      />
                    </>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div 
              className="flex items-center justify-end gap-3 px-6 py-4 border-t sticky bottom-0"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ 
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-tertiary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                style={{ 
                  background: isFormValid() ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                  color: isFormValid() ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: isFormValid() ? '1px solid var(--border-default)' : '1px solid var(--border-subtle)',
                  cursor: isFormValid() ? 'pointer' : 'not-allowed',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading 
                  ? (isEditMode ? 'saving...' : 'connecting...') 
                  : (isEditMode ? 'save changes' : 'connect')
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Reusable form components
function FormInput({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text' 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label 
        className="block text-sm mb-1.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
        style={{ 
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)'
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );
}

function FormSelect({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label 
        className="block text-sm mb-1.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors cursor-pointer"
        style={{ 
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)'
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormCheckbox({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center h-full pt-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded cursor-pointer"
          style={{ accentColor: 'var(--accent-primary)' }}
        />
        <span 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </label>
    </div>
  );
}
