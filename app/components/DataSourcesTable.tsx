'use client';

import { Fragment } from 'react';
import { CheckCircle, XCircle, ChevronRight, Clock, FileText } from 'lucide-react';
import { SiPostgresql, SiMysql, SiSqlite, SiMariadb, SiMongodb } from 'react-icons/si';
import { TbSql } from 'react-icons/tb';
import { DataSource } from './DataSourceSheet';

interface DataSourcesTableProps {
  dataSources: DataSource[];
  onRowClick: (dataSource: DataSource) => void;
}

const dbTypeConfig: Record<DataSource['type'], { label: string; color: string; icon: React.ReactNode }> = {
  postgresql: { label: 'PostgreSQL', color: '#336791', icon: <SiPostgresql size={18} /> },
  mysql: { label: 'MySQL', color: '#00758F', icon: <SiMysql size={18} /> },
  sqlserver: { label: 'SQL Server', color: '#5E5E5E', icon: <TbSql size={18} /> },
  sqlite: { label: 'SQLite', color: '#003B57', icon: <SiSqlite size={18} /> },
  mariadb: { label: 'MariaDB', color: '#003545', icon: <SiMariadb size={18} /> },
  mongodb: { label: 'MongoDB', color: '#47A248', icon: <SiMongodb size={18} /> },
};

export default function DataSourcesTable({ dataSources, onRowClick }: DataSourcesTableProps) {
  if (dataSources.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-16 px-4 rounded-xl"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <span className="text-3xl">🗄️</span>
        </div>
        <h3 
          className="font-medium mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          no data sources yet
        </h3>
        <p 
          className="text-sm text-center max-w-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          add your first database connection to start querying and visualizing your data.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <th 
              className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              name
            </th>
            <th 
              className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', width: '140px' }}
            >
              type
            </th>
            <th 
              className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', width: '200px' }}
            >
              host
            </th>
            <th 
              className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', width: '120px' }}
            >
              database
            </th>
            <th 
              className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', width: '100px' }}
            >
              status
            </th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {dataSources.map((source, index) => {
            const config = dbTypeConfig[source.type];
            const isLast = index === dataSources.length - 1;
            const hasDocumentation = source.documentation && source.documentation.length > 0;

            return (
              <Fragment key={source.id}>
                {/* Main data source row */}
                <tr
                  onClick={() => onRowClick(source)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: (hasDocumentation || !isLast) ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-tertiary)', color: config.color }}
                      >
                        {config.icon}
                      </div>
                      <span 
                        className="font-medium text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {source.name}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                      style={{ 
                        background: `${config.color}15`,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </span>
                  </td>

                  {/* Host */}
                  <td 
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {source.host}:{source.port}
                  </td>

                  {/* Database */}
                  <td 
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {source.database}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={source.status} lastSync={source.lastSync} />
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3">
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </td>
                </tr>

                {/* Documentation rows */}
                {hasDocumentation && source.documentation!.map((doc, docIndex) => {
                  const isLastDoc = docIndex === source.documentation!.length - 1 && isLast;
                  
                  return (
                    <tr
                      key={`${source.id}-doc-${doc.id}`}
                      onClick={() => onRowClick(source)}
                      className="cursor-pointer transition-colors"
                      style={{ 
                        background: 'var(--bg-tertiary)',
                        borderBottom: isLastDoc ? 'none' : '1px solid var(--border-subtle)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }}
                    >
                      <td className="px-4 py-1.5" colSpan={6}>
                        <div className="flex items-center gap-2 pl-11">
                          <FileText 
                            size={14} 
                            style={{ color: 'var(--text-muted)' }}
                          />
                          <span 
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {doc.filename}
                          </span>
                          <span 
                            className="text-[10px] ml-auto"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            id: {doc.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, lastSync }: { status: DataSource['status']; lastSync?: string }) {
  const config = {
    connected: { 
      label: 'connected', 
      bg: 'rgba(34, 197, 94, 0.1)', 
      color: '#22c55e',
      icon: <CheckCircle size={12} />
    },
    disconnected: { 
      label: 'offline', 
      bg: 'var(--bg-tertiary)', 
      color: 'var(--text-muted)',
      icon: <XCircle size={12} />
    },
    error: { 
      label: 'error', 
      bg: 'rgba(239, 68, 68, 0.1)', 
      color: '#ef4444',
      icon: <XCircle size={12} />
    },
    pending: { 
      label: 'not tested', 
      bg: 'var(--bg-tertiary)', 
      color: 'var(--text-muted)',
      icon: <Clock size={12} />
    },
  };

  const { label, bg, color, icon } = config[status];

  return (
    <div className="flex flex-col">
      <span 
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
        style={{ background: bg, color }}
      >
        {icon}
        {label}
      </span>
      {lastSync && (
        <span 
          className="text-[10px] mt-0.5 px-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {lastSync}
        </span>
      )}
    </div>
  );
}
