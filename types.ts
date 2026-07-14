export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'transaction' | 'login' | 'api' | 'network';
  source: string;
  destination: string;
  amount?: number;
  status: 'allowed' | 'flagged' | 'blocked';
  riskScore: number;
  description: string;
  details: Record<string, any>;
}

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'transaction' | 'login' | 'api' | 'network';
  riskScore: number;
  status: 'open' | 'acknowledged' | 'resolved';
  eventId: string;
  event: SecurityEvent;
  aiAnalysis?: string;
  aiAnalyzing?: boolean;
}

export interface ModelConfig {
  algorithm: 'random_forest' | 'isolation_forest' | 'gradient_boosting' | 'autoencoder' | 'neural_network';
  sensitivityThreshold: number;
  autoBlockThreshold: number;
  learningRate: number;
  featureWeights: {
    transactionAmount: number;
    ipDistance: number;
    requestVelocity: number;
    payloadEntropy: number;
    behavioralAnomaly: number;
  };
}

export interface SlackConfig {
  webhookUrl: string;
  isEnabled: boolean;
  channel: string;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SlackLog {
  id: string;
  timestamp: string;
  alertId: string;
  payload: any;
  status: 'sent' | 'simulated' | 'failed';
  errorMessage?: string;
}

export interface DashboardMetrics {
  totalEvents: number;
  blockedThreats: number;
  averageRiskScore: number;
  activeAlertsCount: number;
  accuracy: number;
  behavioralScore: number;
  patternScore: number;
  threatIntelScore: number;
}
