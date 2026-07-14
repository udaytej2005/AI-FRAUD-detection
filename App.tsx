import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Activity, BellRing, Settings, RefreshCw, Server, Users, Network, Clock, Zap } from 'lucide-react';
import { SecurityEvent, Alert, ModelConfig, SlackConfig, SlackLog, DashboardMetrics } from './types';
import DashboardMetricsCards from './DashboardMetricsCards';
import ThreatHeatmap from './ThreatHeatmap';
import DashboardCharts from './DashboardCharts';
import AlertsTable from './AlertsTable';
import EventsTable from './EventsTable';
import ModelConfigPanel from './ModelConfigPanel';
import SlackWebhookPanel from './SlackWebhookPanel';

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'alerts' | 'events' | 'config' | 'slack'>('dashboard');
  
  // App States
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    blockedThreats: 0,
    averageRiskScore: 0,
    activeAlertsCount: 0,
    accuracy: 94.2,
    behavioralScore: 91.7,
    patternScore: 96.5,
    threatIntelScore: 89.3
  });
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [slackConfig, setSlackConfig] = useState<SlackConfig | null>(null);
  const [slackLogs, setSlackLogs] = useState<SlackLog[]>([]);

  // AI State
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);

  // Sync state from server
  const fetchAllState = async () => {
    const fetchWithFallback = async <T,>(url: string, setter: (val: T) => void, extractor?: (data: any) => T) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setter(extractor ? extractor(data) : data);
        }
      } catch (err) {
        // Gracefully handle transient connection/restart issues with a quiet warning
        console.debug(`Soft sync update pending for ${url}:`, err instanceof Error ? err.message : err);
      }
    };

    try {
      await Promise.all([
        fetchWithFallback<DashboardMetrics>('/api/metrics', setMetrics),
        fetchWithFallback<SecurityEvent[]>('/api/events', setEvents),
        fetchWithFallback<Alert[]>('/api/alerts', setAlerts),
        fetchWithFallback<any>('/api/config', (data) => {
          if (data) {
            setModelConfig(data.modelConfig);
            setSlackConfig(data.slackConfig);
          }
        }),
        fetchWithFallback<SlackLog[]>('/api/slack/logs', setSlackLogs)
      ]);
    } catch (err) {
      console.debug("Liveness Sync pending:", err);
    } finally {
      setSystemLoading(false);
    }
  };

  // Sync on mount and then every 3 seconds
  useEffect(() => {
    fetchAllState();
    const interval = setInterval(fetchAllState, 3000);
    return () => clearInterval(interval);
  }, []);

  // API Callbacks

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) fetchAllState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) fetchAllState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyzeAlert = async (id: string) => {
    setAiAnalyzingId(id);
    setAiReport(null);
    try {
      const res = await fetch(`/api/ai/analyze-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: id })
      });
      const data = await res.json();
      if (res.ok) {
        setAiReport(data.analysis);
        // Refresh alert list as the AI report is now cached in the list
        fetchAllState();
      } else {
        alert(data.error || "Forensic analysis failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzingId(null);
    }
  };

  const handleUpdateModelConfig = async (newConfig: ModelConfig) => {
    try {
      const res = await fetch('/api/config/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setModelConfig(data.modelConfig);
        fetchAllState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSlackConfig = async (newConfig: SlackConfig) => {
    try {
      const res = await fetch('/api/config/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setSlackConfig(data.slackConfig);
        fetchAllState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerTestSlack = async () => {
    try {
      const res = await fetch('/api/slack/test', { method: 'POST' });
      if (res.ok) fetchAllState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllLogs = async () => {
    if (window.confirm("Are you sure you want to reset all simulated telemetry events and alerts history?")) {
      try {
        const res = await fetch('/api/alerts/clear', { method: 'POST' });
        if (res.ok) fetchAllState();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (systemLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-semibold tracking-wider font-mono uppercase text-slate-400">Booting AI Intrusion Shield...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950 font-sans" id="app-viewport-root">
      {/* Dynamic Security Operations Header */}
      <header className="bg-zinc-900 text-zinc-100 border-b border-zinc-800 px-6 py-4 sticky top-0 z-40 shadow-md" id="main-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-zinc-950 shadow-md shadow-emerald-500/10">
              <ShieldCheck className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-sans tracking-tight text-white">ONYX AI</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">v4.2.0 Live</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Advanced Threat & Intrusion Defense Platform</p>
            </div>
          </div>

          {/* Time & Environment Status */}
          <div className="flex items-center gap-3 text-xs" id="header-status-ribbon">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-1.5 flex flex-col">
              <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">UTC Time</span>
              <span className="text-xs font-mono font-medium text-zinc-300">2026-07-09 17:03</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-1.5 flex flex-col">
              <span className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">System Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-zinc-200">Operational</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Console Navigation */}
      <nav className="bg-zinc-900/60 border-b border-zinc-800/80 sticky top-[69px] z-30 backdrop-blur-md" id="navigation-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto gap-2 py-2.5 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Security Dashboard', icon: Activity },
              { id: 'alerts', label: `Threat Warnings (${alerts.filter(a => a.status === 'open').length})`, icon: ShieldAlert },
              { id: 'events', label: 'Continuous Logs', icon: Server },
              { id: 'config', label: 'Cognitive Engine Tuning', icon: Zap },
              { id: 'slack', label: 'Slack Webhooks', icon: BellRing }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  type="button"
                  onClick={() => {
                    setActiveView(tab.id as any);
                    setAiReport(null);
                  }}
                  className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all whitespace-nowrap border ${
                    isActive 
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/10' 
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800/60 border-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Screen Views rendering panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6" id="primary-content-viewport">
        {activeView === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn" id="view-dashboard">
            <DashboardMetricsCards metrics={metrics} />
            <ThreatHeatmap events={events} />
            <DashboardCharts events={events} />
            
            {/* Live alerts highlight bar in dashboard */}
            {alerts.filter(a => a.status === 'open').length > 0 && (
              <div className="p-5 bg-gradient-to-r from-red-950/20 to-zinc-900 border border-red-900/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <ShieldAlert className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Urgent Threat Warnings Pending Triage</h5>
                    <p className="text-xs text-zinc-400 mt-0.5">Our machine learning models have flagged active potential intrusions.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('alerts')}
                  className="text-xs bg-red-500 hover:bg-red-400 text-zinc-950 font-bold px-5 py-2.5 rounded-lg transition-all shadow-md uppercase tracking-wider"
                >
                  Triage Active Threats
                </button>
              </div>
            )}
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="animate-fadeIn" id="view-alerts">
            <AlertsTable 
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              onAnalyze={handleAnalyzeAlert}
              aiReport={aiReport}
              aiAnalyzingId={aiAnalyzingId}
            />
          </div>
        )}

        {activeView === 'events' && (
          <div className="animate-fadeIn" id="view-events">
            <EventsTable 
              events={events}
              onClear={handleClearAllLogs}
            />
          </div>
        )}

        {activeView === 'config' && modelConfig && (
          <div className="animate-fadeIn" id="view-config">
            <ModelConfigPanel 
              config={modelConfig}
              onUpdate={handleUpdateModelConfig}
            />
          </div>
        )}

        {activeView === 'slack' && slackConfig && (
          <div className="animate-fadeIn" id="view-slack">
            <SlackWebhookPanel 
              config={slackConfig}
              logs={slackLogs}
              onUpdate={handleUpdateSlackConfig}
              onTriggerTest={handleTriggerTestSlack}
            />
          </div>
        )}
      </main>

      {/* Global Console Status Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-5 px-6 text-xs text-zinc-500" id="main-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="font-medium">© 2026 ONYX AI Intrusion Shield. Real-Time Telemetry Pipeline Secured.</p>
          <div className="flex gap-5 font-mono text-[11px]" id="footer-details">
            <span className="flex items-center gap-1.5 text-zinc-400"><Server className="w-3.5 h-3.5 text-emerald-500" /> Receiver Port: 3000 Inbound</span>
            <span className="flex items-center gap-1.5 text-zinc-400"><Network className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Ingress Sandbox Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
