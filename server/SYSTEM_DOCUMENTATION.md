# NIST 800-171 Compliance Application - System Documentation

Generated: 2025-11-20T04:30:37.620Z

## Overview

This document provides a comprehensive overview of the Microsoft 365 policy integration
and compliance mapping for NIST 800-171 controls.

## System Statistics

- **Total M365 Settings**: 672
- **Settings with Compliance Checks**: 547 (81.4%)
- **Total Policies Synced**: 22
- **Active Policies**: 21

## Policy Types

| Source | Template Family | Count |
|--------|-----------------|-------|
| AzureAD | AzureAD | 1 |
| AzureAD | ConditionalAccess | 1 |
| Intune | AppProtection | 2 |
| Intune | Compliance | 3 |
| Intune | Configuration | 14 |
| Intune | Update | 1 |

## Compliance by Control Family

| Family | Controls | Avg Compliance |
|--------|----------|----------------|
| AC | 16 | 0.0% |
| AU | 8 | 0.0% |
| CM | 10 | 0.0% |
| CP | 5 | 0.0% |
| IA | 6 | 1.2% |
| MA | 3 | 0.0% |
| MP | 6 | 0.0% |
| PE | 2 | 0.0% |
| PL | 3 | 0.0% |
| PS | 2 | 0.0% |
| RA | 2 | 0.0% |
| SA | 3 | 0.0% |
| SC | 10 | 0.0% |
| SI | 4 | 0.0% |

## Required Microsoft Graph Permissions

The following Application permissions are required:

- `DeviceManagementConfiguration.Read.All` - Intune policies
- `Policy.Read.All` - Azure AD policies
- `InformationProtectionPolicy.Read.All` - Purview DLP
- `RoleManagement.Read.Directory` - PIM policies
- `AttackSimulation.Read.All` - Attack simulation training
