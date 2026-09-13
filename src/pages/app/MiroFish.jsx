import { useState, useEffect } from 'react';
import { mirofish } from '../../services/mirofish';

export default function MiroFish() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [seedData, setSeedData] = useState('');
  const [simulationConfig, setSimulationConfig] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check MiroFish connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isHealthy = await mirofish.healthCheck();
        setConnected(isHealthy);
      } catch (err) {
        setConnected(false);
        setError('Cannot connect to MiroFish backend at localhost:5001');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  // Load projects
  useEffect(() => {
    if (!connected) return;

    const loadProjects = async () => {
      try {
        const list = await mirofish.listProjects();
        setProjects(list.projects || []);
      } catch (err) {
        setError('Failed to load projects: ' + err.message);
      }
    };

    loadProjects();
  }, [connected]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setLoading(true);
      const result = await mirofish.createProject({
        name: projectName,
        description: 'Created via Toolnaut',
      });
      setSuccess('Project created: ' + result.project_id);
      setProjectName('');
      // Reload projects
      const list = await mirofish.listProjects();
      setProjects(list.projects || []);
    } catch (err) {
      setError('Failed to create project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildGraph = async (projectId) => {
    if (!seedData.trim()) {
      setError('Seed data is required');
      return;
    }

    try {
      setLoading(true);
      const result = await mirofish.buildGraph(projectId, seedData);
      setSuccess('Graph built successfully: ' + result.graph_id);
      setSeedData('');
    } catch (err) {
      setError('Failed to build graph: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (projectId) => {
    if (!simulationConfig.trim()) {
      setError('Simulation config is required');
      return;
    }

    try {
      setLoading(true);
      const config = JSON.parse(simulationConfig);
      const simulation = await mirofish.createSimulation(projectId, config);
      const result = await mirofish.runSimulation(projectId, simulation.simulation_id);
      setSuccess('Simulation started: ' + result.simulation_id);
      setSimulationConfig('');
    } catch (err) {
      setError('Failed to run simulation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Connecting to MiroFish...</div>
          <div className="text-gray-500">Ensure MiroFish is running at A:\MiroFish</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">MiroFish Integration</h1>
        <p className="text-gray-400 mb-8">
          Swarm Intelligence Engine - Predict Anything
        </p>

        {/* Status */}
        <div className={`mb-8 p-4 rounded-lg ${connected ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={connected ? 'text-green-300' : 'text-red-300'}>
              {connected ? 'Connected to MiroFish' : 'Not connected to MiroFish'}
            </span>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
            {success}
          </div>
        )}

        {connected ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Project */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Create Project</h2>
              <form onSubmit={handleCreateProject}>
                <input
                  type="text"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg mb-4 border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </form>
            </div>

            {/* Build Graph */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Build Graph</h2>
              <textarea
                placeholder="Seed data (enter facts, news, or context)"
                value={seedData}
                onChange={(e) => setSeedData(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg mb-4 border border-slate-600 focus:border-blue-500 focus:outline-none h-24"
              />
              <button
                onClick={() => selectedProject && handleBuildGraph(selectedProject)}
                disabled={loading || !selectedProject}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Building...' : 'Build Graph'}
              </button>
            </div>

            {/* Run Simulation */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h2 className="text-xl font-bold text-white mb-4">Run Simulation</h2>
              <textarea
                placeholder='Simulation config (JSON format, e.g., {"agents": 100, "steps": 50})'
                value={simulationConfig}
                onChange={(e) => setSimulationConfig(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg mb-4 border border-slate-600 focus:border-blue-500 focus:outline-none h-24"
              />
              <button
                onClick={() => selectedProject && handleRunSimulation(selectedProject)}
                disabled={loading || !selectedProject}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Simulation'}
              </button>
            </div>

            {/* Projects List */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h2 className="text-xl font-bold text-white mb-4">Projects</h2>
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <p className="text-gray-400">No projects yet. Create one to get started.</p>
                ) : (
                  projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProject(proj.id)}
                      className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                        selectedProject === proj.id
                          ? 'bg-blue-600/30 border-blue-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium text-white">{proj.name}</div>
                      <div className="text-sm text-gray-400">{proj.description || 'No description'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">MiroFish Not Connected</h2>
            <p className="text-gray-400 mb-6">
              To use MiroFish, start it first:
            </p>
            <pre className="bg-slate-900 p-4 rounded-lg text-left text-green-400 mb-6 overflow-x-auto">
              <code>cd A:\MiroFish{'\n'}npm run setup:all{'\n'}npm run dev</code>
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Check Connection Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
