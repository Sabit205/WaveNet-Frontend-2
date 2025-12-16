import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { SocketProvider } from "@/components/SocketProvider"; // Helper wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WaveNet",
  description: "Real-time calling app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <SignedOut>
            <div className="flex h-screen items-center justify-center bg-gray-100">
               <div className="p-10 bg-white rounded-xl shadow-lg text-center">
                 <h1 className="text-3xl font-bold mb-6 text-blue-600">WaveNet</h1>
                 <SignInButton mode="modal">
                   <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                     Sign In to Start
                   </button>
                 </SignInButton>
               </div>
            </div>
          </SignedOut>
          <SignedIn>
            <SocketProvider>
              {children}
            </SocketProvider>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}