# NIST 800-171 Compliance Tracker

A comprehensive web-based application for tracking, assessing, and documenting NIST 800-171 compliance status across all 110 security requirements.

## Features

- **Control Management**: Track all 110 NIST 800-171 controls
- **Gap Analysis**: Identify compliance gaps with risk scoring
- **POAM Tracking**: Manage remediation plans and milestones
- **Evidence Management**: Centralized document repository
- **Microsoft 365 Integration**: Auto-sync with Intune, Purview, and Azure AD
- **Reporting**: Generate audit-ready compliance reports
- **Dark Theme**: Eye-friendly dark interface

## Tech Stack

### Frontend
- React 18 + TypeScript
- Material-UI v5
- Vite
- React Router v6
- React Query
- Axios

### Backend
- Node.js 18+
- Express + TypeScript
- SQLite3 + Prisma ORM
- Microsoft Graph API
- Passport.js

## Project Structure

```
nist-800-171-tracker/
├── client/          # React frontend application
├── server/          # Express backend API
├── data/            # Static data files (NIST controls JSON)
├── database/        # SQLite database files
└── uploads/         # Evidence file storage
```

## Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Git

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd nist-800-171-tracker
```

### 2. Install dependencies
```bash
npm run setup
```

### 3. Configure environment variables

**Client (.env):**
```bash
cd client
cp .env.example .env
# Edit .env with your configuration
```

**Server (.env):**
```bash
cd server
cp .env.example .env
# Edit .env with your Azure AD configuration
```

### 4. Set up database
```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

## Development

### Run both client and server concurrently:
```bash
npm run dev
```

### Run individually:
```bash
# Terminal 1 - Backend (port 3001)
npm run dev:server

# Terminal 2 - Frontend (port 3000)
npm run dev:client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Microsoft 365 Setup

1. Register an Azure AD application
2. Configure API permissions (see docs/M365_SETUP.md)
3. Add credentials to server/.env
4. Test connection in Settings page

## Database

The application uses SQLite for simplicity and portability. Database file location:
```
database/compliance.db
```

To view the database:
```bash
cd server
npx prisma studio
```

## Building for Production

```bash
npm run build
```

Built files will be in:
- Client: `client/dist/`
- Server: `server/dist/`

## Project Status

**Current Phase:** Phase 1 - Foundation
**Progress:** In Development

### Completed:
- [x] Project initialization
- [ ] Frontend setup
- [ ] Backend setup
- [ ] Database configuration
- [ ] Control data preparation
- [ ] Database seeding
- [ ] Routing & layout
- [ ] API foundation

## Documentation

- [Project Overview](./docs/PROJECT_OVERVIEW.md)
- [Phase 1 Guide](./docs/PHASE_1_INDEX.md)
- [API Documentation](./docs/API.md) *(Coming Soon)*
- [M365 Integration Guide](./docs/M365_SETUP.md) *(Coming Soon)*

## Security

- Local deployment only
- No data transmission over network
- Environment variables for secrets
- File upload validation
- Input sanitization

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

---

**Version:** 1.0.0
**Last Updated:** 2025-11-06
