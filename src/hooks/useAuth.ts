import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface AuthUser {
  username: string;
  role: string;
  token: string;
}

export function useAuth(): [AuthUser | null, (user: AuthUser | null) => void, boolean] {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    if (token && username && role) {
      return { token, username, role };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = useCallback(async (token: string) => {
    try {
      await axios.get(`${process.env.REACT_APP_FRIGATE_PROXY || 'http://localhost:4000'}/api/auth/check`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (user?.token) {
        const isValid = await verifyToken(user.token);
        if (!isValid) {
          setUserState(null);
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [user, verifyToken]);

  const setUser = (newUser: AuthUser | null) => {
    if (newUser) {
      localStorage.setItem('token', newUser.token);
      localStorage.setItem('username', newUser.username);
      localStorage.setItem('role', newUser.role);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
    }
    setUserState(newUser);
  };

  return [user, setUser, isLoading];
}
