import { useContext } from 'react';
import { AdminAuthContext } from '../context/AdminAuthContext.js';

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
