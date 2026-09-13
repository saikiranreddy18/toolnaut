// MiroFish API Client
// Connects to MiroFish backend running on A:\MiroFish

const MIROFISH_API = 'http://localhost:5001/api';

class MiroFishClient {
  constructor() {
    this.baseUrl = MIROFISH_API;
    this.timeout = 30000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Graph API endpoints
  async createProject(projectData) {
    return this.request('/graph/project/create', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async listProjects() {
    return this.request('/graph/project/list');
  }

  async getProject(projectId) {
    return this.request(`/graph/project/${projectId}`);
  }

  async buildGraph(projectId, seedData) {
    return this.request(`/graph/project/${projectId}/build`, {
      method: 'POST',
      body: JSON.stringify({ seed_content: seedData }),
    });
  }

  // Simulation API endpoints
  async createSimulation(projectId, config) {
    return this.request(`/simulation/project/${projectId}/simulation/create`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async listSimulations(projectId) {
    return this.request(`/simulation/project/${projectId}/simulation/list`);
  }

  async getSimulation(projectId, simulationId) {
    return this.request(`/simulation/project/${projectId}/simulation/${simulationId}`);
  }

  async runSimulation(projectId, simulationId) {
    return this.request(`/simulation/project/${projectId}/simulation/${simulationId}/run`, {
      method: 'POST',
    });
  }

  // Report API endpoints
  async generateReport(projectId, simulationId) {
    return this.request(`/report/project/${projectId}/simulation/${simulationId}/report`, {
      method: 'POST',
    });
  }

  async getReport(reportId) {
    return this.request(`/report/${reportId}`);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mirofish = new MiroFishClient();
