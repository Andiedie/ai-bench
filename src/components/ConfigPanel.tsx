import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { BenchmarkConfig, OpenRouterModel } from '../types/index';

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
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredModels = useMemo(() => {
    const query = config.model.toLowerCase();
    return models
      .filter(
        (m) =>
          m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [config.model, models]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number = value;

    if (type === 'number') {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        return;
      }
      parsedValue = num;
      
      if (name === 'maxTokens') {
        parsedValue = Math.max(1, parsedValue);
      } else if (name === 'iterations') {
        parsedValue = Math.max(1, Math.min(100, parsedValue));
      } else if (name === 'concurrency') {
        parsedValue = Math.max(1, Math.min(20, parsedValue));
      }
    }

    onConfigChange({
      ...config,
      [name]: parsedValue,
    });
  };

  const handleModelSelect = (modelId: string) => {
    onConfigChange({
      ...config,
      model: modelId,
    });
    setIsModelDropdownOpen(false);
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

        <div className="relative" ref={dropdownRef}>
          <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="model">
            Model
          </label>
          <input
            id="model"
            name="model"
            type="text"
            value={config.model}
            onChange={handleChange}
            onFocus={() => setIsModelDropdownOpen(true)}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            autoComplete="off"
          />
          {isModelDropdownOpen && filteredModels.length > 0 && (
            <div className="absolute z-10 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto w-full mt-1">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleModelSelect(m.id)}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="text-gray-100">{m.name}</div>
                  <div className="text-xs text-gray-400">{m.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="prompt">
            Prompt
          </label>
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
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="maxTokens">
              Max Tokens
            </label>
            <input
              id="maxTokens"
              name="maxTokens"
              type="number"
              min={1}
              value={config.maxTokens}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="iterations">
              Iterations
            </label>
            <input
              id="iterations"
              name="iterations"
              type="number"
              min={1}
              max={100}
              value={config.iterations}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1" htmlFor="concurrency">
              Concurrency
            </label>
            <input
              id="concurrency"
              name="concurrency"
              type="number"
              min={1}
              max={20}
              value={config.concurrency}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
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
