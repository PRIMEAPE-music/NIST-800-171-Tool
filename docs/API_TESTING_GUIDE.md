# API Testing Guide - Phase 2.1

## Quick Start

### Start the Server
```bash
cd server
npm run dev
```

Server will start on: http://localhost:3001

## Testing Endpoints

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-07T...",
  "environment": "development",
  "database": "connected"
}
```

### 2. Get All Controls (with pagination)
```bash
# Basic request
curl http://localhost:3001/api/controls

# With pagination
curl "http://localhost:3001/api/controls?page=1&limit=10"

# With filtering
curl "http://localhost:3001/api/controls?family=AC&status=In%20Progress"

# With sorting
curl "http://localhost:3001/api/controls?sortBy=priority&sortOrder=desc"

# Search
curl "http://localhost:3001/api/controls?search=access"
```

### 3. Get Single Control
```bash
# By database ID
curl http://localhost:3001/api/controls/1

# By control ID (e.g., "03.01.01")
curl http://localhost:3001/api/controls/control/03.01.01
```

### 4. Get Statistics
```bash
# All statistics
curl http://localhost:3001/api/controls/stats

# Summary statistics
curl http://localhost:3001/api/controls/stats/summary

# Family statistics
curl http://localhost:3001/api/controls/stats/family/AC

# Progress over time
curl http://localhost:3001/api/controls/stats/progress
```

### 5. Update Control
```bash
# Update control details (PUT)
curl -X PUT http://localhost:3001/api/controls/1 \
  -H "Content-Type: application/json" \
  -d '{
    "implementationNotes": "Updated implementation notes",
    "assignedTo": "John Doe",
    "nextReviewDate": "2025-12-31T00:00:00Z"
  }'
```

### 6. Update Control Status
```bash
# Update status only (PATCH)
curl -X PATCH http://localhost:3001/api/controls/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Implemented",
    "implementationDate": "2025-11-07T08:00:00Z",
    "assignedTo": "John Doe"
  }'
```

### 7. Bulk Operations
```bash
# Bulk status update
curl -X POST http://localhost:3001/api/controls/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "controlIds": [1, 2, 3, 4, 5],
    "operation": "updateStatus",
    "data": {
      "status": "In Progress",
      "assignedTo": "Security Team"
    }
  }'

# Bulk assignment
curl -X POST http://localhost:3001/api/controls/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "controlIds": [1, 2, 3],
    "operation": "assign",
    "data": {
      "assignedTo": "Jane Smith"
    }
  }'
```

## PowerShell Examples (Windows)

### Get All Controls
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/controls" -Method Get
```

### Get Statistics
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/controls/stats" -Method Get
```

### Update Control Status
```powershell
$body = @{
    status = "Implemented"
    implementationDate = "2025-11-07T08:00:00Z"
    assignedTo = "John Doe"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/controls/1/status" `
  -Method Patch `
  -Body $body `
  -ContentType "application/json"
```

### Bulk Update
```powershell
$body = @{
    controlIds = @(1, 2, 3, 4, 5)
    operation = "updateStatus"
    data = @{
        status = "In Progress"
        assignedTo = "Security Team"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/controls/bulk" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

## Query Parameters Reference

### GET /api/controls

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| family | string | Filter by family | AC, AT, AU, etc. |
| status | string | Filter by status | "Not Started", "In Progress", "Implemented", "Verified" |
| priority | string | Filter by priority | Critical, High, Medium, Low |
| search | string | Search in title and text | "access control" |
| page | number | Page number | 1 (default) |
| limit | number | Items per page | 50 (default, max 100) |
| sortBy | string | Sort field | controlId, title, family, priority |
| sortOrder | string | Sort direction | asc (default), desc |

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 110,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

## Valid Values

### Control Status
- "Not Started"
- "In Progress"
- "Implemented"
- "Verified"

### Control Priority
- "Critical"
- "High"
- "Medium"
- "Low"

### Control Families (NIST 800-171r3)
- AC (Access Control)
- AT (Awareness and Training)
- AU (Audit and Accountability)
- CA (Security Assessment)
- CM (Configuration Management)
- CP (Contingency Planning)
- IA (Identification and Authentication)
- IR (Incident Response)
- MA (Maintenance)
- MP (Media Protection)
- PE (Physical Protection)
- PS (Personnel Security)
- RA (Risk Assessment)
- SA (System and Services Acquisition)
- SC (System and Communications Protection)
- SI (System and Information Integrity)
- SR (Supply Chain Risk Management)
- PL (Planning)

### Bulk Operations
- "updateStatus"
- "assign"

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Get all controls works
- [ ] Pagination works correctly
- [ ] Filtering by family works
- [ ] Filtering by status works
- [ ] Filtering by priority works
- [ ] Search functionality works
- [ ] Sorting works (asc and desc)
- [ ] Get single control by ID works
- [ ] Get control by control ID works
- [ ] Update control details (PUT) works
- [ ] Update control status (PATCH) works
- [ ] Bulk status update works
- [ ] Bulk assignment works
- [ ] Statistics endpoint works
- [ ] Family statistics work
- [ ] Summary statistics work
- [ ] Progress over time works
- [ ] Error handling works for invalid IDs
- [ ] Error handling works for invalid status
- [ ] Error handling works for empty bulk operations

## Common Issues

### Issue: Server not starting
**Solution:** Check if port 3001 is already in use, check .env file exists

### Issue: Database connection error
**Solution:** Ensure database file exists at `../database/compliance.db`

### Issue: 404 errors
**Solution:** Verify route path is correct, check if routes are properly imported in app.ts

### Issue: TypeScript compilation errors
**Solution:** Run `npm run type-check` to see errors, ensure all dependencies are installed

### Issue: Prisma errors
**Solution:** Run `npm run prisma:generate` to regenerate client

## Next Steps

After testing Phase 2.1 API:
1. Proceed to Phase 2.2 - Control Library UI
2. Build frontend components that consume these APIs
3. Implement React Query for data fetching
4. Add comprehensive error handling in UI
