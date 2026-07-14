import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { SecurityEvent, Alert, ModelConfig, SlackConfig, SlackLog } from "./types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not configured. Running in offline/mock mode for AI features.");
}

// In-Memory Database State
let events: SecurityEvent[] = [];
let alerts: Alert[] = [];
let slackLogs: SlackLog[] = [];

// Defaults
let modelConfig: ModelConfig = {
  algorithm: 'random_forest',
  sensitivityThreshold: 65,
  autoBlockThreshold: 85,
  learningRate: 0.05,
  featureWeights: {
    transactionAmount: 30,
    ipDistance: 20,
    requestVelocity: 15,
    payloadEntropy: 20,
    behavioralAnomaly: 15
  }
};

let slackConfig: SlackConfig = {
  webhookUrl: "",
  isEnabled: false,
  channel: "#security-alerts",
  minSeverity: "high"
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to generate raw seed events
const mockIPs = [
  "192.168.1.104", "10.0.0.45", "185.190.140.23", "45.227.254.12",
  "82.102.23.190", "198.51.100.12", "172.56.21.99", "103.241.12.8"
];

const mockEmails = [
  "admin@platform.com", "user.john@gmail.com", "billing@service.org",
  "support@enterprise.io", "guest_9823@anonymous.net"
];

const mockLocations = [
  "San Francisco, USA", "Frankfurt, Germany", "St. Petersburg, Russia",
  "Lagos, Nigeria", "Shenzhen, China", "London, UK", "Sao Paulo, Brazil"
];

// Seed the initial data history
const seedData = () => {
  const now = new Date();
  
  // Seed some allowed events and a few alerts over the last 2 hours
  for (let i = 40; i >= 1; i--) {
    const timestamp = new Date(now.getTime() - i * 3 * 60 * 1000); // every 3 minutes
    const event = generateSimulatedEvent(timestamp);
    events.unshift(event);
    
    // Evaluate if it triggers an alert
    if (event.status === 'flagged' || event.status === 'blocked') {
      const severity = event.riskScore >= 85 ? 'critical' : event.riskScore >= 70 ? 'high' : event.riskScore >= 50 ? 'medium' : 'low';
      alerts.unshift({
        id: "alert_" + generateId(),
        timestamp: timestamp.toISOString(),
        title: `${event.type.toUpperCase()} - Threat Detected`,
        severity,
        type: event.type,
        riskScore: event.riskScore,
        status: 'open',
        eventId: event.id,
        event
      });
    }
  }
};

// Evaluate Risk Score based on configured model weights
const evaluateEventRisk = (details: Record<string, any>) => {
  const weights = modelConfig.featureWeights;
  
  // Base weights evaluation (each attribute is rated 0 - 100 in details)
  const amountFactor = (details.amount_score || 0) * (weights.transactionAmount / 100);
  const ipFactor = (details.ip_distance_score || 0) * (weights.ipDistance / 100);
  const velocityFactor = (details.velocity_score || 0) * (weights.requestVelocity / 100);
  const entropyFactor = (details.entropy_score || 0) * (weights.payloadEntropy / 100);
  const behavioralFactor = (details.behavioral_score || 0) * (weights.behavioralAnomaly / 100);
  
  // Combined score (0-100)
  let baseScore = amountFactor + ipFactor + velocityFactor + entropyFactor + behavioralFactor;
  
  // Algorithm variation modifiers
  switch (modelConfig.algorithm) {
    case 'isolation_forest':
      // Isolation forest highlights outliers; accentuates the highest single factor
      const maxFactor = Math.max(
        details.amount_score || 0,
        details.ip_distance_score || 0,
        details.velocity_score || 0,
        details.entropy_score || 0,
        details.behavioral_score || 0
      );
      baseScore = baseScore * 0.7 + maxFactor * 0.3;
      break;
    case 'autoencoder':
      // Autoencoders evaluate reconstructed error; behaves more exponentially at high anomalies
      baseScore = Math.pow(baseScore / 100, 1.2) * 100;
      break;
    case 'neural_network':
      // Neural networks detect complex non-linear combinations
      if ((details.ip_distance_score > 70) && (details.behavioral_score > 70)) {
        baseScore = Math.min(100, baseScore + 15);
      }
      break;
    default:
      break;
  }
  
  return Math.min(100, Math.max(0, Math.round(baseScore)));
};

// Generates a random realistic security event (normal or anomalous)
const generateSimulatedEvent = (time: Date = new Date()): SecurityEvent => {
  const types: SecurityEvent["type"][] = ['transaction', 'login', 'api', 'network'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  // 15% chance of generating a simulated attack/anomaly
  const isAttack = Math.random() < 0.15;
  
  let source = "";
  let destination = "";
  let description = "";
  let amount: number | undefined;
  
  const details: Record<string, any> = {
    amount_score: 0,
    ip_distance_score: 0,
    velocity_score: 0,
    entropy_score: 0,
    behavioral_score: 0
  };

  const randomIP = () => mockIPs[Math.floor(Math.random() * mockIPs.length)];
  const randomEmail = () => mockEmails[Math.floor(Math.random() * mockEmails.length)];
  const randomLocation = () => mockLocations[Math.floor(Math.random() * mockLocations.length)];

  if (type === 'transaction') {
    const email = randomEmail();
    source = email;
    destination = `CardEnding-${Math.floor(1000 + Math.random() * 9000)}`;
    amount = isAttack ? parseFloat((1200 + Math.random() * 9000).toFixed(2)) : parseFloat((10 + Math.random() * 400).toFixed(2));
    
    details.amount_score = isAttack ? 95 : Math.min(100, Math.round((amount / 1000) * 10));
    details.ip_distance_score = isAttack ? 85 : Math.floor(Math.random() * 30);
    details.velocity_score = isAttack ? 90 : Math.floor(Math.random() * 40);
    details.behavioral_score = isAttack ? 80 : Math.floor(Math.random() * 20);
    details.location = isAttack ? randomLocation() : "Local Region";
    details.merchant = ["CloudService Inc", "Electronics Hub", "Retail Group", "ShadowyExchange", "Main Street Bakery"][Math.floor(Math.random() * 5)];
    
    description = isAttack 
      ? `High-value suspicious transaction ($${amount}) flagged at ${details.merchant} from unrecognized location.`
      : `Standard online payment of $${amount} cleared successfully at ${details.merchant}.`;
      
  } else if (type === 'login') {
    const email = randomEmail();
    source = randomIP();
    destination = email;
    
    details.ip_distance_score = isAttack ? 95 : Math.floor(Math.random() * 15);
    details.velocity_score = isAttack ? 85 : Math.floor(Math.random() * 25);
    details.behavioral_score = isAttack ? 90 : Math.floor(Math.random() * 10);
    details.device = isAttack ? "Unknown Linux Shell CLI / Python-urllib" : "Chrome on macOS Big Sur";
    details.location = isAttack ? "Suspicious Node (Tor Exit)" : "User Home Region";
    
    description = isAttack 
      ? `Brute force login warning for account ${email} from suspicious IP ${source}.`
      : `Successful user login for ${email} from authorized device.`;
      
  } else if (type === 'api') {
    source = randomIP();
    destination = "/api/v1/users/admin/secrets";
    
    details.entropy_score = isAttack ? 95 : Math.floor(Math.random() * 10);
    details.velocity_score = isAttack ? 90 : Math.floor(Math.random() * 20);
    details.behavioral_score = isAttack ? 85 : Math.floor(Math.random() * 15);
    details.endpoint = destination;
    details.payload_snippet = isAttack ? "UNION SELECT username, password_hash FROM users --" : "id=5612&format=json";
    details.userAgent = isAttack ? "sqlmap/1.4.12" : "Mozilla/5.0 (Windows NT 10.0; Win64)";
    
    description = isAttack
      ? `SQL Injection attempt detected on API endpoint ${destination} from ${source}.`
      : `Valid GET request processed on endpoint "/api/v1/metrics".`;
      
  } else { // network
    source = randomIP();
    destination = "Intranet DMZ Gateway";
    
    details.velocity_score = isAttack ? 95 : Math.floor(Math.random() * 5);
    details.ip_distance_score = isAttack ? 75 : Math.floor(Math.random() * 15);
    details.entropy_score = isAttack ? 90 : Math.floor(Math.random() * 20);
    details.ports_scanned = isAttack ? "22, 80, 443, 8080, 3306, 27017" : "443";
    details.packet_count = isAttack ? 15400 : 12;
    
    description = isAttack
      ? `Port scan and protocol anomaly detected from ${source} targeting intranets.`
      : `Secure SSL handshake completed with client gateway ${source}.`;
  }

  // Calculate score & assign actions
  const riskScore = evaluateEventRisk(details);
  let status: SecurityEvent["status"] = 'allowed';
  
  if (riskScore >= modelConfig.autoBlockThreshold) {
    status = 'blocked';
  } else if (riskScore >= modelConfig.sensitivityThreshold) {
    status = 'flagged';
  }

  return {
    id: "evt_" + generateId(),
    timestamp: time.toISOString(),
    type,
    source,
    destination,
    amount,
    status,
    riskScore,
    description,
    details
  };
};

// Trigger alert and optional Slack notifier
const triggerSlackAlert = async (alert: Alert) => {
  if (!slackConfig.isEnabled) return;
  
  // Severity comparison helper
  const severities = ['low', 'medium', 'high', 'critical'];
  const minIdx = severities.indexOf(slackConfig.minSeverity);
  const curIdx = severities.indexOf(alert.severity);
  
  if (curIdx < minIdx) return; // lower severity than config minimum

  // Structure Slack Message
  const slackPayload = {
    channel: slackConfig.channel,
    username: "AI Intrusion Shield",
    icon_emoji: alert.severity === 'critical' ? ':fire:' : ':shield:',
    attachments: [
      {
        color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : alert.severity === 'medium' ? '#eab308' : '#3b82f6',
        title: `🚨 SEC-ALERT: ${alert.title}`,
        text: alert.event.description,
        fields: [
          { title: "Severity", value: alert.severity.toUpperCase(), short: true },
          { title: "Risk Score", value: `${alert.riskScore}%`, short: true },
          { title: "Incident Type", value: alert.type.toUpperCase(), short: true },
          { title: "Origin IP/Email", value: alert.event.source, short: true },
          { title: "Impact Target", value: alert.event.destination, short: true },
          { title: "Event ID", value: alert.event.id, short: true }
        ],
        footer: "AI-Driven Fraud & Intrusion Detection System",
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }
    ]
  };

  const logEntry: SlackLog = {
    id: "slk_" + generateId(),
    timestamp: new Date().toISOString(),
    alertId: alert.id,
    payload: slackPayload,
    status: 'simulated'
  };

  if (slackConfig.webhookUrl && slackConfig.webhookUrl.startsWith("https://")) {
    try {
      const res = await fetch(slackConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload)
      });
      if (res.ok) {
        logEntry.status = 'sent';
      } else {
        logEntry.status = 'failed';
        logEntry.errorMessage = `Slack returned code ${res.status}`;
      }
    } catch (err: any) {
      logEntry.status = 'failed';
      logEntry.errorMessage = err.message || "Network Error sending to Slack";
    }
  }

  slackLogs.unshift(logEntry);
};

