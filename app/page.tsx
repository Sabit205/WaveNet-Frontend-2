"use client";
import { useUser, UserButton } from '@clerk/nextjs';
import { useStore } from '@/store/useStore';
import CallManager from '@/components/CallManager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video, History } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Home() {
  const { user } = useUser();
  const { onlineUsers, startCalling, socket } = useStore();
  
  // Filter out self
  const otherUsers = onlineUsers.filter(u => u.userId !== user?.id);

  const handleCall = (targetId: string, targetInfo: any, type: 'audio' | 'video') => {
    const callerInfo = { id: user?.id, name: user?.fullName, avatar: user?.imageUrl };
    socket?.emit('call-user', {
      caller: callerInfo,
      receiverId: targetId,
      callType: type
    });
    startCalling({ id: targetId, ...targetInfo }, type);
  };
  
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
            <CardTitle>Online Users ({otherUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {otherUsers.length === 0 ? (
               <p className="text-gray-500 text-center py-8">No other users online.</p>
            ) : (
              <div className="grid gap-4">
                 {otherUsers.map((u) => (
                   <div key={u.userId} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={u.userInfo.imageUrl} />
                            <AvatarFallback>{u.userInfo.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div>
                          <p className="font-medium">{u.userInfo.name}</p>
                          <p className="text-xs text-green-600">Online</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleCall(u.userId, u.userInfo, 'audio')}
                        >
                          <Phone className="h-5 w-5 text-gray-600 hover:text-green-600" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleCall(u.userId, u.userInfo, 'video')}
                        >
                          <Video className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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