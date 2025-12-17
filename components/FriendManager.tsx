"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, Video, Check, X, UserPlus } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function FriendManager() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { onlineUsers, startCalling, socket } = useStore();
  
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  // 1. Sync User & Fetch Data
  useEffect(() => {
    const init = async () => {
      if(!user) return;
      const token = await getToken();
      
      // Sync User first
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sync-user`, {
        id: user.id,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        emailAddresses: user.emailAddresses
      }, { headers: { Authorization: `Bearer ${token}` }});

      // Fetch friends
      fetchFriends(token);
    };
    init();
  }, [user]);

  const fetchFriends = async (token: string | null) => {
    if(!token) return;
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setFriends(res.data.friends);
    setRequests(res.data.requests);
  };

  const searchUsers = async () => {
    const token = await getToken();
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/search?query=${query}`, {
       headers: { Authorization: `Bearer ${token}` }
    });
    setSearchResults(res.data);
  };

  const sendRequest = async (targetId: string) => {
    const token = await getToken();
    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends/request`, { targetId }, {
       headers: { Authorization: `Bearer ${token}` }
    });
    alert("Request Sent!");
  };

  const respondRequest = async (requesterId: string, action: 'accept' | 'reject') => {
    const token = await getToken();
    await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/friends/respond`, 
      { requesterId, action }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchFriends(token);
  };

  const handleCall = (friend: any, type: 'audio' | 'video') => {
    const callerInfo = { id: user?.id, name: user?.fullName, avatar: user?.imageUrl };
    socket?.emit('call-user', {
      caller: callerInfo,
      receiverId: friend.clerkId,
      callType: type
    });
    startCalling({ id: friend.clerkId, name: friend.name, imageUrl: friend.image }, type);
  };

  return (
    <Tabs defaultValue="friends" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="friends">Friends</TabsTrigger>
        <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        <TabsTrigger value="search">Add Friend</TabsTrigger>
      </TabsList>
      
      {/* FRIENDS LIST */}
      <TabsContent value="friends" className="mt-4 space-y-4">
        {friends.length === 0 && <p className="text-center text-gray-500">No friends yet.</p>}
        {friends.map(friend => {
          const isOnline = onlineUsers.includes(friend.clerkId);
          return (
            <div key={friend.clerkId} className="flex items-center justify-between p-4 bg-white border rounded-lg">
               <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar><AvatarImage src={friend.image} /></Avatar>
                    {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"/>}
                  </div>
                  <div>
                    <p className="font-semibold">{friend.name}</p>
                    <p className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Button size="icon" variant="ghost" disabled={!isOnline} onClick={() => handleCall(friend, 'audio')}>
                   <Phone className={`h-5 w-5 ${isOnline ? 'text-gray-700' : 'text-gray-300'}`} />
                 </Button>
                 <Button size="icon" variant="ghost" disabled={!isOnline} onClick={() => handleCall(friend, 'video')}>
                   <Video className={`h-5 w-5 ${isOnline ? 'text-blue-600' : 'text-gray-300'}`} />
                 </Button>
               </div>
            </div>
          )
        })}
      </TabsContent>

      {/* REQUESTS */}
      <TabsContent value="requests" className="mt-4 space-y-4">
        {requests.map(req => (
           <div key={req.clerkId} className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar><AvatarImage src={req.image} /></Avatar>
                <p className="font-semibold">{req.name}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respondRequest(req.clerkId, 'accept')} className="bg-green-600">
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => respondRequest(req.clerkId, 'reject')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
           </div>
        ))}
      </TabsContent>

      {/* SEARCH */}
      <TabsContent value="search" className="mt-4">
        <div className="flex gap-2 mb-4">
          <Input placeholder="Search by name or email..." value={query} onChange={e => setQuery(e.target.value)} />
          <Button onClick={searchUsers}>Search</Button>
        </div>
        <div className="space-y-4">
          {searchResults.map(u => (
            <div key={u.clerkId} className="flex items-center justify-between p-4 bg-white border rounded-lg">
               <div className="flex items-center gap-3">
                 <Avatar><AvatarImage src={u.image} /></Avatar>
                 <p className="font-semibold">{u.name}</p>
               </div>
               <Button size="sm" variant="secondary" onClick={() => sendRequest(u.clerkId)}>
                 <UserPlus className="h-4 w-4 mr-2" /> Add
               </Button>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}