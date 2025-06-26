const getApiBaseUrl = () => {
    // For Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.VITE_API_URL || 'http://localhost:8000';
    }
    // For Create React App
    if (typeof process !== 'undefined' && process.env) {
        return process.env.REACT_APP_API_URL || 'http://localhost:8000';
    }
    // Fallback
    return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get auth token from localStorage
    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // Create default headers with auth token
    getDefaultHeaders() {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            headers: this.getDefaultHeaders(),
            credentials: 'include', // Include cookies
            ...options,
        };

        // Merge headers if custom headers are provided
        if (options.headers) {
            config.headers = {
                ...config.headers,
                ...options.headers,
            };
        }

        try {
            const response = await fetch(url, config);

            // Handle 401 - token expired or invalid
            if (response.status === 401) {
                // Clear auth data and redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('technician');
                window.location.href = '/login';
                throw new Error('Authentication expired. Please log in again.');
            }

            // Handle other HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // HTTP Methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            ...options,
        });
    }

    async post(endpoint, data = null, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...options,
        });
    }

    async put(endpoint, data = null, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...options,
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options,
        });
    }

    async patch(endpoint, data = null, options = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : null,
            ...options,
        });
    }
}

// Create a singleton instance
const apiClient = new ApiClient();

// Export specific API functions
export const authAPI = {
    login: (crmCode, password) =>
        apiClient.post('/api/auth/login', { crmCode, password }),

    changePassword: (currentPassword, newPassword) =>
        apiClient.post('/api/auth/change-password', { currentPassword, newPassword }),

    getMe: () =>
        apiClient.get('/api/auth/me'),

    logout: () =>
        apiClient.post('/api/auth/logout'),
};

export const dashboardAPI = {
    getStats: () =>
        apiClient.get('/api/dashboard/stats'),

    getTopTechnicians: () =>
        apiClient.get('/api/dashboard/top-technicians'),
};

export const reviewsAPI = {
    getReviews: () =>
        apiClient.get('/api/reviews'),

    generateResponse: (reviewId) =>
        apiClient.post(`/api/reviews/${reviewId}/generate-response`),

    approveResponse: (reviewId, approvedBy) =>
        apiClient.post(`/api/reviews/${reviewId}/approve-response`, { approvedBy }),

    publishResponse: (reviewId) =>
        apiClient.post(`/api/reviews/${reviewId}/publish-response`),

    getPublishedReviews: () =>
        apiClient.get('/api/reviews/published'),
};

export const techniciansAPI = {
    getTechnicians: () =>
        apiClient.get('/api/technicians'),

    getTechnicianByCrmCode: (crmCode) =>
        apiClient.get(`/api/technicians/crm/${crmCode}`),

    updatePersona: (crmCode, persona) =>
        apiClient.put(`/api/technicians/crm/${crmCode}/persona`, { persona }),
};

export const promptsAPI = {
    getPrompts: (type = null) =>
        apiClient.get(`/api/prompts${type ? `?type=${type}` : ''}`),

    getActivePrompt: (type) =>
        apiClient.get(`/api/prompts/active/${type}`),

    createPrompt: (promptData) =>
        apiClient.post('/api/prompts', promptData),

    updatePrompt: (id, promptData) =>
        apiClient.put(`/api/prompts/${id}`, promptData),

    activatePrompt: (id) =>
        apiClient.post(`/api/prompts/${id}/activate`),
};

export const testingAPI = {
    generateResponse: (reviewData, technicianData, responsePrompt, useCustomPrompts) =>
        apiClient.post('/api/testing/generate-response', {
            reviewData,
            technicianData,
            responsePrompt,
            useCustomPrompts,
        }),

    getSampleReviews: () =>
        apiClient.get('/api/testing/sample-reviews'),
};

// Export the main client for custom requests
export default apiClient;