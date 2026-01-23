# 📊 VETRINAE - Business Intelligence con AI

## Panoramica Generale

**Vetrinae** è una piattaforma di Business Intelligence alimentata dall'Intelligenza Artificiale che permette alle aziende di connettersi ai propri database, analizzare i dati attraverso conversazioni naturali con un assistente AI (Claude di Anthropic) e creare dashboard interattive con grafici, tabelle e report.

---

## 🎯 FUNZIONALITÀ PRINCIPALI

### 1. 💬 CHAT AI INTELLIGENTE

**Descrizione:** Un assistente AI conversazionale integrato che permette agli utenti di analizzare dati usando il linguaggio naturale.

**Caratteristiche:**
- **Conversazioni in linguaggio naturale** - Basta chiedere "Mostrami le vendite del mese scorso" invece di scrivere query SQL
- **Modelli Claude multipli** - Scelta tra Claude Opus 4.5 (più potente), Sonnet 4.5 (bilanciato) e Haiku 4.5 (più veloce)
- **Cronologia chat salvata** - Tutte le conversazioni vengono automaticamente salvate e sono recuperabili
- **Generazione automatica titoli** - I titoli delle chat vengono generati automaticamente dall'AI per facilitare l'organizzazione
- **Pannello ridimensionabile** - Interfaccia flessibile che si adatta alle esigenze dell'utente
- **Feedback sui messaggi** - Possibilità di valutare le risposte con thumbs up/down
- **Copia messaggi** - Facile copia del contenuto per condivisione

**Benefici per il cliente:**
- Zero conoscenze tecniche richieste
- Analisi dati accessibile a tutti i dipendenti
- Risposte immediate alle domande di business

---

### 2. 🔌 CONNESSIONE MULTI-DATABASE

**Descrizione:** Supporto nativo per i principali database aziendali con configurazione guidata.

**Database Supportati:**

| Database | Caratteristiche |
|----------|-----------------|
| **PostgreSQL** | SSL, schema personalizzato |
| **MySQL/MariaDB** | Charset, SSL opzionale |
| **Microsoft SQL Server** | Encrypt, Trust Certificate, Instance Name |
| **MongoDB** | Auth Database, Replica Set, TLS |
| **SQLite** | File locale, sola lettura |

**Funzionalità:**
- **Test connessione integrato** - Verifica immediata della connettività con feedback visivo
- **Crittografia password** - Le credenziali sono cifrate e archiviate in modo sicuro
- **Indicatore stato connessione** - Verde (connesso), Rosso (errore), Grigio (pending)
- **Timestamp ultimo test** - Visualizzazione dell'ultimo controllo effettuato
- **Latenza connessione** - Misurazione del tempo di risposta del database

**Benefici per il cliente:**
- Integrazione con infrastruttura esistente
- Nessuna migrazione dati necessaria
- Sicurezza enterprise-grade

---

### 3. 📚 DOCUMENTAZIONE DATABASE

**Descrizione:** Sistema per allegare documentazione in Markdown a ogni data source.

**Funzionalità:**
- **File Markdown multipli** - Ogni database può avere più documenti allegati
- **Editing in-app** - Modifica diretta della documentazione
- **Contesto per l'AI** - La documentazione viene usata dall'AI per capire meglio la struttura dati
- **Descrizioni tabelle/colonne** - Permette di spiegare il significato dei campi

**Benefici per il cliente:**
- L'AI comprende meglio il contesto aziendale
- Risposte più accurate e pertinenti
- Knowledge base centralizzata

---

### 4. 📈 DASHBOARD INTERATTIVE

**Descrizione:** Sistema completo per creare e gestire dashboard personalizzate con widget dinamici.

**Funzionalità:**
- **Dashboard multiple** - Ogni utente può creare dashboard illimitate
- **Selezione rapida** - Dropdown per passare tra dashboard
- **Descrizione dashboard** - Campo opzionale per documentare lo scopo
- **Persistenza** - L'ultima dashboard usata viene ricordata
- **Modifica/Eliminazione** - Gestione completa del ciclo di vita

**Tipi di Widget:**

| Widget | Uso | Statico/Dinamico |
|--------|-----|------------------|
| **Chart (Grafici Plotly)** | Bar, Line, Pie, Scatter, etc. | Entrambi ✓ |
| **Table (Tabelle)** | Dati tabulari | Entrambi ✓ |
| **Markdown** | Note, KPI, testi | Entrambi ✓ |
| **Query** | Query SQL salvate | Solo statico |

**Widget Dinamici (⚡ Live Data):**
- Dati aggiornati automaticamente all'apertura della dashboard
- Refresh manuale con un click
- Template con placeholder `{{colonna}}`
- Indicatore visivo ⚡ per identificarli

**Benefici per il cliente:**
- Visualizzazioni sempre aggiornate
- Zero manutenzione dei dati nei widget
- Report automatizzati

---

### 5. 🔗 CONDIVISIONE DASHBOARD

**Descrizione:** Sistema per condividere dashboard con link pubblico.

**Funzionalità:**
- **Toggle condivisione** - On/Off con un click
- **Link univoco** - URL dedicato tipo `app.vetrinae.com/dashare/abc123`
- **Copia link** - Pulsante per copiare negli appunti
- **Accesso senza login** - Chiunque con il link può visualizzare
- **Solo lettura** - I visitatori non possono modificare

