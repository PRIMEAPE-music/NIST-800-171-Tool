I'll search through your project knowledge to analyze the codebase and provide a comprehensive overview.Based on my analysis of your project knowledge, here's a comprehensive overview of your **NIST 800-171 Compliance Tracker** application:

---

## 🎯 **Project Overview**

This is a **full-stack web application** designed to help organizations track and maintain compliance with **NIST SP 800-171 Revision 3** security requirements. It serves as a centralized compliance management platform with automated policy assessment through Microsoft 365 integration.

---

## 🏗️ **Project Structure**

### **Monorepo Architecture**
```
nist-800-171-tracker/
├── client/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API service layers
│   │   ├── config/          # App configuration
│   │   └── types/           # TypeScript definitions
│   └── package.json
│
├── server/                    # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Server configuration
│   │   ├── utils/           # Helper functions
│   │   └── scripts/         # Utility scripts
│   ├── prisma/             # Database schema & migrations
│   └── package.json
│
├── database/                  # SQLite database storage
├── data/                     # JSON configuration files
│   ├── nist-800-171-controls.json
│   ├── control-settings-mappings.json
│   └── nist-improvement-actions.json
└── docs/                     # Documentation
```

---

## 🛠️ **Technology Stack**

### **Frontend (Client)**
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v7 (dark theme)
- **Build Tool**: Vite
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Routing**: React Router v7
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **File Uploads**: React Dropzone

### **Backend (Server)**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: Azure AD/MSAL (for M365)
- **Microsoft Graph**: @microsoft/microsoft-graph-client
- **Security**: Helmet, CORS, Cookie-parser
- **File Processing**: Multer, AdmZip, Archiver
- **Document Generation**: PDFKit, ExcelJS, CSV-Writer
- **Logging**: Winston, Morgan
- **Scheduling**: node-cron

---

## ✨ **Core Features Implemented**

### **1. Dashboard**
- Real-time compliance statistics
- Control implementation status overview
- Family-based compliance breakdown
- Priority-based risk visualization
- Recent activity tracking
- M365 integration status

### **2. Control Library** (97 Controls - NIST 800-171 Rev 3)
- **17 Control Families**: AC, AT, AU, CA, CM, IA, IR, MA, MP, PE, PS, RA, SC, SI, **PL, SA, SR** (new in Rev 3)
- Searchable and filterable control database
- Individual control detail pages with tabs:
  - **Details**: Full requirement text, discussion, references
  - **Implementation**: Status tracking, notes, assignee
  - **Evidence**: Document uploads and management
  - **Gap Analysis**: Automated gap detection
  - **M365 Settings**: Policy mappings and recommendations
  - **History**: Change tracking

### **3. Assessment Management**
- Control-level assessments
- Implementation status tracking
- Evidence validation
- Testing verification
- Risk scoring (0-100 scale)
- Assessor notes and timestamps

### **4. Evidence Management**
- Multi-format file uploads (PDF, images, documents)
- Control-level evidence linking
- File versioning system
- Tagging and categorization
- Archive functionality
- Metadata tracking (upload date, user, size, type)

### **5. POAM (Plan of Action & Milestones)**
- Gap tracking and remediation planning
- Milestone management with due dates
- Priority and status tracking
- Resource and budget estimation
- Risk acceptance documentation
- Assignment and accountability

### **6. Microsoft 365 Integration** ⭐
- **Automated Policy Sync**: Intune, Purview, Azure AD
- **Graph API Integration**: Real-time policy fetching
- **Policy Types Supported**:
  - **Intune**: Compliance policies, configuration policies, device management
  - **Purview**: Sensitivity labels, DLP policies
  - **Azure AD**: Conditional Access, MFA status, security defaults
- **Auto-Mapping Engine**: Keyword-based mapping of policies to controls
- **Settings Validation**: Compares actual vs. required settings
- **Confidence Scoring**: High/Medium/Low confidence mappings
- **Dashboard**: Unified view of M365 compliance posture

### **7. Gap Analysis**
- Control-level gap identification
- Gap categorization (technical, policy, procedure, evidence)
- Severity classification (critical, high, medium, low)
- M365-specific gap detection
- Remediation guidance
- POAM linkage

### **8. Reporting System**
- **Export Formats**: PDF, Excel (XLSX), CSV
- **Report Types**:
  - System Security Plan (SSP)
  - Compliance summary reports
  - Control status reports
  - POAM reports
  - Evidence inventory
  - Gap analysis reports
  - M365 coverage reports
