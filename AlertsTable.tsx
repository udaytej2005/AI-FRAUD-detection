import React, { useState } from 'react';
import { Shield, AlertTriangle, AlertCircle, PlayCircle, Eye, Check, CheckSquare, Search, Brain, Loader, Activity } from 'lucide-react';
import { Alert, SecurityEvent } from '../types';

interface AlertsTableProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
  onAnalyze: (id: string) => Promise<void>;
  aiReport: string | null;
  aiAnalyzingId: string | null;
}

export default function AlertsTable({
  alerts,
  onAcknowledge,
  onResolve,
  onAnalyze,
  aiReport,
  aiAnalyzingId
}: AlertsTableProps) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filter alerts
  const filteredAlerts = alerts.filter((alt) => {
    const matchesSeverity = filterSeverity === 'all' || alt.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alt.status === filterStatus;
    const matchesSearch = 
      alt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.event.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.event.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  const getSeverityBadge = (sev: Alert["severity"]) => {
    switch (sev) {
      case 'critical':
        return <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 font-sans"><AlertCircle className="w-3 h-3 text-red-400" /> Critical</span>;
      case 'high':
        return <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 font-sans"><AlertTriangle className="w-3 h-3 text-orange-400" /> High</span>;
      case 'medium':
        return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 font-sans"><AlertTriangle className="w-3 h-3 text-amber-400" /> Medium</span>;
      default:
        return <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 font-sans"><Activity className="w-3 h-3 text-zinc-400" /> Low</span>;
    }
  };

  const getStatusBadge = (status: Alert["status"]) => {
    switch (status) {
      case 'resolved':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase font-sans">Resolved</span>;
      case 'acknowledged':
        return <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase font-sans">Acknowledged</span>;
      default:
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase animate-pulse font-sans">Open</span>;
    }
  };

  // Quick custom Markdown formatter for simple bold, headings and lists
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={i} className="text-xs font-bold text-zinc-100 mt-4 mb-2">{trimmed.replace('###', '')}</h4>;
      }
      if (trimmed.startsWith('**')) {
        return <p key={i} className="text-xs text-zinc-200 font-bold mt-2">{trimmed.replace(/\*\*/g, '')}</p>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return <li key={i} className="text-xs text-zinc-300 list-disc ml-4 mb-1">{trimmed.substring(1).trim()}</li>;
      }
      if (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.')) {
        return <li key={i} className="text-xs text-zinc-300 list-decimal ml-4 mb-1">{trimmed.substring(2).trim()}</li>;
      }
      return <p key={i} className="text-xs text-zinc-400 mb-1 leading-relaxed">{trimmed}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="alerts-table-container">
      {/* Alerts List */}
      <div className={`${selectedAlert ? 'xl:col-span-7' : 'xl:col-span-12'} bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md flex flex-col justify-between`} id="alerts-master-card">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 mb-4">
            <div>
              <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">SecOps Threat Response Console</h4>
              <p className="text-xs text-zinc-400">Live security warnings requiring human validation and audit</p>
            </div>
            
            {/* Clear button */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-850">
                Found: {filteredAlerts.length} Alerts
              </span>
            </div>
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4" id="alerts-filter-row">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Search source IP, emails, endpoint triggers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Severity filter */}
            <select
              className="text-xs border border-zinc-800 rounded-lg px-2 py-2 bg-zinc-950 text-zinc-300 focus:outline-none"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="all">Severity: All</option>
              <option value="critical">Critical Only</option>
              <option value="high">High & Critical</option>
              <option value="medium">Medium & Up</option>
              <option value="low">Low & Up</option>
            </select>

            {/* Status filter */}
            <select
              className="text-xs border border-zinc-800 rounded-lg px-2 py-2 bg-zinc-950 text-zinc-300 focus:outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Status: All</option>
              <option value="open">Open Alerts</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-zinc-800 rounded-lg" id="alerts-table-scroll-view">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-800">
                  <th className="p-3">Incident</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Trigger Source</th>
                  <th className="p-3 text-center">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-xs">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 font-medium">
                      No active alerts matched current triage filters.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alt) => {
                    const isSelected = selectedAlert?.id === alt.id;
                    return (
                      <tr 
                        key={alt.id} 
                        id={alt.id}
                        className={`hover:bg-zinc-800/20 transition-colors cursor-pointer ${isSelected ? 'bg-zinc-800/40 border-l-2 border-emerald-500' : ''}`}
                        onClick={() => setSelectedAlert(alt)}
                      >
                        <td className="p-3">
                          <p className="font-bold text-zinc-200 max-w-[180px] truncate">{alt.title}</p>
                          <span className="text-[9px] text-zinc-500 font-mono block">
                            {new Date(alt.timestamp).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {getSeverityBadge(alt.severity)}
                        </td>
                        <td className="p-3">
                          <p className="font-mono text-zinc-300 font-semibold">{alt.event.source}</p>
                          <span className="text-[9px] text-zinc-500 block max-w-[150px] truncate">Target: {alt.event.destination}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-zinc-100 font-mono">
                          <span className={alt.riskScore >= 85 ? 'text-red-400' : alt.riskScore >= 65 ? 'text-orange-400' : 'text-zinc-300'}>
                            {alt.riskScore}%
                          </span>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(alt.status)}
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {alt.status === 'open' && (
                              <button
                                type="button"
                                title="Acknowledge Receipt"
                                onClick={() => onAcknowledge(alt.id)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700/60 transition-colors"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {alt.status !== 'resolved' && (
                              <button
                                type="button"
                                title="Resolve Threat"
                                onClick={() => onResolve(alt.id)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Inspect Details"
                              onClick={() => setSelectedAlert(alt)}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 mt-4 leading-normal">
          💡 Clicking an alert row launches the full technical audit screen and activates the Gemini cognitive analysis report tools on that specific incident.
        </p>
      </div>

      {/* Alert Investigation Side Panel */}
      {selectedAlert && (
        <div className="xl:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between" id="alert-detail-panel">
          <div>
            <div className="flex justify-between items-start pb-3 border-b border-zinc-800 mb-4">
              <div>
                <span className="text-[9px] bg-emerald-500 text-zinc-950 font-mono px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">Incident File</span>
                <h4 className="font-bold text-zinc-100 text-sm mt-1.5 max-w-[240px] truncate">{selectedAlert.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300 font-bold border border-zinc-750"
              >
                Close Audit
              </button>
            </div>

            {/* Technical Parameters Grid */}
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Telemetry Properties</p>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Incident Type</span>
                    <span className="font-bold text-zinc-200 uppercase">{selectedAlert.type}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Heuristic Threat Risk</span>
                    <span className="font-bold text-red-400">{selectedAlert.riskScore}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Origin Host/IP</span>
                    <span className="font-mono font-bold text-zinc-300">{selectedAlert.event.source}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wider">Timestamp</span>
                    <span className="font-bold text-zinc-300">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-300 leading-normal">
                  <span className="text-zinc-500 block text-[9px] uppercase mb-0.5 font-bold tracking-wider">Automated Firewall Logs</span>
                  "{selectedAlert.event.description}"
                </div>
              </div>

              {/* Technical Heuristics Dictionary Dump */}
              <div className="p-4 bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800 font-mono text-[10px] space-y-1.5 overflow-hidden">
                <span className="text-emerald-400 font-bold uppercase text-[9px] block tracking-wider">SYSTEM_ENVIRONMENT_DUMP:</span>
                {Object.entries(selectedAlert.event.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-zinc-800/40 pb-1">
                    <span className="text-zinc-500">{key}:</span>
                    <span className="text-zinc-200 font-bold max-w-[180px] truncate">{String(val)}</span>
                  </div>
                ))}
              </div>

              {/* Gemini Incident Analysis Card */}
              <div className="bg-zinc-900 text-zinc-100 rounded-lg border border-zinc-800 p-4 space-y-3 shadow-md" id="gemini-audit-investigation-card">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-200 tracking-wider">Gemini™ Incident Forensic Analyst</span>
                </div>

                {selectedAlert.aiAnalysis ? (
                  <div className="max-h-[220px] overflow-y-auto pr-1 bg-zinc-950 border border-zinc-800/60 p-3 rounded text-xs space-y-1">
                    {renderMarkdown(selectedAlert.aiAnalysis)}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-[10px] text-zinc-400 leading-normal px-2">
                      Request generative AI to construct an attack timeline reconstruction, perform root cause analysis, and compile incident containment advisories.
                    </p>
                    <button
                      type="button"
                      disabled={aiAnalyzingId === selectedAlert.id}
                      onClick={() => onAnalyze(selectedAlert.id)}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-lg transition-all"
                    >
                      {aiAnalyzingId === selectedAlert.id ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" /> Deep-Scanning...
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5" /> Ask AI to Investigate Threat
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 mt-4 flex justify-between text-[10px] text-zinc-500">
            <span>Alert ID: {selectedAlert.id}</span>
            <span>Platform Status: Evaluated</span>
          </div>
        </div>
      )}
    </div>
  );
}
