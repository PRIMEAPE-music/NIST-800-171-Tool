# PHASE 4: EVIDENCE MANAGEMENT UI

## OVERVIEW

Build evidence upload and tracking interface with:
- Evidence library with filtering
- Upload interface by control
- Evidence-to-requirement linking
- Freshness status tracking
- Document management

**Prerequisites:** Phases 1-3 complete

---

## Step 4A: Create Evidence API Routes

📁 **File:** `server/src/routes/evidence.ts`

🔄 **COMPLETE FILE:**
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/evidence');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|png|jpg|jpeg|txt|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  },
});

/**
 * GET /api/evidence
 * Get all evidence with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { controlId, evidenceType, requirementId } = req.query;

    const evidence = await prisma.controlEvidence.findMany({
      where: {
        ...(controlId && { controlId: controlId as string }),
        ...(evidenceType && { evidenceType: evidenceType as string }),
        ...(requirementId && { requirementId: requirementId as string }),
      },
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            family: true,
          },
        },
        requirement: {
          select: {
            name: true,
            evidenceType: true,
            frequency: true,
            freshnessThreshold: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Calculate freshness status
    const evidenceWithStatus = evidence.map((item) => {
      let freshnessStatus = 'N/A';
      
      if (item.evidenceType === 'execution' && item.requirement?.freshnessThreshold) {
        const referenceDate = item.executionDate || item.uploadedAt;
        const ageInDays = Math.floor(
          (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const threshold = item.requirement.freshnessThreshold;

        if (ageInDays <= threshold) {
          freshnessStatus = 'fresh';
        } else if (ageInDays <= threshold * 2) {
          freshnessStatus = 'aging';
        } else if (ageInDays <= threshold * 3) {
          freshnessStatus = 'stale';
        } else {
          freshnessStatus = 'critical';
        }
      }

      return { ...item, freshnessStatus };
    });

    res.json(evidenceWithStatus);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

/**
 * GET /api/evidence/requirements/:controlId
 * Get all evidence requirements for a control
 */
