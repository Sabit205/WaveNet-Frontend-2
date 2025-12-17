"use client";
import { UserButton } from '@clerk/nextjs';
import CallManager from '@/components/CallManager';
import FriendManager from '@/components/FriendManager';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <CallManager />
      
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-600">WaveNet</h1>
        <div className="flex items-center gap-4">
          <Link href="/call-history">
            <Button variant="ghost" className="gap-2">
              <History className="h-4 w-4" /> History
            </Button>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <FriendManager />
      </main>
    </div>
  );
}