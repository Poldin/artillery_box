'use client';

import WidgetHeader from './WidgetHeader';

interface TableWidgetProps {
  title: string;
  columns: string[];
  rows: unknown[][];
  updatedAt?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
  isDynamic?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  fetchError?: string;
}

export default function TableWidget({ 
  title, 
  columns, 
  rows, 
  updatedAt, 
  onDelete, 
  isDeleting, 
  readOnly = false,
  isDynamic,
  onRefresh,
  isRefreshing,
  fetchError
}: TableWidgetProps) {
  return (
    <div 
      className="rounded-xl p-4 h-full flex flex-col"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <WidgetHeader 
        title={title}
        updatedAt={updatedAt}
        onDelete={onDelete}
        isDeleting={isDeleting}
        readOnly={readOnly}
        isDynamic={isDynamic}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        fetchError={fetchError}
      />
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {columns.map((col, i) => (
                <th 
                  key={i}
                  className="text-left px-3 py-2 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr 
                key={i}
                style={{ 
                  borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                }}
              >
                {row.map((cell, j) => (
                  <td 
                    key={j}
                    className="px-3 py-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
