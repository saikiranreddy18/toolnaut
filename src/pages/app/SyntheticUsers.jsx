import { useState, useEffect } from 'react'
import { syntheticUserSimulator } from '../../services/syntheticUsers'

export default function SyntheticUsers() {
  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [userCount, setUserCount] = useState(1000)
  const [insights, setInsights] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleData, setRoleData] = useState(null)

  const handleRunSimulation = async () => {
    setSimulating(true)
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      const feedback = syntheticUserSimulator.simulateAll(userCount)
      const insightData = syntheticUserSimulator.getInsights()
      setInsights(insightData)
      console.log('Simulation complete:', insightData)
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
      setLoading(false)
    }
  }

  const handleSelectRole = (role) => {
    setSelectedRole(role)
    const data = syntheticUserSimulator.getFeedbackByRole(role)
    setRoleData({
      role,
      count: data.length,
      avgSatisfaction: Math.round(data.reduce((sum, d) => sum + d.satisfaction, 0) / data.length),
      avgBudget: Math.round(data.reduce((sum, d) => sum + d.budget, 0) / data.length),
      conversionRate: Math.round((data.filter(d => d.likelyToPay).length / data.length) * 100),
      topPainPoints: data.slice(0, 5).flatMap(d => d.selectedPainPoints),
      topFeatures: data.slice(0, 5).flatMap(d => d.selectedFeatureRequests)
    })
  }

  const handleExport = () => {
    syntheticUserSimulator.downloadAsJSON()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Synthetic User Research</h1>
        <p className="text-gray-400 mb-8">
          Generate 1000+ synthetic personas, simulate their behavior, and collect aggregate feedback
        </p>

        {!insights ? (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Run Simulation</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Personas to Generate
                </label>
                <input
                  type="number"
                  value={userCount}
                  onChange={(e) => setUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10000"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Each persona will go through Toolnaut's quiz and provide feedback
                </p>
              </div>
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold disabled:opacity-50 transition-all"
              >
                {simulating ? 'Simulating ' + userCount + ' Users...' : 'Start Simulation'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-3xl font-bold text-blue-400">{insights.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-400 mt-2">Total Personas</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-3xl font-bold text-green-400">{insights.avgSatisfaction}%</div>
                <div className="text-sm text-gray-400 mt-2">Avg Satisfaction</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-3xl font-bold text-purple-400">{insights.completionRate}%</div>
                <div className="text-sm text-gray-400 mt-2">Quiz Completion</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-3xl font-bold text-cyan-400">{insights.likelyConverts}%</div>
                <div className="text-sm text-gray-400 mt-2">Likely to Convert</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('painPoints')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'painPoints'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Pain Points
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'features'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'roles'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                By Role
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">Key Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Avg Time Spent</span>
                      <span className="text-white font-medium">{insights.avgTimeSpent}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Quiz Completion</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${insights.completionRate}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{insights.completionRate}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Conversion Potential</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${insights.likelyConverts}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{insights.likelyConverts}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pain Points Tab */}
            {activeTab === 'painPoints' && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6">Top 10 Pain Points</h3>
                <div className="space-y-4">
                  {insights.topPainPoints.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">{idx + 1}. {item.point}</span>
                        <span className="text-sm font-medium text-gray-400">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6">Top 10 Feature Requests</h3>
                <div className="space-y-4">
                  {insights.topFeatureRequests.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">{idx + 1}. {item.feature}</span>
                        <span className="text-sm font-medium text-gray-400">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(insights.roleInsights).map(([role, data]) => (
                    <button
                      key={role}
                      onClick={() => handleSelectRole(role)}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        selectedRole === role
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-white">{role}</div>
                      <div className="text-sm text-gray-400 mt-2">{data.count} personas</div>
                      <div className="text-sm text-gray-400">
                        {data.conversionRate}% likely convert
                      </div>
                    </button>
                  ))}
                </div>

                {roleData && (
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">{roleData.role} Details</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{roleData.count}</div>
                        <div className="text-xs text-gray-400">Personas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">{roleData.avgSatisfaction}%</div>
                        <div className="text-xs text-gray-400">Satisfaction</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-400">${roleData.avgBudget}</div>
                        <div className="text-xs text-gray-400">Avg Budget</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-cyan-400">{roleData.conversionRate}%</div>
                        <div className="text-xs text-gray-400">Conversion</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-white mb-3">Top Pain Points</h4>
                        <div className="space-y-2">
                          {[...new Set(roleData.topPainPoints)].slice(0, 5).map((pp, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="w-2 h-2 bg-red-500 rounded-full" />
                              {pp}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-3">Top Features Wanted</h4>
                        <div className="space-y-2">
                          {[...new Set(roleData.topFeatures)].slice(0, 5).map((fr, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                              {fr}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export */}
            <div className="flex gap-4">
              <button
                onClick={() => setInsights(null)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
              >
                Run New Simulation
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Export as JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
