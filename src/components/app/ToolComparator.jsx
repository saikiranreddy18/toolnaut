import { useState } from 'react'
import { toolComparison } from '../../services/toolComparison'

export default function ToolComparator({ tools = [] }) {
  const [selectedTools, setSelectedTools] = useState([])
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState(null)
  const [filterBudget, setFilterBudget] = useState(10000)
  const [filterEase, setFilterEase] = useState(1)

  const handleSelectTool = (toolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter(t => t !== toolId))
    } else {
      setSelectedTools([...selectedTools, toolId])
    }
  }

  const handleRunComparison = () => {
    if (selectedTools.length < 2) {
      alert('Select at least 2 tools to compare')
      return
    }
    const data = toolComparison.compareTools(selectedTools)
    setComparisonData(data)
    setShowComparison(true)
  }

  const getIntegrationColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (showComparison && comparisonData) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <button
          onClick={() => setShowComparison(false)}
          className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
        >
          ← Back to Selection
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Tool Comparison Matrix</h3>

        {/* Integration Scores */}
        <div className="mb-8">
          <h4 className="text-lg font-bold text-white mb-4">Integration Compatibility</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 pb-2">Tool 1</th>
                  <th className="text-left text-gray-400 pb-2">Tool 2</th>
                  <th className="text-right text-gray-400 pb-2">Score</th>
                  <th className="text-left text-gray-400 pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                {selectedTools.map((tool1, i) =>
                  selectedTools.slice(i + 1).map(tool2 => {
                    const score = toolComparison.getIntegrationScore(tool1, tool2)
                    return (
                      <tr key={`${tool1}-${tool2}`} className="border-t border-slate-700">
                        <td className="text-gray-300 py-2">{tool1}</td>
                        <td className="text-gray-300 py-2">{tool2}</td>
                        <td className={`text-right py-2 font-bold ${getIntegrationColor(score)}`}>
                          {score}%
                        </td>
                        <td className="text-gray-400 py-2 text-xs">
                          {score >= 80 ? '✅ Great' : score >= 60 ? '⚠️ Fair' : '❌ Difficult'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Stack Integration Score</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-green-500"
                  style={{ width: `${comparisonData.overallScore}%` }}
                />
              </div>
              <span className="text-white font-bold text-lg">{comparisonData.overallScore}%</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
          <h4 className="text-sm font-bold text-blue-300 mb-2">💡 Integration Tips</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            {comparisonData.overallScore >= 80 && (
              <li>✅ This stack integrates well. Go ahead with confidence!</li>
            )}
            {comparisonData.overallScore >= 60 && comparisonData.overallScore < 80 && (
              <li>⚠️ Some tools need workarounds. Consider using Zapier/Make.com for gaps.</li>
            )}
            {comparisonData.overallScore < 60 && (
              <>
                <li>❌ Integration challenges detected. You may need:</li>
                <li>• Custom API integrations</li>
                <li>• Third-party automation tools (Zapier, Make)</li>
                <li>• Additional engineering resources</li>
              </>
            )}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Filter Tools (Reduce Choices)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Budget</label>
            <input
              type="range"
              min="100"
              max="50000"
              step="100"
              value={filterBudget}
              onChange={(e) => setFilterBudget(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-300 mt-1">${filterBudget}/month</div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Minimum Ease (1-5)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={filterEase}
              onChange={(e) => setFilterEase(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-300 mt-1">Level {filterEase}</div>
          </div>
        </div>
      </div>

      {/* Tool Selection */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">
          Select Tools to Compare ({selectedTools.length} selected)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {['ChatGPT', 'Claude', 'Notion', 'Slack', 'Zapier', 'Make', 'Airtable', 'Monday'].map(
            tool => (
              <button
                key={tool}
                onClick={() => handleSelectTool(tool)}
                className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                  selectedTools.includes(tool)
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-700 border-slate-600 text-gray-300 hover:border-slate-500'
                }`}
              >
                {selectedTools.includes(tool) ? '✅ ' : ''}
                {tool}
              </button>
            )
          )}
        </div>

        {selectedTools.length >= 2 && (
          <button
            onClick={handleRunComparison}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold"
          >
            Compare {selectedTools.length} Tools
          </button>
        )}
      </div>

      {/* Problem Explanation */}
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
        <h4 className="text-sm font-bold text-red-300 mb-2">🔴 Problem This Solves</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>Too many tools to choose from</strong> (56%) → Quick filters narrow 700 → 20</li>
          <li>• <strong>Integration between tools is difficult</strong> (59%) → Shows compatibility scores</li>
          <li>• <strong>High learning curve</strong> (38%) → Guided tool comparison reduces overwhelm</li>
        </ul>
      </div>
    </div>
  )
}
