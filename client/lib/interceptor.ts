// Global logout function that can be called from anywhere
let globalLogoutFunction: (() => void) | null = null;

export const setGlobalLogoutFunction = (logoutFn: () => void) => {
    globalLogoutFunction = logoutFn;
};

export const clearAuthData = () => {
    // Clear all auth-related cookies
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
    document.cookie = "token_type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
    
};

export const handleAutoLogout = (reason: string = 'Session expired') => {
    console.warn(`Auto-logout triggered: ${reason}`);
    
    // Clear all auth data
    clearAuthData();
    
    // Call global logout function if available
    if (globalLogoutFunction) {
        globalLogoutFunction();
    }
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=session_expired';
    }
};

// Enhanced fetch wrapper with automatic token refresh and logout
export const authFetch = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    // Get current access token
    let accessToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1] || "";
    
    // Detect if body is FormData
    const isFormData = options.body instanceof FormData;
    
    // Build headers intelligently based on body type
    const headers: HeadersInit = {
        ...(options.headers || {}),
        // Add Authorization header if token exists
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };
    
    // Only add Content-Type for JSON requests (not FormData)
    if (!isFormData && !options.headers?.hasOwnProperty('Content-Type')) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    
    // Make initial request
    let response = await fetch(fullUrl, {
        ...options,
        headers,
    });
    
    // If 401, try to refresh token and retry
    if (response.status === 401 && !url.includes('/admin/auth/refresh')) {
        try {
            const refreshSuccess = await refreshTokens();
            
            if (refreshSuccess) {
                // Get new access token
                accessToken = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("access_token="))
                    ?.split("=")[1] || "";
                
                // Rebuild headers with new token
                const retryHeaders: HeadersInit = {
                    ...(options.headers || {}),
                    Authorization: `Bearer ${accessToken}`,
                };
                
                // Only add Content-Type for JSON requests (not FormData)
                if (!isFormData && !options.headers?.hasOwnProperty('Content-Type')) {
                    (retryHeaders as Record<string, string>)['Content-Type'] = 'application/json';
                }
                
                // Retry request with new token
                response = await fetch(fullUrl, {
                    ...options,
                    headers: retryHeaders,
                });
            } else {
                // Refresh failed, trigger auto-logout
                handleAutoLogout('Refresh token expired');
                throw new Error('Authentication failed');
            }
        } catch (error) {
            // Refresh failed, trigger auto-logout
            handleAutoLogout('Token refresh failed');
            throw error;
        }
    }
    
    return response;
};

// Refresh tokens function
const refreshTokens = async (): Promise<boolean> => {
    try {
        const refreshToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('refresh_token='))
            ?.split('=')[1];
        
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${baseUrl}/admin/auth/refresh?refresh_token=${refreshToken}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        
        if (response.status === 401) {
            // Refresh token is invalid/expired
            throw new Error("Refresh token expired");
        }
        
        if (response.ok) {
            const data = await response.json();
            
            // Update cookies with new tokens
            if (data.access_token) {
                document.cookie = `access_token=${data.access_token}; path=/; secure; samesite=strict`;
            }
            if (data.refresh_token) {
                document.cookie = `refresh_token=${data.refresh_token}; path=/; secure; samesite=strict`;
            }
            if (data.token_type) {
                document.cookie = `token_type=${data.token_type}; path=/; secure; samesite=strict`;
            }
            
            console.log('Tokens refreshed successfully');
            return true;
        }
        
        throw new Error(`Refresh failed with status: ${response.status}`);
    } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
    }
};
