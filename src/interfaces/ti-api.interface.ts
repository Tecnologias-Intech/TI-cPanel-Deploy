import { DeploymentStatus } from '../enums/deployment-status.enum';

export interface TiApiUpdateDeployment {
  status?: DeploymentStatus,
  error?: string,
  metadata?: Record<string, any>,
  updateJobUrl?: boolean,
}
