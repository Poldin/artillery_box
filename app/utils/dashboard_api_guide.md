# Dashboard API Guide for AI

## Overview
Le dashboards permettono agli utenti di salvare e visualizzare informazioni utili dalle conversazioni con l'AI.

## Struttura Dashboard

Una dashboard contiene:
- **name**: Nome della dashboard
- **description**: Descrizione opzionale
- **widgets**: Array di widget (JSON)

## Tipi di Widget

### 1. Chart Widget (Grafici Plotly)
```json
{
  "id": "widget-1",
  "type": "chart",
  "title": "Vendite mensili",
  "position": 0,
  "data": {
    "chartType": "bar",
    "plotlyConfig": {
      "data": [
        {
          "x": ["Jan", "Feb", "Mar"],
          "y": [100, 150, 200],
          "type": "bar"
        }
      ],
      "layout": {
        "title": "Sales Over Time"
      }
    }
  }
}
```

### 2. Table Widget (Tabelle Dati)
```json
{
  "id": "widget-2",
  "type": "table",
  "title": "Top Customers",
  "position": 1,
  "data": {
    "columns": ["Name", "Revenue", "Orders"],
    "rows": [
      ["Mario Rossi", "$5,000", "25"],
      ["Luigi Bianchi", "$4,500", "20"]
    ]
  }
}
```

### 3. Markdown Widget (Note/Testo)
```json
{
  "id": "widget-3",
  "type": "markdown",
  "title": "Important Notes",
  "position": 2,
  "data": {
    "content": "# KPI Summary\n\n- Revenue: $50K\n- Growth: +15%"
  }
}
```

### 4. Query Widget (Query SQL Salvate)
```json
{
  "id": "widget-4",
  "type": "query",
  "title": "Active Users Query",
  "position": 3,
  "data": {
    "query": "SELECT * FROM users WHERE active = true",
    "description": "Retrieves all active users",
    "datasourceId": "uuid-of-datasource"
  }
}
```

## API Endpoints

### GET /api/dashboards
Lista tutte le dashboards dell'utente.

**Response:**
```json
{
  "dashboards": [
    {
      "id": "uuid",
      "name": "Main Dashboard",
      "description": "My primary dashboard",
      "widgets": [...],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST /api/dashboards
Crea una nuova dashboard.

**Body:**
```json
{
  "name": "Sales Dashboard",
  "description": "Q1 2025 Sales",
  "widgets": []
}
```

### GET /api/dashboards/[id]
Ottieni una dashboard specifica.

### PUT /api/dashboards/[id]
Aggiorna una dashboard (inclusi i widget).

**Body:**
```json
{
  "name": "Updated Name",
  "widgets": [
    {
      "id": "widget-1",
      "type": "chart",
      "title": "New Chart",
      "position": 0,
      "data": {...}
    }
  ]
}
```

### DELETE /api/dashboards/[id]
Elimina una dashboard.

## Workflow per l'AI

1. **Creare una Dashboard:**
   ```
   POST /api/dashboards
   Body: { "name": "Analytics", "widgets": [] }
   ```

2. **Aggiungere Widget:**
   - Leggi la dashboard corrente (GET)
   - Aggiungi il nuovo widget all'array `widgets`
   - Aggiorna la dashboard (PUT)

3. **Riordinare Widget:**
   - Modifica il campo `position` di ogni widget
   - Aggiorna la dashboard (PUT)

4. **Modificare Widget:**
   - Trova il widget nell'array per `id`
   - Modifica i suoi dati
   - Aggiorna la dashboard (PUT)

## Best Practices

- Ogni widget deve avere un `id` unico
- Il campo `position` determina l'ordine di visualizzazione (0, 1, 2, ...)
- I grafici Plotly supportano molti tipi: `bar`, `line`, `scatter`, `pie`, etc.
- Le tabelle devono avere `columns` e `rows` allineati
- Il markdown supporta sintassi standard

## Esempio Completo

Creare una dashboard con 3 widget:

```json
{
  "name": "Q1 Sales Dashboard",
  "description": "Overview of Q1 2025 sales data",
  "widgets": [
    {
      "id": "sales-chart",
      "type": "chart",
      "title": "Monthly Revenue",
      "position": 0,
      "data": {
        "plotlyConfig": {
          "data": [{
            "x": ["Jan", "Feb", "Mar"],
            "y": [50000, 65000, 75000],
            "type": "bar",
            "marker": { "color": "#4CAF50" }
          }]
        }
      }
    },
    {
      "id": "top-products",
      "type": "table",
      "title": "Top 5 Products",
      "position": 1,
      "data": {
        "columns": ["Product", "Units", "Revenue"],
        "rows": [
          ["Widget A", "1,234", "$61,700"],
          ["Widget B", "987", "$49,350"]
        ]
      }
    },
    {
      "id": "notes",
      "type": "markdown",
      "title": "Key Insights",
      "position": 2,
      "data": {
        "content": "## Q1 Highlights\n\n- **15% growth** vs Q4\n- Widget A is top performer\n- Expand marketing in February"
      }
    }
  ]
}
```
