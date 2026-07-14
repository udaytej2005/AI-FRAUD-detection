import React, { useState } from 'react';
import { Send, Bell, Settings, Terminal, CheckCircle, HelpCircle, Eye } from 'lucide-react';
import { SlackConfig, SlackLog } from '../types';

interface SlackWebhookPanelProps {
  config: SlackConfig;
  logs: SlackLog[];
  onUpdate: (newConfig: SlackConfig) => Promise<void>;
  onTriggerTest: () => Promise<void>;
}

export default function SlackWebhookPanel({ config, logs, onUpdate, onTriggerTest }: SlackWebhookPanelProps) {
  const [localConfig, setLocalConfig] = useState<SlackConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testLog, setTestLog] = useState<SlackLog | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(localConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSendTest = async () => {
    setTestSending(true);
    setTestLog(null);
    try {
      await onTriggerTest();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="slack-panel-root">
      {/* Slack Config Cards */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800 mb-5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Slack Alerts Integration</h4>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-850 rounded-lg">
              <div>
                <span className="text-xs font-bold text-zinc-200 block">Enable Automated Alerts</span>
                <span className="text-[10px] text-zinc-500 block">Deliver high risk anomalies to Slack</span>
              </div>
              <input
                type="checkbox"
                id="slack-enabled-checkbox"
                className="w-4 h-4 text-emerald-500 border-zinc-700 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                checked={localConfig.isEnabled}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Slack Webhook URL</label>
              <input
                type="url"
                id="slack-webhook-input"
                className="w-full text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-950 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                value={localConfig.webhookUrl}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
              />
              <p className="text-[9px] text-zinc-500 mt-1 font-medium">If blank, alerts will be simulated in the workspace viewer on the right.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Slack Channel</label>
                <input
                  type="text"
                  className="w-full text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-950 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={localConfig.channel}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, channel: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Min Alert Severity</label>
                <select
                  className="w-full text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-300"
                  value={localConfig.minSeverity}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, minSeverity: e.target.value as any }))}
                >
                  <option value="low">Low Severity & Up</option>
                  <option value="medium">Medium Severity & Up</option>
                  <option value="high">High Severity & Up</option>
                  <option value="critical">Critical Severity Only</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                disabled={testSending}
                onClick={handleSendTest}
                className="text-xs bg-zinc-850 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 font-bold px-4 py-2 rounded-lg border border-zinc-800 flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> {testSending ? "Dispatching..." : "Send Test Trigger"}
              </button>
              <button
                type="submit"
                className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-650 text-zinc-950 font-extrabold py-2 rounded-lg text-center transition-colors shadow-sm"
              >
                {saveSuccess ? "Configuration Saved" : "Save Integrations"}
              </button>
            </div>
          </form>
        </div>

        {/* Integration Instructions Card */}
        <div className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-5 text-xs text-zinc-400 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-zinc-200">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>How to configure a physical Slack channel?</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-zinc-500 font-medium">
            <li>Visit the <a href="https://api.slack.com/apps" target="_blank" rel="referrer" className="text-emerald-400 hover:underline font-bold">Slack API App Console</a> and create a test application.</li>
            <li>Enable <strong>Incoming Webhooks</strong> in your Slack app feature panel.</li>
            <li>Click <strong>Add New Webhook to Workspace</strong>, pick your target channel, and copy the Webhook URL.</li>
            <li>Paste the copied URL above, make sure "Enable Automated Alerts" is active, and click Save. Real-time alerts will immediately push to your real team workspace!</li>
          </ol>
        </div>
      </div>

      {/* Simulated Slack Channel Feed */}
      <div className="lg:col-span-7 flex flex-col bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden min-h-[450px]" id="slack-workspace-simulator">
        {/* Mock Slack Header */}
        <div className="px-5 py-3 border-b border-zinc-850 flex justify-between items-center bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-xs uppercase tracking-wider text-zinc-100">Slack Sandbox Viewer</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono font-semibold">{localConfig.channel}</span>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px]" id="slack-sandbox-messages">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-12">
              <Eye className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="font-semibold text-xs text-zinc-400">Sandbox Empty</p>
              <p className="text-[10px] text-zinc-500 max-w-[280px]">No alerts have been posted to Slack yet. Click "Send Test Trigger" on the left to fire a demo alert payload.</p>
            </div>
          ) : (
            logs.map((log) => {
              const attachment = log.payload.attachments?.[0];
              const isCritical = attachment?.color === '#ef4444';
              const isHigh = attachment?.color === '#f97316';
              const colorLeft = isCritical ? 'border-l-4 border-red-500' : isHigh ? 'border-l-4 border-orange-500' : 'border-l-4 border-yellow-500';

              return (
                <div key={log.id} className="text-xs group leading-relaxed" id={log.id}>
                  {/* Avatar row */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center justify-center font-bold font-mono">
                      IS
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-zinc-200">{log.payload.username || "AI Intrusion Shield"}</span>
                        <span className="bg-zinc-850 px-1.5 py-0.5 rounded text-[8px] text-emerald-400 font-bold uppercase font-mono border border-zinc-800">APP</span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Attachment representation */}
                      {attachment && (
                        <div className={`mt-2 bg-zinc-900 rounded-r p-3.5 ${colorLeft} max-w-lg space-y-2 border border-zinc-850 border-l-0`}>
                          <h5 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">{attachment.title}</h5>
                          <p className="text-zinc-300 leading-normal">{attachment.text}</p>
                          
                          {/* Attachments grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-zinc-850 text-[11px]">
                            {attachment.fields?.map((f: any, idx: number) => (
                              <div key={idx}>
                                <p className="text-zinc-500 font-bold">{f.title}</p>
                                <p className="text-zinc-200">{f.value}</p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono pt-1">
                            <span>{attachment.footer}</span>
                            <span className="bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded font-semibold text-zinc-400">
                              {log.status === 'sent' ? "REAL WEBHOOK ACTIVE" : "SIMULATED VIEW"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
