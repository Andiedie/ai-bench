import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { BenchmarkConfig, OpenRouterModel } from '../types/index';
import { PROMPT_PRESETS } from '../config/defaults';

interface ConfigPanelProps {
  config: BenchmarkConfig;
  onConfigChange: (config: BenchmarkConfig) => void;
  models: OpenRouterModel[];
  isRunning: boolean;
  progress: { current: number; total: number };
  onRun: () => void;
}

export function ConfigPanel({
  config,
  onConfigChange,
  models,
  isRunning,
  progress,
  onRun,
}: ConfigPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);
  const [pricingSearch, setPricingSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPricingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredModels = useMemo(() => {
    const query = pricingSearch.toLowerCase();
    if (!query) return models.slice(0, 20);
    return models
      .filter(
        (m) =>
          m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [pricingSearch, models]);

  const selectedPricingModel = useMemo(() => {
    if (!config.pricingModelId) return null;
    return models.find((m) => m.id === config.pricingModelId) ?? null;
  }, [config.pricingModelId, models]);

  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setNumberDrafts((prev) => ({ ...prev, [name]: value }));
      if (value === '') return;
      const num = parseInt(value, 10);
      if (isNaN(num)) return;
      onConfigChange({ ...config, [name]: num });
      return;
    }

    onConfigChange({ ...config, [name]: value });
  };

  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const raw = numberDrafts[name] ?? String((config as unknown as Record<string, unknown>)[name]);
    const num = parseInt(raw, 10);
    const limits: Record<string, [number, number]> = {
      nonStreamIterations: [0, 100],
      streamIterations: [0, 100],
      concurrency: [1, 50],
    };
    const [min, max] = limits[name] ?? [0, Infinity];
    const clamped = isNaN(num) ? min : Math.max(min, Math.min(max, num));
    onConfigChange({ ...config, [name]: clamped });
    setNumberDrafts((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const getNumberValue = (name: string): string => {
    if (name in numberDrafts) return numberDrafts[name];
    return String((config as unknown as Record<string, unknown>)[name]);
  };

  const handlePricingSelect = (modelId: string) => {
    onConfigChange({
      ...config,
      pricingModelId: modelId,
    });
    setPricingSearch('');
    setIsPricingDropdownOpen(false);
  };

  const handleClearPricing = () => {
    onConfigChange({
      ...config,
      pricingModelId: '',
    });
  };

  const isRunDisabled = isRunning || config.apiKey.trim() === '';

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="baseUrl">
            Base URL
          </label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="text"
            value={config.baseUrl}
            onChange={handleChange}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="apiKey">
            API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              name="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full pr-16"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="model">
            Model
          </label>
          <input
            id="model"
            name="model"
            type="text"
            value={config.model}
            onChange={handleChange}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <label className="block text-gray-300 text-sm font-medium mb-1">
            Pricing Model
          </label>
          {selectedPricingModel ? (
            <div className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-gray-100 text-sm truncate">{selectedPricingModel.name}</div>
                <div className="text-xs text-gray-400 truncate">{selectedPricingModel.id}</div>
              </div>
              <button
                type="button"
                onClick={handleClearPricing}
                className="text-gray-400 hover:text-gray-200 ml-2 shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={pricingSearch}
              onChange={(e) => {
                setPricingSearch(e.target.value);
                setIsPricingDropdownOpen(true);
              }}
              onFocus={() => setIsPricingDropdownOpen(true)}
              placeholder="Search OpenRouter models for pricing..."
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              autoComplete="off"
            />
          )}
          {isPricingDropdownOpen && !selectedPricingModel && filteredModels.length > 0 && (
            <div className="absolute z-10 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto w-full mt-1">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handlePricingSelect(m.id)}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="text-gray-100 text-sm">{m.name}</div>
                  <div className="text-xs text-gray-400">{m.id}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {selectedPricingModel
              ? (() => {
                  const p = selectedPricingModel.pricing;
                  const fmt = (v: number | null) => v === null ? '—' : `$${(v * 1e6).toFixed(2)}`;
                  return `In: ${fmt(p.prompt)}/MTok · Out: ${fmt(p.completion)}/MTok · Cache Read: ${fmt(p.inputCacheRead)}/MTok · Cache Write: ${fmt(p.inputCacheWrite)}/MTok`;
                })()
              : 'Select a model to calculate cost. Leave empty to auto-match by model name.'}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-gray-300 text-sm font-medium" htmlFor="prompt">
              Prompt
            </label>
            <select
              value={PROMPT_PRESETS.findIndex((p) => p.prompt === config.prompt) === -1 ? '' : String(PROMPT_PRESETS.findIndex((p) => p.prompt === config.prompt))}
              onChange={(e) => {
                if (e.target.value === '') return;
                const preset = PROMPT_PRESETS[Number(e.target.value)];
                onConfigChange({ ...config, prompt: preset.prompt });
              }}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="" disabled>
                Presets...
              </option>
              <optgroup label="Output Token Presets">
                {PROMPT_PRESETS.filter((p) => p.group === 'output').map((p) => {
                  const idx = PROMPT_PRESETS.indexOf(p);
                  return (
                    <option key={idx} value={String(idx)}>
                      {p.label}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="Input Token Presets">
                {PROMPT_PRESETS.filter((p) => p.group === 'input').map((p) => {
                  const idx = PROMPT_PRESETS.indexOf(p);
                  return (
                    <option key={idx} value={String(idx)}>
                      {p.label}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
          <textarea
            id="prompt"
            name="prompt"
            rows={4}
            value={config.prompt}
            onChange={handleChange}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="nonStreamIterations">
              Non-Stream
            </label>
            <input
              id="nonStreamIterations"
              name="nonStreamIterations"
              type="number"
              min={0}
              max={100}
              value={getNumberValue('nonStreamIterations')}
              onChange={handleChange}
              onBlur={handleNumberBlur}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="streamIterations">
              Stream
            </label>
            <input
              id="streamIterations"
              name="streamIterations"
              type="number"
              min={0}
              max={100}
              value={getNumberValue('streamIterations')}
              onChange={handleChange}
              onBlur={handleNumberBlur}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="concurrency">
              Concurrency
              <span className="relative inline-block ml-1 group">
                <span className="text-gray-500 cursor-help">ⓘ</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-gray-200 bg-gray-700 rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                  Max parallel requests. Higher = faster but may hit rate limits.
                </span>
              </span>
            </label>
            <input
              id="concurrency"
              name="concurrency"
              type="number"
              min={1}
              max={50}
              value={getNumberValue('concurrency')}
              onChange={handleChange}
              onBlur={handleNumberBlur}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="block text-gray-300 text-sm font-medium" htmlFor="cacheTtl">
            Prompt Caching
          </label>
          <select
            id="cacheTtl"
            value={config.cacheTtl}
            onChange={(e) => onConfigChange({ ...config, cacheTtl: e.target.value as '' | '5m' | '1h' })}
            className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Off</option>
            <option value="5m">5 min</option>
            <option value="1h">1 hour (2x cost)</option>
          </select>
          {config.cacheTtl && (
            <select
              value={config.cachePlacement}
              onChange={(e) => onConfigChange({ ...config, cachePlacement: e.target.value as 'top' | 'block' })}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="top">Top-level</option>
              <option value="block">Content block</option>
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={isRunDisabled}
          className={`py-3 rounded-md w-full mt-4 transition-colors font-semibold ${
            isRunDisabled
              ? 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? `Running... (${progress.current}/${progress.total})` : 'Run Benchmark'}
        </button>
      </div>
    </div>
  );
}
