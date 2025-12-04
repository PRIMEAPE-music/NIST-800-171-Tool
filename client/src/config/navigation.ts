import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
// AssessmentIcon removed - no longer used
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import CloudIcon from '@mui/icons-material/Cloud';
import PolicyIcon from '@mui/icons-material/Policy';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import QuizIcon from '@mui/icons-material/Quiz';
// FactCheckIcon removed - no longer used
import FindInPageIcon from '@mui/icons-material/FindInPage';

export interface NavigationItem {
  label: string;
  path: string;
  icon: typeof DashboardIcon;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
    description: 'Compliance overview and statistics',
  },
  {
    label: 'Control Library',
    path: '/controls',
    icon: ListAltIcon,
    description: 'All 111 NIST 800-171 Rev 3 controls',
  },
  // Assessment Wizard removed - use control detail pages instead
  // Gap Analysis standalone page removed - use Gap Analysis tab on control detail pages
  {
    label: 'POAMs',
    path: '/poams',
    icon: AssignmentIcon,
    description: 'Plan of Action & Milestones',
  },
  {
    label: 'Evidence',
    path: '/evidence',
    icon: FolderIcon,
    description: 'Compliance documentation repository',
  },
  {
    label: 'M365 Integration',
    path: '/m365',
    icon: CloudIcon,
    description: 'Microsoft 365 policy sync',
  },
  {
    label: 'Policy Viewer',
    path: '/policy-viewer',
    icon: PolicyIcon,
    description: 'View and manage M365 policies',
  },
  {
    label: 'Gap Analysis',
    path: '/gap-analysis',
    icon: FindInPageIcon,
    description: 'Coverage analysis and compliance gaps',
  },
  {
    label: 'Surveys',
    path: '/surveys',
    icon: QuizIcon,
    description: 'Cybersecurity assessment questionnaires',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: DescriptionIcon,
    description: 'Generate compliance reports',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
    description: 'Application configuration',
  },
];
