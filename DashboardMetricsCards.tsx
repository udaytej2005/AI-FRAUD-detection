import React from 'react';
import { Shield, AlertTriangle, Activity, CheckCircle, Zap } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsProps {
  metrics: DashboardMetrics;
}

export default function DashboardMetricsCards({ metrics }: MetricsProps) {
  const cards = [
    {
      id: "metric-total-events",
      title: "Total Tracked Events",
      value: metrics.totalEvents.toLocaleString(),
      subtext: "Live connections & API logs",
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-zinc-900 border-zinc-800/80 hover:border-emerald-500/30",
    },
    {
      id: "metric-blocked-threats",
      title: "Blocked Attacks",
      value: metrics.blockedThreats.toLocaleString(),
      subtext: "Real-time edge blocking",
      icon: Shield,
      color: "text-red-400",
      bg: "bg-zinc-900 border-zinc-800/80 hover:border-red-500/30",
    },
    {
      id: "metric-avg-risk",
      title: "Average Risk Score",
      value: `${metrics.averageRiskScore}%`,
      subtext: "Mean exposure threat rating",
      icon: Zap,
      color: metrics.averageRiskScore > 50 ? "text-amber-400" : "text-emerald-400",
      bg: "bg-zinc-900 border-zinc-800/80 hover:border-amber-500/30",
    },
    {
      id: "metric-active-alerts",
      title: "Active Open Alerts",
      value: metrics.activeAlertsCount.toString(),
      subtext: "Awaiting incident triage",
      icon: AlertTriangle,
      color: metrics.activeAlertsCount > 0 ? "text-red-400 animate-pulse" : "text-zinc-500",
      bg: "bg-zinc-900 border-zinc-800/80 hover:border-red-500/30",
    }
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="dashboard-metrics-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={card.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:shadow-black/25 hover:-translate-y-0.5 ${card.bg}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{card.title}</p>
                  <h3 className="text-3xl font-extrabold font-sans text-zinc-50 tracking-tight">{card.value}</h3>
                </div>
                <div className={`p-2 bg-zinc-950 rounded-lg border border-zinc-800 ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Model Efficacy Indicators - Bento Card integration */}
      <div className="mt-6 p-5 bg-zinc-900 text-zinc-100 rounded-xl border border-zinc-800" id="model-efficacy-section">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">AI / ML Cognitive Model Indicators</h4>
            </div>
            <p className="text-xs text-zinc-500 font-medium">Real-time precision scores evaluated across current intrusion streams</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1 lg:max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="text-right min-w-[75px]">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Classification</p>
                <p className="text-sm font-extrabold text-zinc-100 font-mono">{metrics.accuracy}%</p>
              </div>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.accuracy}%` }}></div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right min-w-[75px]">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Behavioral</p>
                <p className="text-sm font-extrabold text-zinc-100 font-mono">{metrics.behavioralScore}%</p>
              </div>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.behavioralScore}%` }}></div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right min-w-[75px]">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Patterns</p>
                <p className="text-sm font-extrabold text-zinc-100 font-mono">{metrics.patternScore}%</p>
              </div>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.patternScore}%` }}></div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right min-w-[75px]">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Threat Intel</p>
                <p className="text-sm font-extrabold text-zinc-100 font-mono">{metrics.threatIntelScore}%</p>
              </div>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.threatIntelScore}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
