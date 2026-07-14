import React from 'react';
import { SecurityEvent } from '../types';

interface ChartsProps {
  events: SecurityEvent[];
}

export default function DashboardCharts({ events }: ChartsProps) {
  // 1. Calculate event counts by category
  const typesCount = {
    transaction: 0,
    login: 0,
    api: 0,
    network: 0
  };

  const statusCount = {
    allowed: 0,
    flagged: 0,
    blocked: 0
  };

  events.forEach((evt) => {
    if (typesCount[evt.type] !== undefined) typesCount[evt.type]++;
    if (statusCount[evt.status] !== undefined) statusCount[evt.status]++;
  });

  const total = events.length || 1;

  // 2. Map risk timeline of the last 20 events
  const timelineEvents = [...events].slice(0, 15).reverse();
  const maxScore = 100;

  // Render SVG Path for risk timeline
  const width = 500;
  const height = 140;
  const padding = 20;

  const points = timelineEvents.map((evt, idx) => {
    const x = padding + (idx / Math.max(1, timelineEvents.length - 1)) * (width - padding * 2);
    const y = height - padding - (evt.riskScore / maxScore) * (height - padding * 2);
    return { x, y, score: evt.riskScore, type: evt.type, status: evt.status };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6" id="dashboard-charts-container">
      {/* Chart 1: Real-Time Risk Profile Timeline */}
      <div className="lg:col-span-2 p-5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-md" id="risk-timeline-chart">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100">Security Threat Timeline</h4>
            <p className="text-xs text-zinc-500 font-medium">Risk profiles of chronological incoming system events</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Safe
            </span>
          </div>
        </div>

        {/* SVG Risk Line Chart */}
        <div className="relative w-full h-[150px] bg-zinc-950/85 rounded-lg border border-zinc-800/80 p-1 overflow-hidden">
          {events.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
              Gathering initial event telemetry...
            </div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chart-stroke-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />

              {/* Gridline Labels */}
              <text x={padding - 5} y={padding + 3} fill="#71717a" fontSize="8" textAnchor="end" fontFamily="monospace">100%</text>
              <text x={padding - 5} y={height / 2 + 3} fill="#71717a" fontSize="8" textAnchor="end" fontFamily="monospace">50%</text>
              <text x={padding - 5} y={height - padding + 3} fill="#71717a" fontSize="8" textAnchor="end" fontFamily="monospace">0%</text>

              {/* Area Under Line */}
              {areaPath && <path d={areaPath} fill="url(#chart-area-grad)" />}

              {/* Connecting Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#chart-stroke-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {points.map((pt, i) => {
                const color = pt.score >= 85 ? '#ef4444' : pt.score >= 65 ? '#f59e0b' : '#10b981';
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill={color}
                      stroke="#18181b"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-200 hover:r-6"
                    />
                    <text x={pt.x} y={pt.y - 8} fill="#a1a1aa" fontSize="7" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                      {pt.score}%
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        <div className="flex justify-between items-center px-1 mt-2">
          <span className="text-[10px] text-zinc-500 font-medium">← Older events</span>
          <span className="text-[10px] text-zinc-500 font-medium">Most recent event →</span>
        </div>
      </div>

      {/* Chart 2: Threat Distribution Breakdown */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-md flex flex-col justify-between" id="threat-distribution-chart">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100 mb-1">Telemetry Distribution</h4>
          <p className="text-xs text-zinc-500 font-medium mb-4">Event classification splits and volumes</p>
        </div>

        {/* Dynamic Category Progress Bars */}
        <div className="space-y-4 my-auto" id="distribution-progress-bars">
          {/* Transaction */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Finance Transactions
              </span>
              <span className="font-mono text-zinc-400">{typesCount.transaction} ({Math.round((typesCount.transaction / total) * 100)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(typesCount.transaction / total) * 100}%` }}></div>
            </div>
          </div>

          {/* Login Anomalies */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Device Logins
              </span>
              <span className="font-mono text-zinc-400">{typesCount.login} ({Math.round((typesCount.login / total) * 100)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${(typesCount.login / total) * 100}%` }}></div>
            </div>
          </div>

          {/* API Intrusion */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span> API Payload Scanning
              </span>
              <span className="font-mono text-zinc-400">{typesCount.api} ({Math.round((typesCount.api / total) * 100)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="bg-purple-400 h-full rounded-full transition-all duration-500" style={{ width: `${(typesCount.api / total) * 100}%` }}></div>
            </div>
          </div>

          {/* Network anomalies */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span> Network Traffic
              </span>
              <span className="font-mono text-zinc-400">{typesCount.network} ({Math.round((typesCount.network / total) * 100)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${(typesCount.network / total) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Allowed vs Flagged vs Blocked summary row */}
        <div className="pt-4 mt-4 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center text-[10px]" id="status-summary-row">
          <div>
            <p className="text-zinc-500 font-bold uppercase tracking-wider">ALLOWED</p>
            <p className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">{statusCount.allowed}</p>
          </div>
          <div className="border-x border-zinc-800">
            <p className="text-zinc-500 font-bold uppercase tracking-wider">FLAGGED</p>
            <p className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">{statusCount.flagged}</p>
          </div>
          <div>
            <p className="text-zinc-500 font-bold uppercase tracking-wider">BLOCKED</p>
            <p className="text-sm font-extrabold text-red-400 font-mono mt-0.5">{statusCount.blocked}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