**Benefici per il cliente:**
- Condivisione rapida con stakeholder
- Nessun account richiesto per visualizzare
- Report per clienti e management

---

### 6. ✏️ EDITOR JSON AVANZATO

**Descrizione:** Editor per utenti tecnici che vogliono modificare direttamente la struttura della dashboard.

**Funzionalità:**
- **Editing JSON diretto** - Modifica widget a basso livello
- **Pannello laterale** - Non interferisce con la vista dashboard
- **Validazione automatica** - Errori evidenziati prima del salvataggio
- **Salvataggio istantaneo** - Modifiche applicate immediatamente

**Benefici per il cliente:**
- Controllo granulare per power users
- Debug e troubleshooting facilitato
- Personalizzazioni avanzate

---

### 7. 🤖 AI TOOLS (Capacità dell'Assistente)

**Descrizione:** L'AI ha strumenti dedicati per interagire con il sistema.

**Strumenti disponibili:**

| Tool | Funzione |
|------|----------|
| **getDataSources** | Recupera lista database e documentazione |
| **getDashboards** | Recupera dashboard esistenti |
| **addDashboardWidget** | Crea/modifica widget sulle dashboard |
| **bash** | Esegue query e comandi (sandbox sicuro) |
| **editFile** | Modifica documentazione database |

**Workflow AI tipico:**
1. L'AI chiede quali database sono disponibili
2. Consulta la documentazione per capire lo schema
3. Esegue query SQL per ottenere i dati
4. Crea automaticamente widget sulla dashboard
5. Notifica l'utente delle modifiche effettuate

**Benefici per il cliente:**
- Automazione end-to-end
- Da domanda a visualizzazione in secondi
- Nessuna competenza tecnica richiesta

---

### 8. 👥 SISTEMA PARTNER

**Descrizione:** Portale dedicato per i partner che rivendono Vetrinae.

**Funzionalità:**
- **Dashboard Partner** - Vista dedicata per gestire i clienti
- **Invito clienti** - Email con magic link per onboarding
- **Gestione clienti** - Lista, stato, data attivazione
- **Reinvio inviti** - Possibilità di rimandare l'invito
- **Eliminazione clienti** - Rimozione con conferma

**Pricing visualizzato:**
- €10.90/mese per il primo cliente
- €7.90/mese per i successivi
- IVA esclusa
- 30 giorni di prova gratuita per ogni nuovo cliente

**Benefici per i partner:**
- Gestione centralizzata clienti
- Onboarding automatizzato
- Pricing trasparente e scalabile

---

### 9. ⚙️ IMPOSTAZIONI UTENTE

**Descrizione:** Pannello per configurare il proprio account.

**Sezioni:**
- **Profilo** - Email, data creazione, eliminazione account
- **AI Connection** - Configurazione API key Anthropic

**Gestione API Key:**
- Input sicuro (tipo password)
- Crittografia lato server
- Indicatore "configurato/non configurato"
- Possibilità di eliminare e riconfigurare

**Benefici per il cliente:**
- BYOK (Bring Your Own Key) - Usa la propria API key
- Controllo costi diretto
- Privacy totale sui dati

---

### 10. 🔐 SICUREZZA

**Caratteristiche di sicurezza:**

| Aspetto | Implementazione |
|---------|-----------------|
| **Autenticazione** | Supabase Auth (email/password, magic link) |
| **Password database** | Crittografia AES |
| **API Key AI** | Crittografia e vault sicuro |
| **Reset password** | Flow email sicuro |
| **Setup password** | Link temporaneo per nuovi utenti |
| **Row Level Security** | Isolamento dati per utente |

---

## 💼 CASI D'USO TIPICI

### Per il Management
- "Mostrami il fatturato di questo trimestre confrontato con l'anno scorso"
- Dashboard executive con KPI principali
- Report condivisibili con il board

### Per il Marketing
- "Quali campagne hanno generato più conversioni?"
- Grafici performance marketing
- Analisi ROI automatizzata

### Per le Operations
- "Qual è il tempo medio di evasione ordini?"
- Dashboard operativa real-time
- Alert su metriche critiche

### Per le Vendite
- "Chi sono i top 10 clienti per fatturato?"
- Pipeline vendite visualizzata
- Forecast automatico

---

## 🚀 PUNTI DI FORZA COMPETITIVI

1. **AI-First** - L'intelligenza artificiale non è un add-on ma il core del prodotto
2. **Multi-Database** - Supporto nativo per 5+ tipi di database
3. **Zero Code** - Nessuna competenza tecnica richiesta
4. **Widget Dinamici** - Dati sempre aggiornati senza manutenzione
5. **Condivisione Facile** - Un click per condividere con chiunque
6. **BYOK** - Usa la tua API key Anthropic, controllo totale sui costi
7. **Documentazione Integrata** - L'AI capisce il contesto aziendale
8. **Programma Partner** - Modello di business per rivenditori

---

## 🎨 TECNOLOGIE UTILIZZATE

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase
- **AI:** Claude (Anthropic) via AI SDK v6
- **Grafici:** Plotly.js
- **Database:** PostgreSQL (Supabase) + supporto multi-DB
- **Email:** Resend
