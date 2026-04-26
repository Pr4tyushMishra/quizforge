const API_URL = '/api';

export const ApiService = {
  async extractModules(text: string) {
    const response = await fetch(`${API_URL}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error("API call failed");
    return response.json();
  },

  async generateQuiz(modules: any[], level: string) {
    const response = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules, level })
    });
    if (!response.ok) throw new Error("API call failed");
    return response.json();
  },

  async generateAnalysis(attempt: any) {
    const response = await fetch(`${API_URL}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt })
    });
    if (!response.ok) throw new Error("API call failed");
    return response.json();
  }
};
