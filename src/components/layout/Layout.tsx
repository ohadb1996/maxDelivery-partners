import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SideNavigation from "./SideNavigation";
import { Logo } from "../ui/Logo";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user: authUser, isLoading } = useAuth();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !authUser) {
      navigate('/login');
    }
  }, [isLoading, authUser, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSideNavOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <Logo size="md" showText={false} />
              <div className="text-left">
                <h1 className="text-lg font-bold text-gray-900">MaxDelivery partner</h1>
                {authUser && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${authUser.isAvailable ? 'bg-green-500' : 'bg-red-400'} animate-pulse`} />
                    <p className="text-xs text-gray-500">שלום, {authUser.username || authUser.email?.split('@')[0] || 'שליח'}</p>
                  </div> 
              )}
                
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Side Navigation */}
      <SideNavigation 
        isOpen={isSideNavOpen} 
        onToggle={() => setIsSideNavOpen(!isSideNavOpen)} 
      />
    </div>
  );
}