- Report history tracking
- Custom templates

### **9. Settings & Configuration**
- **Organization Settings**: Name, system details, security officer
- **M365 Integration Settings**: Tenant ID, credentials, sync configuration
- **User Preferences**: Date format, report preferences
- **Data Management**: Backup, restore, export capabilities
- **Sync Management**: Manual sync trigger, sync history

---

## 🗄️ **Database Schema (Prisma)**

### **Core Tables**
1. **`controls`** - 97 NIST 800-171 Rev 3 controls
2. **`control_status`** - Implementation tracking
3. **`assessments`** - Compliance assessments
4. **`evidence`** - Supporting documentation
5. **`poams`** - Plans of action
6. **`poam_milestones`** - POAM tracking
7. **`control_gaps`** - Gap analysis results
8. **`poam_items`** - Enhanced POAM management

### **M365 Integration Tables**
9. **`m365_policies`** - Synced M365 policies
10. **`control_policy_mappings`** - Policy-to-control mappings
11. **`m365_sync_logs`** - Sync history

### **System Tables**
12. **`settings`** - Application configuration
13. **`report_history`** - Generated reports
14. **`change_history`** - Audit trail
15. **`control_coverage`** - M365 coverage tracking
16. **`control_evidence`** - Evidence tracking

---

## 🔌 **API Architecture**

### **RESTful Endpoints**
```
/api/controls          - Control management
/api/assessments       - Assessment operations
/api/poams            - POAM CRUD operations
/api/evidence         - File upload/management
/api/reports          - Report generation
/api/m365             - M365 integration
  ├── /dashboard      - M365 overview
  ├── /sync           - Manual sync trigger
  ├── /policies       - Policy management
  ├── /gap-analysis   - M365 gaps
  └── /intune|purview|azuread - Service-specific
/api/settings         - Configuration management
/api/backup           - Backup/restore operations
```

---

## 🔄 **Microsoft 365 Integration Architecture**

### **Services Layer**
1. **`authService`** - Azure AD authentication (client credentials)
2. **`graphClientService`** - Microsoft Graph API client
3. **`intuneService`** - Intune policy fetching
4. **`purviewService`** - Purview DLP/labels
5. **`azureADService`** - Conditional Access, MFA
6. **`policySyncService`** - Orchestrates full sync
7. **`settingsMapperService`** - Auto-mapping engine
8. **`improvementActionMapping`** - Recommendation engine
9. **`policyViewerService`** - Policy browsing/search

### **Auto-Mapping Engine**
- **Keyword-Based Matching**: Maps policies to controls using predefined keywords
- **Settings Validation**: Compares policy settings against requirements
- **Confidence Scoring**: Calculates mapping accuracy
- **Bulk Operations**: Processes all policies in one sync

---

## 🎨 **UI/UX Features**

- **Dark Theme**: Material-UI dark mode throughout
- **Responsive Design**: Mobile-friendly layout
- **Data Visualization**: Recharts for compliance metrics
- **Progress Tracking**: Linear progress bars, status chips
- **Search & Filter**: Advanced filtering on all data tables
- **Sorting**: Multi-column sorting capabilities
- **Pagination**: Efficient data loading
- **Form Validation**: React Hook Form with Zod schemas
- **Toast Notifications**: User feedback system
- **Loading States**: Skeleton loaders and spinners

---

## 📦 **Key Dependencies**

### **Notable Packages**
- **`@azure/msal-node`** - Azure AD auth
- **`@microsoft/microsoft-graph-client`** - Graph API
- **`@prisma/client`** - Database ORM
- **`pdfkit`**, **`exceljs`** - Report generation
- **`multer`** - File uploads
- **`helmet`** - Security headers
- **`winston`** - Logging
- **`zod`** - Schema validation

---

## 🔐 **Security Features**

- Helmet.js security headers
- CORS protection
- Cookie signing
- Session management
- File upload validation
- SQLite file permissions
- Environment variable protection
- Azure AD app-level authentication

---

## 📊 **Current Status**

✅ **Completed** (Phases 0-7):
- Core compliance tracking
- Evidence management
- POAM system
- M365 integration
- Reporting system
- Settings management

🔨 **In Progress** (Phase 8):
- Advanced preferences
- Data backup/restore UI
- Bulk operations
- Keyboard shortcuts
- Production polish

---

This is an **enterprise-grade compliance management system** with sophisticated M365 integration, automated gap analysis, and comprehensive audit-ready reporting capabilities!