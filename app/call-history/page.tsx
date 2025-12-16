"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Log {
  _id: string;
  callerName: string;
  receiverName: string;
  callType: string;
  startTime: string;
  status: string;
}

export default function CallHistory() {
  const { userId, getToken } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return;
      const token = await getToken();
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/history/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchHistory();
  }, [userId, getToken]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{log.callerName}</TableCell>
                    <TableCell>{log.receiverName}</TableCell>
                    <TableCell className="capitalize">{log.callType}</TableCell>
                    <TableCell>
                      <Badge variant={
                        log.status === 'accepted' ? 'default' : 
                        log.status === 'missed' ? 'destructive' : 'secondary'
                      }>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(log.startTime), 'MMM d, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}