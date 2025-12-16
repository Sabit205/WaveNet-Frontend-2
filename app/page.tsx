"use client";
import { useEffect, useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useStore } from '@/store/useStore';
import CallManager from '@/components/CallManager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video, History } from 'lucide-react';
import Link from 'next/link';

// NOTE: In a real app, you'd fetch all users from Clerk API via your Backend.
// For this demo, we can only call users who are ONLINE and connected to the socket.
// We will mock the display by showing "Online Users" based on socket IDs. 
// Since we don't have a persistent User DB synced yet, we'll assume 
// the socket 'online-users' list contains Clerk IDs. 
// In a real scenario, you map these IDs to user details fetched from DB.

export default function Home() {
  const { user } = useUser();
  const { onlineUsers, startCalling, socket } = useStore();
  
  // Fake list of potential contacts (In prod, fetch from /api/users)
  // Here we just visualize the concept. 
  // IMPORTANT: To test calls, open 2 different browsers with 2 different Clerk accounts.
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <CallManager />
      
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600">WaveNet</h1>
        <div className="flex items-center gap-4">
          <Link href="/call-history">
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" /> History
            </Button>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Online Users ({onlineUsers.length - 1 > 0 ? onlineUsers.length - 1 : 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.filter(id => id !== user?.id).length === 0 ? (
               <p className="text-gray-500 text-center py-8">No other users online. Open a second window to test.</p>
            ) : (
              <div className="grid gap-4">
                 {/* 
                    Since we only have IDs from socket, we'd normally fetch details.
                    For this demo, we'll show the ID and allow entering a name manually or 
                    if you implement the User Sync, display real data.
                    
                    Simulating a user entry for the ID found in onlineUsers
                 */}
                 {onlineUsers.filter(id => id !== user?.id).map((remoteId) => (
                   <div key={remoteId} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            U
                          </div>
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div>
                          <p className="font-medium">User {remoteId.slice(0, 8)}...</p>
                          <p className="text-xs text-green-600">Online</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            // Initiating call
                            socket?.emit('call-user', {
                              caller: { id: user?.id, name: user?.fullName, avatar: user?.imageUrl },
                              receiverId: remoteId,
                              callType: 'audio'
                            });
                            startCalling({ id: remoteId, name: 'User ' + remoteId.slice(0,5), imageUrl: '' }, 'audio');
                          }}
                        >
                          <Phone className="h-5 w-5 text-gray-600" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                             socket?.emit('call-user', {
                              caller: { id: user?.id, name: user?.fullName, avatar: user?.imageUrl },
                              receiverId: remoteId,
                              callType: 'video'
                            });
                            startCalling({ id: remoteId, name: 'User ' + remoteId.slice(0,5), imageUrl: '' }, 'video');
                          }}
                        >
                          <Video className="h-5 w-5 text-blue-600" />
                        </Button>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}