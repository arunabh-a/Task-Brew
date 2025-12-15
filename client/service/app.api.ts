import { Task, Priority, Status, User } from "./app.interface";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Helper function for API calls
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem("accessToken");

    const config: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    const response = await fetch(`${baseUrl}${endpoint}`, config);

    if (!response.ok) {
        const error = await response
            .json()
            .catch(() => ({ message: "An error occurred" }));
        throw new Error(
            error.message || `HTTP error! status: ${response.status}`
        );
    }

    return response.json();
}

// ============================================
// Authentication Routes
// ============================================

export const authApi = {
    /**
     * Register a new user
     */
    register: async (data: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{ message: string; userId: string }> => {
        return apiCall("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Verify user email
     */
    verifyEmail: async (token: string): Promise<{ message: string }> => {
        return apiCall("/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token }),
        });
    },

    /**
     * Login user
     */
    login: async (data: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }> => {
        const response = await apiCall<{
            accessToken: string;
            refreshToken: string;
            user: User;
        }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });

        // Store tokens in localStorage
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);

        return response;
    },

    /**
     * Refresh access token
     */
    refreshToken: async (
        refreshToken: string
    ): Promise<{
        accessToken: string;
    }> => {
        const response = await apiCall<{ accessToken: string }>(
            "/auth/refresh",
            {
                method: "POST",
                body: JSON.stringify({ refreshToken }),
            }
        );

        // Update access token
        localStorage.setItem("accessToken", response.accessToken);

        return response;
    },

    /**
     * Logout user
     */
    logout: async (refreshToken: string): Promise<{ message: string }> => {
        const response = await apiCall<{ message: string }>("/auth/logout", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
        });

        // Clear tokens
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        return response;
    },
};

// ============================================
// User Routes
// ============================================

export const userApi = {
    /**
     * Get current user profile
     */
    getProfile: async (): Promise<User> => {
        return apiCall("/users/me", {
            method: "GET",
        });
    },

    /**
     * Update user profile
     */
    updateProfile: async (data: {
        name?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<User> => {
        return apiCall("/users/me", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Change user password
     */
    changePassword: async (data: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{ message: string }> => {
        return apiCall("/users/me/password", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete user account
     */
    deleteAccount: async (): Promise<{ message: string }> => {
        const response = await apiCall<{ message: string }>("/users/me", {
            method: "DELETE",
        });

        // Clear tokens
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        return response;
    },
};

// ============================================
// Task Routes
// ============================================

export const taskApi = {
    /**
     * Get all tasks with optional filters
     */
    getTasks: async (filters?: {
        status?: Status;
        priority?: Priority;
        search?: string;
    }): Promise<Task[]> => {
        const params = new URLSearchParams();

        if (filters?.status) params.append("status", filters.status);
        if (filters?.priority) params.append("priority", filters.priority);
        if (filters?.search) params.append("search", filters.search);

        const queryString = params.toString();
        const endpoint = queryString ? `/tasks/tasks?${queryString}` : "/tasks/tasks";

        return apiCall(endpoint, {
            method: "GET",
        });
    },

    /**
     * Create a new task
     */
    createTask: async (data: {
        title: string;
        description?: string;
        dueDate?: string;
        priority?: Priority;
        status?: Status;
    }): Promise<Task> => {
        return apiCall("/tasks/tasks", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update an existing task
     */
    updateTask: async (
        taskId: string,
        data: {
            title?: string;
            description?: string;
            dueDate?: string;
            priority?: Priority;
            status?: Status;
        }
    ): Promise<Task> => {
        return apiCall(`/tasks/tasks/${taskId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a task
     */
    deleteTask: async (taskId: string): Promise<{ message: string }> => {
        return apiCall(`/tasks/tasks/${taskId}`, {
            method: "DELETE",
        });
    },
};

// ============================================
// Combined API Routes Export
// ============================================

export const apiRoutes = {
    auth: authApi,
    user: userApi,
    task: taskApi,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Set up automatic token refresh
 */
export const setupTokenRefresh = () => {
    // Refresh token every 14 minutes (access token expires in 15 minutes)
    setInterval(async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            try {
                await authApi.refreshToken(refreshToken);
            } catch (error) {
                console.error("Failed to refresh token:", error);
                // Redirect to login if refresh fails
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/login";
            }
        }
    }, 14 * 60 * 1000); // 14 minutes
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem("accessToken");
};

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
    return localStorage.getItem("accessToken");
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = (): string | null => {
    return localStorage.getItem("refreshToken");
};
