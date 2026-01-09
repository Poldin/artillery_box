'use client';

import dynamic from 'next/dynamic';

// Importa Plotly dinamicamente per evitare problemi SSR
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartWidgetProps {
  title: string;
  plotlyConfig: {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
  };
}

export default function ChartWidget({ title, plotlyConfig }: ChartWidgetProps) {
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
      <div className="flex-1 min-h-0">
        <Plot
          data={plotlyConfig.data}
          layout={{
            autosize: true,
            margin: { l: 40, r: 20, t: 20, b: 40 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: 'var(--text-primary)' },
            ...plotlyConfig.layout,
          }}
          config={{
            responsive: true,
            displayModeBar: false,
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}
