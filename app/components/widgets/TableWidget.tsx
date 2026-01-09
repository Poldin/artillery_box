'use client';

interface TableWidgetProps {
  title: string;
  columns: string[];
  rows: unknown[][];
}

export default function TableWidget({ title, columns, rows }: TableWidgetProps) {
  return (
    <div 
      className="rounded-xl p-4 h-full flex flex-col"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <h3 
        className="text-sm font-medium mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
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
