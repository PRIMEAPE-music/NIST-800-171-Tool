I need to update my NIST 800-171 Rev 3 compliance application to use a pruned version of control settings mappings. I've optimized the Access Control family controls (03.01.01 through 03.01.12) from 290 mappings down to 88 high-priority mappings, reducing each control to 6-8 critical policy settings.

CONTEXT:
- Application: Full-stack NIST 800-171 compliance management tool
- Stack: React/TypeScript frontend, Node.js/Express backend, Prisma ORM, SQLite
- Current state: Using control_settings_mappings.json with 681 total mappings
- Goal: Replace with control_settings_mappings_pruned.json (483 total mappings)

FILES PROVIDED:
1. control_settings_mappings_pruned.json - Optimized mappings file
2. PRUNING_ANALYSIS_REPORT.md - Detailed analysis of changes

TASKS:

1. **Backup Current Configuration**
   - Create backup of existing control_settings_mappings.json
   - Document current state before making changes

2. **Update Control Mappings**
   - Replace the control settings mappings data source with the pruned version
   - Identify where control_settings_mappings.json is referenced in the codebase
   - Update all import/read operations to use the new pruned file
   - Ensure the data structure compatibility (version 1.1.0 vs 1.0.0)

3. **Database Updates (if applicable)**
   - If control mappings are stored in the database, update the relevant tables
   - Create a migration script to:
     - Remove pruned mappings for controls 03.01.01-03.01.12
     - Add/update mappings from the pruned file
     - Preserve any user customizations or evidence links
   - Run database migration with proper rollback capability

4. **Backend API Updates**
   - Update any API endpoints that serve control mappings
   - Ensure filtering/querying logic works with reduced mapping count
   - Update any statistics or count calculations
   - Verify auto-mapping logic still functions correctly

5. **Frontend Updates**
   - Update control details pages to display correct number of mappings
   - Update dashboard statistics if they reference mapping counts
   - Verify assessment wizard works with new mapping set
   - Check gap analysis displays correct policy settings
   - Ensure evidence management links to correct mappings

6. **Microsoft 365 Integration**
   - Verify policy sync still maps correctly to the pruned control mappings
   - Test auto-mapping algorithm with reduced keyword set
   - Ensure sync doesn't re-create pruned mappings

7. **Testing & Verification**
   - Test each control (03.01.01-03.01.12) displays 6-8 mappings
   - Verify control assessment workflow
   - Test gap analysis report generation
   - Confirm evidence attachment to mappings works
   - Validate export functionality (CSV, Excel, PDF)
   - Test M365 policy sync and auto-mapping

8. **Documentation Updates**
   - Update any README or documentation referencing mapping counts
   - Document the pruning rationale for future reference
   - Update user documentation if mapping reduction is visible

IMPORTANT CONSIDERATIONS:
- Preserve any existing evidence, assessments, or user data linked to mappings
- If a pruned mapping has associated data, migrate it appropriately or flag for review
- Maintain audit trail of what mappings were removed
- Keep the original file as a backup for potential restoration
- The pruned file contains a "pruningInfo" section with metadata - use this for tracking

VERIFICATION CHECKLIST:
□ Backup created successfully
□ New mappings file loaded correctly
□ Database updated (if applicable)
□ Controls 03.01.01-03.01.12 show correct mapping counts (6-8 each)
□ Other controls (outside 03.01.01-03.01.12) unchanged
□ Assessment workflow functions correctly
□ Gap analysis generates properly
□ Evidence management intact
□ M365 sync works correctly
□ Export functions work (CSV, Excel, PDF)
□ No broken references or null pointer errors
□ Application performance acceptable

ROLLBACK PLAN:
- Keep backup of original file
- Document database state before migration
- Create Prisma migration rollback script if needed
- Test rollback procedure before deploying to production

Please implement these changes systematically, testing after each major step. Provide clear status updates on what was changed and any issues encountered.