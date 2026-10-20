import { createContext, useContext } from 'react';
import type { PublicContent } from '@/content/types';

export interface AdminValue {
  email: string;
  content: PublicContent;
  reload: () => Promise<void>;
  setContent: (content: PublicContent) => void;
}

export const AdminContext = createContext<AdminValue | null>(null);

export function useAdmin(): AdminValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside the admin layout');
  return value;
}
