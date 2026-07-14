import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, ShieldAlert, Wifi, Terminal, Database, Server, RefreshCw } from 'lucide-react';
import { SecurityEvent } from '../types';

interface EventsTableProps {
  events: SecurityEvent[];
  onClear: () => Promise<void>;
}

export default function EventsTable({ events, onClear }: EventsTableProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'transaction' | 'login' | 'api' | 'network'>('all');

  const filtered = events.filter((evt) => {
    if (activeTab === 'all') return true;
    return evt.type === activeTab;
  });

  const getStatusBadge = (status: SecurityEvent["status"]) => {
    switch (status) {
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
            <ShieldAlert className="w-3 h-3 text-red-400" /> Blocked
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
            <ShieldAlert className="w-3 h-3 text-amber-400" /> Flagged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Cleared
          </span>
        );
    }
  };

  const getEventSnippet = (evt: SecurityEvent) => {
    if (evt.type === 'transaction') {
      return `Amt: $${evt.amount} | Merch: ${evt.details.merchant || 'Generic Store'}`;
    } else if (evt.type === 'login') {
      return `Device: ${evt.details.device || 'Unrecognized'}`;
    } else if (evt.type === 'api') {
      return `Payload: ${evt.details.payload_snippet || 'Safe'}`;
    } else {
      return `Ports: ${evt.details.ports_scanned || 'Standard'}`;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md" id="telemetry-log-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Continuous Telemetry Log</h4>
          </div>
          <p className="text-xs text-zinc-400">Live operational logs of system connections, transactions, and session challenges</p>
        </div>

        {/* Clear telemetry */}
        <button
          type="button"
          onClick={onClear}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2 border border-zinc-700 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Logs & System
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-zinc-800 pb-3" id="telemetry-tabs">
        {[
          { key: 'all', label: 'All Telemetry' },
          { key: 'transaction', label: 'Transactions' },
          { key: 'login', label: 'Logins/Devices' },
          { key: 'api', label: 'API Endpoints' },
          { key: 'network', label: 'Network/DMZ' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all border ${
              activeTab === tab.key 
                ? 'bg-zinc-100 text-zinc-950 border-white shadow-sm' 
                : 'text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* High Density Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-[420px] overflow-y-auto" id="telemetry-log-table-wrapper">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-800 sticky top-0 z-10">
              <th className="p-3">Time</th>
              <th className="p-3">Type</th>
              <th className="p-3">Inbound Origin</th>
              <th className="p-3">Impact Destination</th>
              <th className="p-3">Details snippet</th>
              <th className="p-3 text-center">Risk Score</th>
              <th className="p-3">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500 font-medium font-sans">
                  Listening for incoming connection packets...
                </td>
              </tr>
            ) : (
              filtered.map((evt) => {
                const isAnomaly = evt.status === 'blocked' || evt.status === 'flagged';
                return (
                  <tr 
                    key={evt.id} 
                    id={evt.id}
                    className={`hover:bg-zinc-800/20 transition-colors ${isAnomaly ? 'bg-red-950/10' : ''}`}
                  >
                    <td className="p-3 text-zinc-500 whitespace-nowrap text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="bg-zinc-850 text-zinc-300 border border-zinc-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                        {evt.type}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-zinc-200 truncate max-w-[150px]">
                      {evt.source}
                    </td>
                    <td className="p-3 text-zinc-400 truncate max-w-[150px]">
                      {evt.destination}
                    </td>
                    <td className="p-3 text-zinc-300 font-sans text-[11px] truncate max-w-[220px]">
                      {getEventSnippet(evt)}
                    </td>
                    <td className="p-3 text-center font-bold text-zinc-100">
                      {evt.riskScore}%
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getStatusBadge(evt.status)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center px-1 mt-3 text-[10px] text-zinc-500 font-mono">
        <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Receiver Port: 3000 Inbound</span>
        <span>Displaying {filtered.length} of last 50 telemetry records</span>
      </div>
    </div>
  );
}
