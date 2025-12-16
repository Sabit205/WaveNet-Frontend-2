"use client";
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useStore } from '@/store/useStore';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { connectSocket } = useStore();

  useEffect(() => {
    if (user) {
      connectSocket(user.id, {
        name: user.fullName || "Unknown User",
        imageUrl: user.imageUrl
      });
    }
  }, [user, connectSocket]);

  return <>{children}</>;
};