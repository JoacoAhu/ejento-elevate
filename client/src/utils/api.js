// src/services/apiClient.js
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

const isEjentoMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.has('location') && params.has('user');
};

// Get the appropriate API path based on mode
const getApiPath = (regularPath, ejentoPath) => {
    return isEjentoMode() ? ejentoPath : regularPath;
};

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Create default headers (no token needed for cookie-based auth)
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            headers: this.getDefaultHeaders(),
            credentials: 'include', // Include cookies for both auth types
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

            // Handle 401 - authentication failed
            if (response.status === 401) {
                // In Ejento mode, show error instead of redirecting
                if (isEjentoMode()) {
                    throw new Error('Authentication expired. Please refresh the page.');
                } else {
                    // Regular mode - redirect to login
                    window.location.href = '/login';
                    throw new Error('Authentication expired. Please log in again.');
                }
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

// Helper function to add URL params for Ejento mode
const addEjentoParams = (path) => {
    if (isEjentoMode()) {
        const params = new URLSearchParams(window.location.search);
        const queryString = params.toString();
        return `${path}?${queryString}`;
    }
    return path;
};

// Export specific API functions with mode detection
export const authAPI = {
    login: (crmCode, password) =>
        apiClient.post('/api/auth/login', { crmCode, password }),

    changePassword: (currentPassword, newPassword) =>
        apiClient.post('/api/auth/change-password', { currentPassword, newPassword }),

    getMe: () => {
        const path = getApiPath('/api/auth/me', '/api/auth/verify-ejento');
        return apiClient.get(addEjentoParams(path));
    },

    logout: () =>
        apiClient.post('/api/auth/logout'),
};

export const dashboardAPI = {
    getStats: () => {
        const path = getApiPath('/api/dashboard/stats', '/api/ejento/dashboard/stats');
        return apiClient.get(addEjentoParams(path));
    },

    getTopTechnicians: () => {
        const path = getApiPath('/api/dashboard/top-technicians', '/api/ejento/dashboard/top-technicians');
        return apiClient.get(addEjentoParams(path));
    },
};

export const reviewsAPI = {
    getReviews: () => {
        const path = getApiPath('/api/reviews', '/api/ejento/reviews');
        return apiClient.get(addEjentoParams(path));
    },

    generateResponse: (reviewId) => {
        const path = getApiPath(
            `/api/reviews/${reviewId}/generate-response`,
            `/api/ejento/reviews/${reviewId}/generate-response`
        );
        return apiClient.post(addEjentoParams(path));
    },

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

// Admin API (for Ejento management)
export const adminAPI = {
    getLocationMappings: () =>
        apiClient.get('/api/admin/ejento/locations'),

    createLocationMapping: (locationData) =>
        apiClient.post('/api/admin/ejento/locations', locationData),

    getUserMappings: (locationId) => {
        const query = locationId ? `?locationId=${locationId}` : '';
        return apiClient.get(`/api/admin/ejento/users${query}`);
    },

    createUserMapping: (userData) =>
        apiClient.post('/api/admin/ejento/users', userData),

    generateTestUrl: (locationId, userId) =>
        apiClient.post('/api/admin/ejento/generate-url', { locationId, userId }),
};

// Utility functions
export const utils = {
    isEjentoMode,
    getUrlParams: () => {
        const params = new URLSearchParams(window.location.search);
        return {
            location: params.get('location'),
            user: params.get('user'),
            token: params.get('token')
        };
    }
};

// Export the main client for custom requests
export default apiClient;