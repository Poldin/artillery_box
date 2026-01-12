# Dashboard API Guide for AI

## Overview
Le dashboards permettono agli utenti di salvare e visualizzare informazioni utili dalle conversazioni con l'AI.

## Struttura Dashboard

Una dashboard contiene:
- **name**: Nome della dashboard
- **description**: Descrizione opzionale
- **widgets**: Array di widget (JSON)

## Tipi di Widget

### Widget Statici vs Dinamici

I widget possono essere **statici** (dati salvati nel database) o **dinamici** (dati fetchati in tempo reale da data sources).

#### Widget Statici
- I dati sono salvati direttamente nel campo `data`
- Non cambiano fino a quando non vengono aggiornati manualmente
- Più veloci da renderizzare (nessuna query)

#### Widget Dinamici
- Hanno `isDynamic: true`
- Specificano una query nel campo `dataSource`
- Il template in `template` contiene placeholder `{{column_name}}`
- I dati vengono fetchati automaticamente all'apertura della dashboard
- Mostrano sempre dati aggiornati

### 1. Chart Widget (Grafici Plotly)

#### Statico:
```json
{
  "id": "widget-1",
  "type": "chart",
  "title": "Vendite mensili",
  "position": 0,
  "isDynamic": false,
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

#### Dinamico:
```json
{
  "id": "widget-1-dynamic",
  "type": "chart",
  "title": "Vendite mensili (Live)",
  "position": 0,
  "isDynamic": true,
  "dataSource": {
    "datasourceId": "uuid-of-datasource",
    "query": "SELECT month_name, total_sales FROM monthly_sales WHERE year = 2025"
  },
  "template": {
    "chartType": "bar",
    "plotlyConfig": {
      "data": [
        {
          "x": "{{month_name}}",
          "y": "{{total_sales}}",
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

#### Statico:
```json
{
  "id": "widget-2",
  "type": "table",
  "title": "Top Customers",
  "position": 1,
  "isDynamic": false,
  "data": {
    "columns": ["Name", "Revenue", "Orders"],
    "rows": [
      ["Mario Rossi", "$5,000", "25"],
      ["Luigi Bianchi", "$4,500", "20"]
    ]
  }
}
```

#### Dinamico:
```json
{
  "id": "widget-2-dynamic",
  "type": "table",
  "title": "Top Customers (Live)",
  "position": 1,
  "isDynamic": true,
  "dataSource": {
    "datasourceId": "uuid-of-datasource",
    "query": "SELECT name, revenue, order_count FROM customers ORDER BY revenue DESC LIMIT 10"
  },
  "template": {
    "columns": ["Name", "Revenue", "Orders"],
    "rows": "{{*}}"
  }
}
```

**Nota per tabelle dinamiche:** 
- Usa `"rows": "{{*}}"` per mappare automaticamente tutte le righe
- Le colonne devono corrispondere ai nomi nel risultato della query
- Il sistema converte automaticamente il risultato in formato rows

### 3. Markdown Widget (Note/Testo)

#### Statico:
```json
{
  "id": "widget-3",
  "type": "markdown",
  "title": "Important Notes",
  "position": 2,
  "isDynamic": false,
  "data": {
    "content": "# KPI Summary\n\n- Revenue: $50K\n- Growth: +15%"
  }
}
```

#### Dinamico:
```json
{
  "id": "widget-3-dynamic",
  "type": "markdown",
  "title": "Daily Report (Live)",
  "position": 2,
  "isDynamic": true,
  "dataSource": {
    "datasourceId": "uuid-of-datasource",
    "query": "SELECT CURRENT_DATE as report_date, SUM(amount) as total_sales, COUNT(*) as order_count, (SELECT name FROM customers ORDER BY total_spent DESC LIMIT 1) as top_customer FROM orders WHERE date = CURRENT_DATE"
  },
  "template": {
    "content": "# Daily Report {{report_date}}\n\n**Total Sales:** ${{total_sales}}\n**Orders Completed:** {{order_count}}\n**Top Customer:** {{top_customer}}\n\n---\n*Last updated: now*"
  }
}
```

**Nota per markdown dinamici:**
- La query dovrebbe ritornare **UNA SOLA RIGA** (usa aggregazioni o LIMIT 1)
- Ogni `{{column_name}}` viene sostituito con il valore dalla prima riga
- Ideale per report, KPI summaries, status updates

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

## Sintassi Placeholder per Widget Dinamici

### Come funzionano i placeholder

I placeholder `{{column_name}}` nel template vengono sostituiti con i dati reali dalla query:

1. **Query eseguita:**
   ```sql
   SELECT month, revenue, orders FROM sales_2025
   ```
   
2. **Risultato:**
   ```json
   [
     {"month": "Jan", "revenue": 50000, "orders": 120},
     {"month": "Feb", "revenue": 65000, "orders": 145},
     {"month": "Mar", "revenue": 75000, "orders": 180}
   ]
   ```

3. **Template con placeholder:**
   ```json
   {
     "x": "{{month}}",
     "y": "{{revenue}}",
     "type": "bar"
   }
   ```

4. **Risultato hydratato:**
   ```json
   {
     "x": ["Jan", "Feb", "Mar"],
     "y": [50000, 65000, 75000],
     "type": "bar"
   }
   ```

### Regole per i placeholder

- Usa `{{column_name}}` dove `column_name` è il nome della colonna nel risultato SQL
- I placeholder vengono convertiti in array con tutti i valori della colonna
- Funziona per qualsiasi tipo di dato (stringhe, numeri, date)
- Per tabelle, usa `"rows": "{{*}}"` per mappare automaticamente tutte le righe

## Best Practices

### Widget Statici
- Usa widget statici quando i dati non cambiano frequentemente
- Più veloci da renderizzare (no query al caricamento)
- Ideali per snapshot, report storici, note

### Widget Dinamici
- Usa widget dinamici quando servono dati sempre aggiornati
- Query ottimizzate: evita `SELECT *`, specifica le colonne necessarie
- Limita i risultati con `LIMIT` per query grandi
- Testa le query prima su data sources connessi
- Gestisci errori: il sistema mostra un messaggio ma mantiene dati vecchi

### Generali
- Ogni widget deve avere un `id` unico
- Il campo `position` determina l'ordine di visualizzazione (0, 1, 2, ...)
- I grafici Plotly supportano molti tipi: `bar`, `line`, `scatter`, `pie`, etc.
- Le tabelle devono avere `columns` e `rows` allineati
- Il markdown supporta sintassi standard

## Esempio Completo: Dashboard Mista (Statici + Dinamici)

Creare una dashboard con widget statici e dinamici:

```json
{
  "name": "Q1 Sales Dashboard",
  "description": "Overview of Q1 2025 sales data",
  "widgets": [
    {
      "id": "sales-chart-live",
      "type": "chart",
      "title": "Monthly Revenue (Live)",
      "position": 0,
      "isDynamic": true,
      "dataSource": {
        "datasourceId": "postgres-sales-db",
        "query": "SELECT month_name, SUM(amount) as revenue FROM orders WHERE year = 2025 GROUP BY month_name ORDER BY month_num"
      },
      "template": {
        "plotlyConfig": {
          "data": [{
            "x": "{{month_name}}",
            "y": "{{revenue}}",
            "type": "bar",
            "marker": { "color": "#4CAF50" }
          }],
          "layout": {
            "title": "Revenue Trend"
          }
        }
      }
    },
    {
      "id": "top-products-live",
      "type": "table",
      "title": "Top 5 Products (Live)",
      "position": 1,
      "isDynamic": true,
      "dataSource": {
        "datasourceId": "postgres-sales-db",
        "query": "SELECT product_name, units_sold, total_revenue FROM products ORDER BY total_revenue DESC LIMIT 5"
      },
      "template": {
        "columns": ["Product", "Units", "Revenue"],
        "rows": "{{*}}"
      }
    },
    {
      "id": "notes",
      "type": "markdown",
      "title": "Key Insights",
      "position": 2,
      "isDynamic": false,
      "data": {
        "content": "## Q1 Highlights\n\n- **15% growth** vs Q4\n- Widget A is top performer\n- Expand marketing in February"
      }
    }
  ]
}
```

### Workflow per creare widget dinamici

1. **Identifica la data source:**
   - Chiedi all'utente quale database usare
   - Usa l'ID della data source in `datasourceId`

2. **Scrivi la query:**
   - Query SQL standard per SQL databases
   - JSON per MongoDB: `{"collection": "...", "query": {...}}`
   - Testa sempre la query per verificare i nomi delle colonne

3. **Crea il template:**
   - Usa `{{column_name}}` per ogni colonna della query
   - Per tabelle: `"rows": "{{*}}"` mappa automaticamente

4. **Salva nella dashboard:**
   - Aggiungi il widget all'array `widgets`
   - Il sistema fetch automaticamente i dati all'apertura
