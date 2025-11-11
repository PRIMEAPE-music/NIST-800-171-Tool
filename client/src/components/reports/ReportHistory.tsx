import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Download, Delete, PictureAsPdf, Description, TableChart } from '@mui/icons-material';
import { ReportHistoryItem, ReportFormat } from '../../types/reports';
import { format } from 'date-fns';

interface ReportHistoryProps {
  reports: ReportHistoryItem[];
  onDownload: (reportId: number) => void;
  onDelete: (reportId: number) => void;
}

const formatIcons: Record<ReportFormat, React.ReactElement> = {
  pdf: <PictureAsPdf fontSize="small" />,
  excel: <TableChart fontSize="small" />,
  csv: <Description fontSize="small" />,
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  reports,
  onDownload,
  onDelete,
}) => {
  if (reports.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No reports generated yet
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Report Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Generated</TableCell>
            <TableCell>Size</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id} hover>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                  {report.reportName}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={report.reportType.replace('-', ' ')}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {formatIcons[report.format]}
                  <Typography variant="body2">
                    {report.format.toUpperCase()}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(report.generatedAt), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatFileSize(report.fileSize)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onDownload(report.id)}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(report.id)}
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
  );
};
