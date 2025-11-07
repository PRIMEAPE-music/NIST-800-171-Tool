import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import CloudIcon from '@mui/icons-material/Cloud';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import FactCheckIcon from '@mui/icons-material/FactCheck';

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
  {
    label: 'Assessment Wizard',
    path: '/assessment',
    icon: FactCheckIcon,
    description: 'Conduct control assessments',
  },
  {
    label: 'Gap Analysis',
    path: '/gap-analysis',
    icon: AssessmentIcon,
    description: 'Assess and prioritize compliance gaps',
  },
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
