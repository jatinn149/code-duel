export enum JudgeInfrastructureStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
}

export interface ComponentHealth {
  status: JudgeInfrastructureStatus;
  details: string;
}

export class JudgeHealthService {
  private static instance: JudgeHealthService;
  private components: Map<string, ComponentHealth> = new Map();

  private constructor() {}

  public static getInstance(): JudgeHealthService {
    if (!JudgeHealthService.instance) {
      JudgeHealthService.instance = new JudgeHealthService();
    }
    return JudgeHealthService.instance;
  }

  public updateComponent(name: string, status: JudgeInfrastructureStatus, details: string = '') {
    this.components.set(name, { status, details });
  }

  public getComponent(name: string): ComponentHealth | undefined {
    return this.components.get(name);
  }

  public getOverallStatus(): JudgeInfrastructureStatus {
    let hasDegraded = false;
    for (const health of this.components.values()) {
      if (health.status === JudgeInfrastructureStatus.OFFLINE) {
        return JudgeInfrastructureStatus.OFFLINE;
      }
      if (health.status === JudgeInfrastructureStatus.DEGRADED) {
        hasDegraded = true;
      }
    }
    return hasDegraded ? JudgeInfrastructureStatus.DEGRADED : JudgeInfrastructureStatus.HEALTHY;
  }

  public getStatusReport(): Record<string, unknown> {
    const components: Record<string, unknown> = {};
    for (const [name, health] of this.components.entries()) {
      components[name] = health;
    }
    return {
      overall: this.getOverallStatus(),
      components,
    };
  }
}

export const healthService = JudgeHealthService.getInstance();
