import { User } from "../types";

const AUTH_KEY = 'japan_receipt_user_session';

export const login = async (email: string, password: string): Promise<User> => {
  // 模擬 API 呼叫
  return new Promise((resolve) => {
    setTimeout(() => {
      const user: User = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        email: email,
        name: email.split('@')[0],
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      resolve(user);
    }, 1000);
  });
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
};