// Seed initial values
seedData();

// Start periodic traffic generator (simulate event every 4 seconds)
setInterval(() => {
  const event = generateSimulatedEvent();
  events.unshift(event);
  
  // Keep event logs size bounded
  if (events.length > 200) {
    events.pop();
  }
  
  // Evaluate alert trigger
  if (event.status === 'flagged' || event.status === 'blocked') {
    const severity = event.riskScore >= 85 ? 'critical' : event.riskScore >= 70 ? 'high' : event.riskScore >= 50 ? 'medium' : 'low';
    const newAlert: Alert = {
      id: "alert_" + generateId(),
      timestamp: event.timestamp,
      title: `${event.type.toUpperCase()} - Threat Detected (${severity.toUpperCase()})`,
      severity,
      type: event.type,
      riskScore: event.riskScore,
      status: 'open',
      eventId: event.id,
      event
    };
    
    alerts.unshift(newAlert);
    
    // Auto trigger Slack notification
    triggerSlackAlert(newAlert);
  }
}, 4000);


// API Endpoints

// 1. GET METRICS
app.get("/api/metrics", (req, res) => {
  const blockedCount = events.filter(e => e.status === 'blocked').length;
  const activeAlerts = alerts.filter(a => a.status !== 'resolved').length;
  
  // Calculate rolling risk average of the last 20 events
  const sliceEvents = events.slice(0, 20);
  const avgRisk = sliceEvents.length > 0 
    ? Math.round(sliceEvents.reduce((acc, curr) => acc + curr.riskScore, 0) / sliceEvents.length)
    : 0;

  res.json({
    totalEvents: events.length,
    blockedThreats: blockedCount,
    averageRiskScore: avgRisk,
    activeAlertsCount: activeAlerts,
    // Realistic static detection efficacy metrics
    accuracy: 94.2,
    behavioralScore: 91.7,
    patternScore: 96.5,
    threatIntelScore: 89.3
  });
});

