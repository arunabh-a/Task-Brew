import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRoutes, setupTokenRefresh, isAuthenticated } from '@/service/app.api';
import { User } from '@/service/app.interface';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set up automatic token refresh
    setupTokenRefresh();

    // Load user profile if authenticated
    if (isAuthenticated()) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await apiRoutes.user.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      await apiRoutes.auth.register({ email, password, name });
      return { success: true, message: 'Registration successful! Please check your email to verify your account.' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRoutes.auth.login({ email, password });
      setUser(response.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiRoutes.auth.logout(refreshToken);
      }
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      setUser(null);
      router.push('/login');
    }
  };

  const updateProfile = async (data: { name?: string; bio?: string; avatarUrl?: string }) => {
    try {
      const updatedUser = await apiRoutes.user.updateProfile(data);
      setUser(updatedUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await apiRoutes.user.changePassword({ currentPassword, newPassword });
      return { success: true, message: 'Password changed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    refreshUser: loadUser,
  };
}