# Environment Configuration Guide

## Quick Start

### 1. Client Environment Setup

```bash
cd client
cp .env.example .env
```

Edit `client/.env` and configure:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)

### 2. Server Environment Setup

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and configure:
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - Database path (default: file:../database/compliance.db)
- `SESSION_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `COOKIE_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Detailed Configuration

### Client Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | http://localhost:3001/api | Backend API endpoint |
| `VITE_AZURE_CLIENT_ID` | For M365 | - | Azure AD Application ID |
| `VITE_AZURE_TENANT_ID` | For M365 | - | Azure AD Tenant ID |
| `VITE_AZURE_REDIRECT_URI` | For M365 | http://localhost:3000/auth/callback | OAuth redirect |
| `VITE_ENABLE_M365_INTEGRATION` | No | false | Enable M365 features |

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes | file:../database/compliance.db | Database connection |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `COOKIE_SECRET` | Yes | - | Cookie signing key |
| `CLIENT_URL` | Yes | http://localhost:3000 | Frontend URL for CORS |

---

## Microsoft 365 Setup (Optional)

See [M365_SETUP.md](./M365_SETUP.md) for detailed Azure AD configuration.

Quick steps:
1. Create Azure AD App Registration
2. Configure API permissions
3. Generate client secret
4. Add credentials to `.env` files

---

## Security Best Practices

1. **Never commit .env files** - They contain secrets
2. **Generate strong secrets** - Use crypto.randomBytes()
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets** - For each environment
5. **Restrict database access** - File permissions on SQLite

---

## Troubleshooting

### "Missing required environment variable"
- Check `.env` file exists
- Verify variable names match exactly
- Restart dev server after changes

### CORS errors
- Ensure `CLIENT_URL` matches frontend URL exactly
- Check for trailing slashes
- Verify ports match

### M365 integration not working
- Verify all Azure AD variables set
- Check `VITE_ENABLE_M365_INTEGRATION=true`
- Validate Azure AD app permissions

---

**Last Updated:** 2025-11-06
