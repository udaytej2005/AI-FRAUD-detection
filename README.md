# 🛡️ AI Fraud & Intrusion Detection Platform

An AI-powered real-time Security Operations Center (SOC) dashboard that detects fraudulent activities and network intrusions using Machine Learning, behavioral analysis, and Google Gemini AI.

---

## 📌 Overview

This platform continuously monitors incoming security events, evaluates their risk score, generates alerts, and provides AI-generated incident analysis.

It is designed as a modern Security Operations Center (SOC) dashboard for cybersecurity monitoring and fraud detection.

---

## ✨ Features

### 📊 Real-Time Dashboard
- Live security metrics
- Total monitored events
- Active alerts
- Average risk score
- Blocked attacks
- Threat intelligence statistics

### 🌍 Interactive Threat Heatmap
- Geographic attack visualization
- Network topology view
- Live attack locations
- Threat node monitoring

### 🚨 Alert Management
- Severity-based alerts
- AI incident investigation
- Alert acknowledgment
- Alert resolution
- Search and filtering

### 📑 Event Monitoring
- Login monitoring
- API monitoring
- Transaction monitoring
- Network traffic monitoring
- Event filtering

### 🤖 AI Incident Analysis
Powered by Google Gemini AI

- Root cause analysis
- Threat explanation
- Risk assessment
- Recommended mitigation
- AI-generated incident reports

### ⚙️ ML Configuration Panel
Customize fraud detection parameters:

- Detection algorithm
- Sensitivity threshold
- Auto-block threshold
- Learning rate
- Feature weights

Supported algorithms:

- Random Forest
- Isolation Forest
- Gradient Boosting
- Autoencoder
- Neural Network

### 🔔 Slack Integration
- Automatic Slack notifications
- Severity filtering
- Test notifications
- Webhook configuration
- Alert delivery logs

---

## 🛠 Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- D3.js
- Lucide React

### Backend

- Node.js
- Express.js
- TypeScript

### AI

- Google Gemini API
- Google GenAI SDK

### Visualization

- D3.js
- SVG
- Interactive Maps

---

## 📂 Project Structure

```
.
├── App.tsx
├── server.ts
├── types.ts
├── DashboardMetricsCards.tsx
├── DashboardCharts.tsx
├── ThreatHeatmap.tsx
├── AlertsTable.tsx
├── EventsTable.tsx
├── ModelConfigPanel.tsx
├── SlackWebhookPanel.tsx
├── index.css
├── package.json
└── vite.config.ts
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/AI-Fraud-Intrusion-Detection.git
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` file:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Run Development Server

```bash
npm run dev
```

Application:

```
http://localhost:3000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/events | Fetch events |
| GET | /api/alerts | Fetch alerts |
| GET | /api/metrics | Dashboard metrics |
| GET | /api/config | Current configuration |
| POST | /api/config | Update ML configuration |
| GET | /api/slack/logs | Slack notification logs |

---

## 🧠 Risk Evaluation

The platform evaluates events using multiple features:

- Transaction Amount
- IP Distance
- Request Velocity
- Payload Entropy
- Behavioral Anomaly

Each feature contributes to the final risk score using configurable weights.

---

## 🔐 Security Features

- Fraud Detection
- Intrusion Detection
- Behavioral Analysis
- Risk Scoring
- Auto Blocking
- AI Investigation
- Threat Intelligence
- Real-time Monitoring

---

## 📸 Dashboard Modules

- Dashboard Overview
- Threat Heatmap
- Security Charts
- Alerts Panel
- Events Viewer
- AI Model Configuration
- Slack Integration

---

## 📦 Available Scripts

```bash
npm run dev
```

Runs the development server.

```bash
npm run build
```

Creates production build.

```bash
npm start
```

Starts production server.

```bash
npm run lint
```

Runs TypeScript checks.

---

## 🎯 Future Enhancements

- SIEM Integration
- Elasticsearch Support
- Kafka Streaming
- Multi-user Authentication
- JWT Security
- Email Notifications
- PDF Incident Reports
- MongoDB/PostgreSQL Support
- Docker Deployment
- Kubernetes Deployment

---

## 👨‍💻 Author

**Uday Teja**

B.Tech Computer Science Engineering

Specialization:
- Cyber Security
- Artificial Intelligence
- Machine Learning
- Full Stack Development

---

## 📄 License

This project is intended for educational, research, and demonstration purposes.

---

⭐ If you found this project useful, consider giving it a star on GitHub.
