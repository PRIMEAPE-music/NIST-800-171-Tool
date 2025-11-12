# Policy Viewer User Guide

## Overview
The Policy Viewer provides a comprehensive view of all Microsoft 365 policies synced from Intune, Purview, and Azure AD.

## Features

### Policy Organization
Policies are organized into tabs by type:
- **All Policies**: View all policies together
- **Intune**: Device management and compliance policies
- **Purview**: Data Loss Prevention and sensitivity labels
- **Azure AD**: Conditional access and identity policies

### Search & Filter
- **Search**: Type in the search bar to filter by policy name or description
- **Status Filter**: Toggle between All, Active, and Inactive policies
- **Sort**: Sort policies by Name, Last Synced, or Type

### Policy Cards
Each policy is displayed as a card showing:
- Policy name and description
- Policy type (Intune/Purview/Azure AD)
- Active/Inactive status
- Last synced timestamp
- Mapped NIST controls
- Key settings (in expanded view)

#### Expanding Cards
Click the down arrow at the bottom of a card to expand and view detailed settings.

#### Viewing Full Details
Click the info (i) icon to open a modal with complete policy information including:
- Full metadata
- All mapped NIST controls
- Complete settings in JSON format

### Syncing Policies
Click the sync icon (circular arrow) in the top right to trigger a manual sync with Microsoft 365.

The sync status indicator shows:
- **Green**: Recently synced (< 24 hours)
- **Yellow**: Stale (1-7 days)
- **Red**: Very stale (> 7 days) or never synced

### Exporting Data
Click the "Export" button to download all policy data as a JSON file.

### Keyboard Shortcuts
- **Ctrl/⌘ + K**: Focus the search bar
- **Ctrl/⌘ + R**: Trigger sync
- **Ctrl/⌘ + E**: Export data

## Mapped NIST Controls
Policies that have been mapped to NIST 800-171 controls display color-coded badges:
- **Green**: High confidence mapping
- **Yellow**: Medium confidence mapping
- **Gray**: Low confidence mapping

Click a control badge to see the control title in a tooltip.

## Understanding Policy Types

### Intune Policies
Show device management settings including:
- Password requirements
- Device encryption
- OS version requirements
- Firewall settings

### Purview Policies
Show data protection settings including:
- DLP policy status and mode
- Sensitivity label configurations
- Priority levels

### Azure AD Policies
Show identity and access settings including:
- Conditional access rules
- Sign-in risk policies
- Grant and session controls

## Tips
- Use the search bar to quickly find specific policies
- Filter by Active policies to see only enforced rules
- Sort by Last Synced to identify stale policies
- Expand cards to see key settings without opening the full modal
- Check mapped controls to understand NIST compliance coverage

## Troubleshooting

### Policies Not Loading
1. Check that M365 sync has run successfully
2. Verify backend API is responding
3. Check browser console for errors
4. Try manual sync

### Search Not Working
1. Clear search field and try again
2. Check if policies match search term
3. Try different filters
4. Refresh the page

### Sync Failing
1. Check M365 connection in Settings
2. Verify Azure AD credentials
3. Check API permissions
4. Review backend logs
