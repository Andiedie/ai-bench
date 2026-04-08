import React from 'react'
import type { BenchmarkResult, BenchmarkSummary } from '../types/index'
import { formatCost } from '../services/cost'

interface ResultsTableProps {
  results: BenchmarkResult[]
  summaries: BenchmarkSummary[]
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results, summaries }) => {
  if (results.length === 0) {
    return (
      <div className="text-gray-500 text-center py-12">
        No results yet. Configure and run a benchmark.
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Mode</th>
              <th className="px-4 py-3 text-left">Iter</th>
              <th className="px-4 py-3 text-left">Response (ms)</th>
              <th className="px-4 py-3 text-left">TTFT (ms)</th>
              <th className="px-4 py-3 text-left">Input</th>
              <th className="px-4 py-3 text-left">Output</th>
              <th className="px-4 py-3 text-left">Cache Read</th>
              <th className="px-4 py-3 text-left">Cache Write</th>
              <th className="px-4 py-3 text-left">Cost</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => {
              const isStream = result.mode === 'stream'
              const modeBadge = isStream ? (
                <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded">
                  Stream
                </span>
              ) : (
                <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded">
                  Non-Stream
                </span>
              )

              if (result.error !== null) {
                return (
                  <tr key={result.id} className="border-t border-gray-800 hover:bg-gray-800/50 bg-red-900/30 text-red-400">
                    <td className="px-4 py-2 font-mono text-right tabular-nums">{index + 1}</td>
                    <td className="px-4 py-2">{modeBadge}</td>
                    <td className="px-4 py-2 font-mono text-right tabular-nums">{result.iteration}</td>
                    <td colSpan={7} className="px-4 py-2">
                      {result.error}
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={result.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{index + 1}</td>
                  <td className="px-4 py-2 text-gray-300">{modeBadge}</td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{result.iteration}</td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{Math.round(result.responseTimeMs)}</td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                    {isStream && result.ttftMs !== null ? Math.round(result.ttftMs) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{result.tokens.inputTokens}</td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{result.tokens.outputTokens}</td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                    {result.tokens.cacheReadTokens > 0 ? result.tokens.cacheReadTokens : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                    {result.tokens.cacheWriteTokens > 0 ? result.tokens.cacheWriteTokens : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{formatCost(result.costUsd)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {summaries.length > 0 && (
        <div className="mt-6">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Avg (ms)</th>
                  <th className="px-4 py-3 text-left">Min (ms)</th>
                  <th className="px-4 py-3 text-left">Max (ms)</th>
                  <th className="px-4 py-3 text-left">Median (ms)</th>
                  <th className="px-4 py-3 text-left">Avg TTFT</th>
                   <th className="px-4 py-3 text-left">Total In</th>
                   <th className="px-4 py-3 text-left">Total Out</th>
                   <th className="px-4 py-3 text-left">Cache Read</th>
                   <th className="px-4 py-3 text-left">Cache Write</th>
                   <th className="px-4 py-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => {
                  const isStream = summary.mode === 'stream'
                  const modeBadge = isStream ? (
                    <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded">
                      Stream
                    </span>
                  ) : (
                    <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded">
                      Non-Stream
                    </span>
                  )

                  return (
                    <tr key={summary.mode} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-gray-300">{modeBadge}</td>
                      <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{Math.round(summary.avgResponseMs)}</td>
                      <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{Math.round(summary.minResponseMs)}</td>
                      <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{Math.round(summary.maxResponseMs)}</td>
                      <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{Math.round(summary.medianResponseMs)}</td>
                      <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                        {summary.avgTtftMs !== null ? Math.round(summary.avgTtftMs) : '—'}
                      </td>
                       <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{summary.totalTokens.inputTokens}</td>
                       <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{summary.totalTokens.outputTokens}</td>
                       <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                         {summary.totalTokens.cacheReadTokens > 0 ? summary.totalTokens.cacheReadTokens : '—'}
                       </td>
                       <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">
                         {summary.totalTokens.cacheWriteTokens > 0 ? summary.totalTokens.cacheWriteTokens : '—'}
                       </td>
                       <td className="px-4 py-2 text-gray-300 font-mono text-right tabular-nums">{formatCost(summary.totalCostUsd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