// 2. GET EVENTS
app.get("/api/events", (req, res) => {
  res.json(events.slice(0, 50));
});

// 3. GET ALERTS
app.get("/api/alerts", (req, res) => {
  res.json(alerts);
});

// 4. ACTION ALERT: ACKNOWLEDGE
app.post("/api/alerts/:id/acknowledge", (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) {
    alert.status = 'acknowledged';
    res.json({ success: true, alert });
  } else {
    res.status(404).json({ error: "Alert not found" });
  }
});

// 5. ACTION ALERT: RESOLVE
app.post("/api/alerts/:id/resolve", (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) {
    alert.status = 'resolved';
    res.json({ success: true, alert });
  } else {
    res.status(404).json({ error: "Alert not found" });
  }
});

// 6. ACTION: CLEAR ALL / RESET DB
app.post("/api/alerts/clear", (req, res) => {
  events = [];
  alerts = [];
  slackLogs = [];
  seedData();
  res.json({ success: true });
});

// 7. GET CONFIG
app.get("/api/config", (req, res) => {
  res.json({ modelConfig, slackConfig });
});

// 8. POST CONFIG MODEL
app.post("/api/config/model", (req, res) => {
  modelConfig = { ...modelConfig, ...req.body };
  res.json({ success: true, modelConfig });
});

