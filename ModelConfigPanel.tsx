import React, { useState } from 'react';
import { Sliders, Sparkles, Brain, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { ModelConfig } from '../types';

interface ModelConfigPanelProps {
  config: ModelConfig;
  onUpdate: (newConfig: ModelConfig) => Promise<void>;
}

export default function ModelConfigPanel({ config, onUpdate }: ModelConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<ModelConfig>({ ...config });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiTuning, setIsAiTuning] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    algorithm: ModelConfig["algorithm"];
    sensitivityThreshold: number;
    autoBlockThreshold: number;
    learningRate: number;
    featureWeights: ModelConfig["featureWeights"];
    advice: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleWeightChange = (key: keyof ModelConfig["featureWeights"], val: number) => {
    setLocalConfig(prev => ({
      ...prev,
      featureWeights: {
        ...prev.featureWeights,
        [key]: val
      }
    }));
  };

  const weightsSum = 
    localConfig.featureWeights.transactionAmount + 
    localConfig.featureWeights.ipDistance + 
    localConfig.featureWeights.requestVelocity + 
    localConfig.featureWeights.payloadEntropy + 
    localConfig.featureWeights.behavioralAnomaly;

  // Normalize weights automatically so they sum to exactly 100%
  const handleNormalizeWeights = () => {
    const total = weightsSum || 1;
    setLocalConfig(prev => ({
      ...prev,
      featureWeights: {
        transactionAmount: Math.round((prev.featureWeights.transactionAmount / total) * 100),
        ipDistance: Math.round((prev.featureWeights.ipDistance / total) * 100),
        requestVelocity: Math.round((prev.featureWeights.requestVelocity / total) * 100),
        payloadEntropy: Math.round((prev.featureWeights.payloadEntropy / total) * 100),
        behavioralAnomaly: Math.round((prev.featureWeights.behavioralAnomaly / total) * 100)
      }
    }));
  };

  const handleSave = async (cfgToSave = localConfig) => {
    // Basic verification: ensure weights sum close to 100
    const sum = 
      cfgToSave.featureWeights.transactionAmount + 
      cfgToSave.featureWeights.ipDistance + 
      cfgToSave.featureWeights.requestVelocity + 
      cfgToSave.featureWeights.payloadEntropy + 
      cfgToSave.featureWeights.behavioralAnomaly;

    if (sum !== 100) {
      // Auto normalize silently to ensure integrity
      const total = sum || 1;
      const normalized = {
        ...cfgToSave,
        featureWeights: {
          transactionAmount: Math.round((cfgToSave.featureWeights.transactionAmount / total) * 100),
          ipDistance: Math.round((cfgToSave.featureWeights.ipDistance / total) * 100),
          requestVelocity: Math.round((cfgToSave.featureWeights.requestVelocity / total) * 100),
          payloadEntropy: Math.round((cfgToSave.featureWeights.payloadEntropy / total) * 100),
          behavioralAnomaly: Math.round((cfgToSave.featureWeights.behavioralAnomaly / total) * 100)
        }
      };
      
      // Fine-adjust for rounding errors to guarantee exactly 100
      const newSum = normalized.featureWeights.transactionAmount + normalized.featureWeights.ipDistance + normalized.featureWeights.requestVelocity + normalized.featureWeights.payloadEntropy + normalized.featureWeights.behavioralAnomaly;
      if (newSum !== 100) {
        normalized.featureWeights.behavioralAnomaly += (100 - newSum);
      }

      await onUpdate(normalized);
      setLocalConfig(normalized);
    } else {
      await onUpdate(cfgToSave);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTuneModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiTuning(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const response = await fetch('/api/ai/tune-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await response.json();
      if (response.ok) {
        setAiSuggestion(data);
      } else {
        setAiError(data.error || "Failed to trigger AI tuner.");
      }
    } catch (err: any) {
      setAiError(err.message || "Network Error contacting Gemini engine.");
    } finally {
      setIsAiTuning(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    const appliedConfig: ModelConfig = {
      algorithm: aiSuggestion.algorithm,
      sensitivityThreshold: aiSuggestion.sensitivityThreshold,
      autoBlockThreshold: aiSuggestion.autoBlockThreshold,
      learningRate: aiSuggestion.learningRate,
      featureWeights: aiSuggestion.featureWeights
    };
    setLocalConfig(appliedConfig);
    handleSave(appliedConfig);
    setAiSuggestion(null);
    setAiPrompt('');
  };

  return (
    <div className="space-y-6" id="model-config-panel-root">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders and algorithm panel */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md" id="manual-tuning-card">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Mathematical Detection Models</h4>
            </div>
            <span className="text-xs text-zinc-500 font-medium">Core Hyperparameters</span>
          </div>

          <div className="space-y-5">
            {/* Algorithm Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Detection Algorithm</label>
                <select
                  id="config-algorithm-select"
                  className="w-full text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-950 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={localConfig.algorithm}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, algorithm: e.target.value as ModelConfig["algorithm"] }))}
                >
                  <option value="random_forest">Random Forest Classifier (Ensemble decision trees)</option>
                  <option value="isolation_forest">Isolation Forest (Unsupervised path distance)</option>
                  <option value="gradient_boosting">Gradient Boosting Machine (GBM decision boundaries)</option>
                  <option value="autoencoder">Deep Autoencoder (Reconstruction error threshold)</option>
                  <option value="neural_network">Multilayer Perceptron (Complex non-linear scoring)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 font-sans">Optimizing Learning Rate</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    value={localConfig.learningRate}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                  />
                  <span className="text-xs font-mono font-bold text-zinc-300 min-w-10 text-right">{localConfig.learningRate}</span>
                </div>
              </div>
            </div>

            {/* Threshold sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-850">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Sensitivity Threshold</label>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{localConfig.sensitivityThreshold}%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mb-3 font-medium">Scores above this generate alert notifications</p>
                <input
                  type="range"
                  min="30"
                  max="90"
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  value={localConfig.sensitivityThreshold}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, sensitivityThreshold: parseInt(e.target.value) }))}
                />
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-850">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Auto-Block Threshold</label>
                  <span className="text-xs font-bold text-red-400 font-mono">{localConfig.autoBlockThreshold}%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mb-3 font-medium">Scores above this instantly reject/terminate connections</p>
                <input
                  type="range"
                  min="50"
                  max="95"
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  value={localConfig.autoBlockThreshold}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, autoBlockThreshold: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            {/* Feature Weights Section */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Anomalous Feature Scoring Weights</h5>
                  <p className="text-[10px] text-zinc-500">Distribute scoring impact (must sum to exactly 100%)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${weightsSum === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'}`}>
                    Sum: {weightsSum}%
                  </span>
                  {weightsSum !== 100 && (
                    <button
                      type="button"
                      onClick={handleNormalizeWeights}
                      className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-800 font-bold transition-colors"
                    >
                      Auto-Balance
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Weights Sliders */}
                {[
                  { key: 'transactionAmount', label: 'Financial Transaction Amount', desc: 'Prioritizes high money values in fraudulent checks' },
                  { key: 'ipDistance', label: 'IP Geodistribution Distance', desc: 'Prioritizes distance from primary home registry IP' },
                  { key: 'requestVelocity', label: 'Velocity Rate/Scans', desc: 'Prioritizes multi-hit brute forcing and port scanner speed' },
                  { key: 'payloadEntropy', label: 'Payload Randomness & Command Entropy', desc: 'Prioritizes SQL / Shell script injection characters' },
                  { key: 'behavioralAnomaly', label: 'User Behavioral Deviation', desc: 'Prioritizes deviation from typical user timezone and device parameters' }
                ].map((item) => (
                  <div key={item.key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <div>
                      <span className="text-xs font-semibold text-zinc-300 block">{item.label}</span>
                      <span className="text-[9px] text-zinc-500 block font-medium">{item.desc}</span>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-300"
                        value={localConfig.featureWeights[item.key as keyof ModelConfig["featureWeights"]]}
                        onChange={(e) => handleWeightChange(item.key as keyof ModelConfig["featureWeights"], parseInt(e.target.value))}
                      />
                      <span className="text-xs font-bold text-zinc-200 min-w-8 text-right font-mono">
                        {localConfig.featureWeights[item.key as keyof ModelConfig["featureWeights"]]}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setLocalConfig({ ...config })}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded-lg border border-zinc-700/60 transition-colors"
              >
                Reset Changes
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Config Applied
                  </>
                ) : (
                  "Apply Model Weights"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Gemini AI Tuner */}
        <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col justify-between" id="ai-model-tuner-card">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-850 mb-5">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-200 text-xs uppercase tracking-wider">Gemini™ Cognitive Tuner</h4>
                <p className="text-[10px] text-zinc-500 font-medium">AI-driven weights generation</p>
              </div>
            </div>

            <form onSubmit={handleTuneModel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Defense Objectives & Threat Scenarios</label>
                <textarea
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  rows={4}
                  placeholder="e.g. 'Optimize for stealthy API port scans and web injections, and make the firewall auto-block highly aggressive.' or 'Reduce false alarms on user credit card swipes during holiday shopping sprees.'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isAiTuning || !aiPrompt.trim()}
                className="w-full text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-zinc-950 font-extrabold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {isAiTuning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Distilling Weights...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Ask Gemini to Tune Engine
                  </>
                )}
              </button>
            </form>

            {/* Error messaging */}
            {aiError && (
              <div className="mt-4 p-3 bg-red-950/45 border border-red-900/50 rounded-lg flex gap-2 items-start text-xs text-red-200 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse" />
                <p>{aiError}</p>
              </div>
            )}

            {/* Tuner Suggestion results card */}
            {aiSuggestion && (
              <div className="mt-5 p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Gemini Proposal</span>
                  <span className="text-[9px] bg-zinc-950 border border-zinc-800/60 px-2 py-0.5 rounded text-zinc-400 font-mono">{aiSuggestion.algorithm.toUpperCase()}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-300 italic">"{aiSuggestion.advice}"</p>
                  
                  {/* Visual mini weight diff bars */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>Transaction Amt</span>
                      <span>{aiSuggestion.featureWeights.transactionAmount}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${aiSuggestion.featureWeights.transactionAmount}%` }}></div>
                    </div>

                    <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>IP Distance</span>
                      <span>{aiSuggestion.featureWeights.ipDistance}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${aiSuggestion.featureWeights.ipDistance}%` }}></div>
                    </div>

                    <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>Request Velocity</span>
                      <span>{aiSuggestion.featureWeights.requestVelocity}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="bg-purple-400 h-full" style={{ width: `${aiSuggestion.featureWeights.requestVelocity}%` }}></div>
                    </div>

                    <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>Command Entropy</span>
                      <span>{aiSuggestion.featureWeights.payloadEntropy}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${aiSuggestion.featureWeights.payloadEntropy}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-[10px]">
                    <div>
                      <p className="text-zinc-500 font-medium">Sensitivity Limit</p>
                      <p className="font-bold text-zinc-200 font-mono">{aiSuggestion.sensitivityThreshold}%</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium">Firewall Autoblock</p>
                      <p className="font-bold text-red-400 font-mono">{aiSuggestion.autoBlockThreshold}%</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyAiSuggestion}
                  className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Apply Proposal
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-500 text-center pt-4 border-t border-zinc-900 mt-4 font-medium">
            Custom tuning dynamically recomputes active risk factors on incoming telemetry models immediately.
          </div>
        </div>
      </div>
    </div>
  );
}
