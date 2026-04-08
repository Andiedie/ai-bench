import { useState, useEffect, useMemo } from 'react'
import type { BenchmarkConfig, BenchmarkResult, OpenRouterModel } from './types/index'
import { useLocalStorage } from './hooks/useLocalStorage'
import { DEFAULT_CONFIG, CONFIG_STORAGE_KEY } from './config/defaults'
import { fetchModels, findModelPricing } from './services/openrouter'
import { runBenchmark } from './services/runner'
import { calculateSummary } from './services/stats'
import { Header } from './components/Header'
import { ConfigPanel } from './components/ConfigPanel'
import { ResultsTable } from './components/ResultsTable'

function App() {
  const [config, setConfig] = useLocalStorage<BenchmarkConfig>(CONFIG_STORAGE_KEY, DEFAULT_CONFIG)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch(() => setModelsError('Failed to load model list from OpenRouter'))
  }, [])

  async function handleRun() {
    setIsRunning(true)
    setResults([])
    const total = config.nonStreamIterations + config.streamIterations
    setProgress({ current: 0, total })

    const pricing = config.pricingModelId
      ? findModelPricing(models, config.pricingModelId)
      : findModelPricing(models, config.model)

    try {
      await runBenchmark(config, pricing, (result) => {
        setResults(prev => [...prev, result])
        setProgress(prev => ({ ...prev, current: prev.current + 1 }))
      })
    } catch {
    } finally {
      setIsRunning(false)
    }
  }

  const summaries = useMemo(() => {
    const modes: ('stream' | 'non-stream')[] = ['non-stream', 'stream']
    return modes
      .map(mode => calculateSummary(results, mode))
      .filter(s => s.successCount + s.errorCount > 0)
  }, [results])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {modelsError && (
          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-md text-sm">
            {modelsError}
          </div>
        )}
        <ConfigPanel
          config={config}
          onConfigChange={setConfig}
          models={models}
          isRunning={isRunning}
          progress={progress}
          onRun={handleRun}
        />
        <ResultsTable results={results} summaries={summaries} />
      </main>
    </div>
  )
}

export default App