// 9. POST CONFIG SLACK
app.post("/api/config/slack", (req, res) => {
  slackConfig = { ...slackConfig, ...req.body };
  res.json({ success: true, slackConfig });
});

// 10. GET SLACK LOGS
app.get("/api/slack/logs", (req, res) => {
  res.json(slackLogs);
});

// 11. POST TEST SLACK ALERT
app.post("/api/slack/test", async (req, res) => {
  const dummyEvent: SecurityEvent = {
    id: "evt_test_" + generateId(),
    timestamp: new Date().toISOString(),
    type: 'transaction',
    source: "attacker_test_run@malicious.com",
    destination: "Demo Financial Gateway",
    amount: 9999.00,
    status: 'flagged',
    riskScore: 92,
    description: "Manual Slack Webhook Integrity Verification Test Incident.",
    details: {
      amount_score: 95,
      ip_distance_score: 90,
      velocity_score: 80,
      entropy_score: 20,
      behavioral_score: 90
    }
  };

  const dummyAlert: Alert = {
    id: "alert_test_" + generateId(),
    timestamp: dummyEvent.timestamp,
    title: "TEST INTEGRATION - Simulated Active Attack",
    severity: 'critical',
    type: 'transaction',
    riskScore: 92,
    status: 'open',
    eventId: dummyEvent.id,
    event: dummyEvent
  };

  await triggerSlackAlert(dummyAlert);
  res.json({ success: true, log: slackLogs[0] || null });
});