router.get('/requirements/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;

    const requirements = await prisma.evidenceRequirement.findMany({
      where: { controlId },
      include: {
        policy: true,
        procedure: true,
        uploadedEvidence: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
      orderBy: [{ evidenceType: 'asc' }, { name: 'asc' }],
    });

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

/**
 * POST /api/evidence/upload
 * Upload new evidence
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      controlId,
      evidenceType,
      requirementId,
      title,
      description,
      executionDate,
      uploadedBy,
    } = req.body;

    if (!controlId || !evidenceType || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const evidence = await prisma.controlEvidence.create({
      data: {
        controlId,
        evidenceType,
        requirementId: requirementId || null,
        title,
        description: description || null,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        executionDate: executionDate ? new Date(executionDate) : null,
        uploadedBy: uploadedBy || 'System',
      },
      include: {
        control: true,
        requirement: true,
      },
    });

    res.json(evidence);
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
});

/**
 * DELETE /api/evidence/:id
 * Delete evidence
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const evidence = await prisma.controlEvidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Delete file from disk
    if (evidence.filePath) {
      try {
        await fs.unlink(evidence.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    await prisma.controlEvidence.delete({ where: { id } });

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

/**
 * GET /api/evidence/download/:id
 * Download evidence file
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const evidence = await prisma.controlEvidence.findUnique({
      where: { id },
    });

    if (!evidence || !evidence.filePath) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(evidence.filePath, evidence.fileName || 'download');
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ error: 'Failed to download evidence' });
  }
});

export default router;
```

---

## Step 4B: Register Evidence Routes

📁 **File:** `server/src/index.ts`

🔍 **FIND:**
```typescript
import coverageRoutes from './routes/coverage';
```

✏️ **ADD:**
```typescript
import evidenceRoutes from './routes/evidence';
```

🔍 **FIND:**
```typescript
app.use('/api/coverage', coverageRoutes);
```

✏️ **ADD:**
```typescript
app.use('/api/evidence', evidenceRoutes);
```

---

## Step 4C: Create Evidence Management Page

📁 **File:** `client/src/pages/EvidenceLibrary.tsx`

🔄 **COMPLETE FILE:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Delete,
  Upload as UploadIcon,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Evidence {
  id: string;
  controlId: string;
  evidenceType: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  executionDate: string | null;
  freshnessStatus: string;
  control: {
    controlId: string;
    title: string;
    family: string;
  };
  requirement: {
    name: string;
    frequency: string | null;
  } | null;
}

export default function EvidenceLibrary() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterControl, setFilterControl] = useState('all');

  useEffect(() => {
    loadEvidence();
  }, [filterType, filterControl]);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('evidenceType', filterType);
      if (filterControl !== 'all') params.append('controlId', filterControl);

      const res = await fetch(`/api/evidence?${params}`);
      const data = await res.json();
      setEvidence(data);
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/evidence/download/${id}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'evidence';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading evidence:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      await fetch(`/api/evidence/${id}`, { method: 'DELETE' });
      loadEvidence();
    } catch (error) {
      console.error('Error deleting evidence:', error);
    }
  };

  const getFreshnessChip = (status: string) => {
    const config: Record<string, { label: string; color: any; icon: any }> = {
      fresh: { label: 'Fresh', color: 'success', icon: <CheckCircle /> },
      aging: { label: 'Aging', color: 'warning', icon: <Warning /> },
      stale: { label: 'Stale', color: 'error', icon: <Error /> },
      critical: { label: 'Critical', color: 'error', icon: <Error /> },
    };

    const c = config[status] || { label: 'N/A', color: 'default', icon: null };
    return <Chip label={c.label} color={c.color} size="small" icon={c.icon} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Evidence Library
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialog(true)}
        >
          Upload Evidence
        </Button>
      </Box>

      <Card sx={{ bgcolor: '#1E1E1E', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Evidence Type</InputLabel>
              <Select
                value={filterType}
                label="Evidence Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="policy">Policy</MenuItem>
                <MenuItem value="procedure">Procedure</MenuItem>
                <MenuItem value="execution">Execution</MenuItem>
                <MenuItem value="physical">Physical</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Control</InputLabel>
              <Select
                value={filterControl}
                label="Control"
                onChange={(e) => setFilterControl(e.target.value)}
              >
                <MenuItem value="all">All Controls</MenuItem>
                {/* Add control options dynamically */}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: '#1E1E1E' }}>
        <CardContent>
          <TableContainer component={Paper} sx={{ bgcolor: '#242424' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Control</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Freshness</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evidence.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Chip label={item.controlId} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.evidenceType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.fileName}</TableCell>
                    <TableCell>{formatFileSize(item.fileSize)}</TableCell>
                    <TableCell>
                      {format(new Date(item.uploadedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getFreshnessChip(item.freshnessStatus)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(item.id)}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadEvidenceDialog
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        onSuccess={() => {
          setUploadDialog(false);
          loadEvidence();
        }}
      />
    </Box>
  );
}

// Upload Dialog Component
function UploadEvidenceDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [controlId, setControlId] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !controlId || !evidenceType || !title) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('controlId', controlId);
      formData.append('evidenceType', evidenceType);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (executionDate) formData.append('executionDate', executionDate);

      await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      onSuccess();
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Evidence</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Control ID"
            value={controlId}
            onChange={(e) => setControlId(e.target.value)}
            placeholder="03.01.01"
            required
          />

          <FormControl required>
            <InputLabel>Evidence Type</InputLabel>
            <Select
              value={evidenceType}
              label="Evidence Type"
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              <MenuItem value="policy">Policy</MenuItem>
              <MenuItem value="procedure">Procedure</MenuItem>
              <MenuItem value="execution">Execution</MenuItem>
              <MenuItem value="physical">Physical</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />

          {evidenceType === 'execution' && (
            <TextField
              label="Execution Date"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}

          <Button variant="outlined" component="label">
            {file ? file.name : 'Choose File'}
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploading || !file || !controlId || !evidenceType || !title}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## Step 4D: Add Route and Navigation

Add to App.tsx:
```typescript
import EvidenceLibrary from './pages/EvidenceLibrary';

// In routes:
<Route path="/evidence" element={<EvidenceLibrary />} />
```

Add navigation link:
```typescript
<ListItemButton component={Link} to="/evidence">
  <ListItemIcon>
    <Folder />
  </ListItemIcon>
  <ListItemText primary="Evidence Library" />
</ListItemButton>
```

---

## ✅ PHASE 4 COMPLETE

**Deliverables:**
- ✅ Evidence upload API with file handling
- ✅ Evidence library UI with filtering
- ✅ Freshness status calculation and display
- ✅ Download and delete functionality
- ✅ Upload dialog with validation

---

## PAUSE POINT

Test evidence management:
1. Navigate to `/evidence`
2. Upload sample evidence files
3. Verify freshness status calculations
4. Test download functionality
5. Test filtering by type and control

**Next:** Phase 5 will integrate everything and perform end-to-end testing.
