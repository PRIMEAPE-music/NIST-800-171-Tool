import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_CONFIGURED' | 'NOT_CHECKED';

interface ControlBadge {
  controlId: string;
  controlTitle: string;
  family: string;
  complianceStatus: ComplianceStatus;
}

export const usePolicyControlBadges = (policyId: number) => {
  return useQuery<ControlBadge[]>({
    queryKey: ['policyControlBadges', policyId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/m365/policies/viewer/${policyId}/control-mappings`
      );

      // Extract control badges with compliance status from the response
      const controls = response.data.data.controls || [];
      return controls.map((control: any) => {
        // Calculate compliance status based on settings
        const settings = control.settings || [];
        let complianceStatus: ComplianceStatus = 'NOT_CHECKED';

        if (settings.length > 0) {
          const compliantCount = settings.filter((s: any) => s.isCompliant === true).length;
          const nonCompliantCount = settings.filter((s: any) => s.isCompliant === false).length;

          if (nonCompliantCount > 0) {
            complianceStatus = 'NON_COMPLIANT';
          } else if (compliantCount > 0) {
            complianceStatus = 'COMPLIANT';
          } else {
            complianceStatus = 'NOT_CONFIGURED';
          }
        }

        return {
          controlId: control.controlId,
          controlTitle: control.controlTitle,
          family: control.family,
          complianceStatus,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
