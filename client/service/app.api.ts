import { Task, Priority, Status, User } from "./app.interface";
import { authFetch, handleAutoLogout } from "@/lib/interceptor";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Helper function for API calls using authFetch interceptor
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const response = await authFetch(endpoint, options);

        if (!response.ok) {
            const error = await response
                .json()
                .catch(() => ({ message: "An error occurred" }));
            throw new Error(
                error.message || `HTTP error! status: ${response.status}`
            );
        }

        return response.json();
    } catch (error: any) {
        console.error(`API call failed for ${endpoint}:`, error);
        throw error;
    }
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

        // Store tokens in cookies (more secure than localStorage)
        document.cookie = `access_token=${response.accessToken}; path=/; secure; samesite=strict; max-age=${15 * 60}`; // 15 minutes
        document.cookie = `refresh_token=${response.refreshToken}; path=/; secure; samesite=strict; max-age=${7 * 24 * 60 * 60}`; // 7 days
        document.cookie = `token_type=Bearer; path=/; secure; samesite=strict`;

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
        const response = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error("Failed to refresh token");
        }

        const data = await response.json();

        // Update access token in cookie
        document.cookie = `access_token=${data.accessToken}; path=/; secure; samesite=strict; max-age=${15 * 60}`;

        return data;
    },

    /**
     * Logout user
     */
    logout: async (): Promise<{ message: string }> => {
        const refreshToken = document.cookie
            .split("; ")
            .find((row) => row.startsWith("refresh_token="))
            ?.split("=")[1];

        if (refreshToken) {
            try {
                const response = await apiCall<{ message: string }>("/auth/logout", {
                    method: "POST",
                    body: JSON.stringify({ refreshToken }),
                });
                return response;
            } catch (error) {
                console.error("Logout API call failed:", error);
            }
        }

        // Clear cookies regardless of API response
        document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
        document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
        document.cookie = "token_type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";

        return { message: "Logged out successfully" };
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

        // Clear cookies
        document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
        document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
        document.cookie = "token_type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";

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
 * Check if user is authenticated by checking for access token in cookies
 */
export const isAuthenticated = (): boolean => {
    const accessToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];
    return !!accessToken;
};

/**
 * Get stored access token from cookies
 */
export const getAccessToken = (): string | null => {
    return (
        document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1] || null
    );
};

/**
 * Get stored refresh token from cookies
 */
export const getRefreshToken = (): string | null => {
    return (
        document.cookie
            .split("; ")
            .find((row) => row.startsWith("refresh_token="))
            ?.split("=")[1] || null
    );
};

/**
 * Manual logout helper (clears cookies and redirects)
 */
export const manualLogout = () => {
    handleAutoLogout('Manual logout');
};