// 12. AI ENDPOINT: GEMINI AI MODEL TUNER
app.post("/api/ai/tune-model", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Tuning prompt is required" });
  }

  if (!ai) {
    // Offline/Fallback mode
    return res.json({
      modelConfig: {
        algorithm: 'isolation_forest',
        sensitivityThreshold: 60,
        autoBlockThreshold: 80,
        learningRate: 0.08,
        featureWeights: {
          transactionAmount: 35,
          ipDistance: 25,
          requestVelocity: 15,
          payloadEntropy: 15,
          behavioralAnomaly: 10
        }
      },
      advice: "⚠️ Running in offline simulation mode because the Gemini API key is not configured in the Secrets panel.\n\nSimulated suggestions applied for optimized outlier detection: Elevated transactionAmount (35%) and ipDistance (25%) weights to quickly intercept anomalous locations."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert AI security engineer and detection scientist.
The user wants to tune an AI Fraud & Intrusion Detection Platform's ML model settings for a specific scenario:
"${prompt}"

Generate the optimal parameters and feature weights that total EXACTLY 100, select the best fitting algorithm, sensitivity, and auto-block thresholds.
Provide a detailed JSON response according to this schema:
{
  "algorithm": "random_forest" | "isolation_forest" | "gradient_boosting" | "autoencoder" | "neural_network",
  "sensitivityThreshold": number (between 30 and 90),
  "autoBlockThreshold": number (between 50 and 95),
  "learningRate": number (between 0.01 and 0.5),
  "featureWeights": {
    "transactionAmount": number (percentage),
    "ipDistance": number (percentage),
    "requestVelocity": number (percentage),
    "payloadEntropy": number (percentage),
    "behavioralAnomaly": number (percentage)
  },
  "advice": "Explain why these parameters, threshold numbers, and this algorithm were recommended for this specific defense scenario in 2-3 clear sentences."
}

Ensure the 5 feature weights sum up to exactly 100. Provide valid JSON and nothing else.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["algorithm", "sensitivityThreshold", "autoBlockThreshold", "learningRate", "featureWeights", "advice"],
          properties: {
            algorithm: { type: Type.STRING, enum: ["random_forest", "isolation_forest", "gradient_boosting", "autoencoder", "neural_network"] },
            sensitivityThreshold: { type: Type.INTEGER },
            autoBlockThreshold: { type: Type.INTEGER },
            learningRate: { type: Type.NUMBER },
            featureWeights: {
              type: Type.OBJECT,
              required: ["transactionAmount", "ipDistance", "requestVelocity", "payloadEntropy", "behavioralAnomaly"],
              properties: {
                transactionAmount: { type: Type.INTEGER },
                ipDistance: { type: Type.INTEGER },
                requestVelocity: { type: Type.INTEGER },
                payloadEntropy: { type: Type.INTEGER },
                behavioralAnomaly: { type: Type.INTEGER }
              }
            },
            advice: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Gemini Tune Model Error:", error);
    res.status(500).json({ error: "Failed to generate AI recommendations: " + error.message });
  }
});


// 13. AI ENDPOINT: GEMINI AI INCIDENT ANALYZER
app.post("/api/ai/analyze-incident", async (req, res) => {
  const { alertId } = req.body;
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: "Alert incident not found" });
  }

  if (!ai) {
    // Return mock analysis
    const sampleAnalysis = `### Offline AI Threat Report (Simulated)
**Incident Assessment**: Unusually high risk factor in the incoming metadata stream.
- **Attack Vector**: Potential injection or credential exploitation based on high behavioral anomaly score (${alert.event.details.behavioral_score}%).
- **Remediation Actions**:
  1. Temporary firewall ACL to reject IP range ${alert.event.source}.
  2. Invalidate active user tokens/cookies associated with ${alert.event.destination}.
  3. Deploy standard rate-limiting controls to prevent automated scanner progression.

*Configure your Gemini API Key in the AI Studio Secrets panel to enable real-time generative threat logs.*`;
    
    alert.aiAnalysis = sampleAnalysis;
    return res.json({ analysis: sampleAnalysis });
  }

  try {
    const prompt = `Analyze this security incident detected on our Fraud & Intrusion Detection Platform.
Alert Metadata:
- Severity: ${alert.severity}
- Risk Score: ${alert.riskScore}%
- Type: ${alert.type}
- Trigger Title: ${alert.title}
- Source: ${alert.event.source}
- Target Destination: ${alert.event.destination}
- Description: ${alert.event.description}
- Technical Context: ${JSON.stringify(alert.event.details)}

Please produce a comprehensive Threat Investigation and Response Report in markdown. It should contain:
1. **Executive Summary**: 1-2 sentence assessment of the attack type.
2. **Technical Incident Reconstruction**: Trace the sequence of anomalies (e.g. why behavioral, velocity, or payload scores are abnormal).
3. **Automated Response Recommendations**: Concrete, immediate containment and eradication recommendations for security operations staff (e.g., blocking sources, session invalidation).
4. **Calculated AI Severity Confidence**: Express as percentage with brief mathematical justification.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Incident Responder and SOC Lead. Write a highly analytical, professional security intelligence bulletin. Avoid casual phrasing."
      }
    });

    const analysisResult = response.text;
    alert.aiAnalysis = analysisResult;
    res.json({ analysis: analysisResult });
  } catch (error: any) {
    console.error("Gemini Analyze Incident Error:", error);
    res.status(500).json({ error: "Failed to analyze incident: " + error.message });
  }
});


// Vite middleware logic
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
