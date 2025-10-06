import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, History, User as UserIcon, LogOut } from "lucide-react";
import { User, Courier } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout, isLoading } = useAuth();
  const [courier, setCourier] = useState<Courier | null>(null);

  useEffect(() => {
    if (authUser) {
      loadCourierData();
    }
  }, [authUser]);

  const loadCourierData = async () => {
    try {
      // Mock data for now - replace with actual API calls
      // This should be replaced with real courier data from the database
      const mockCourier: Courier = {
        id: authUser?.uid || "1",
        created_by: authUser?.email || "courier@example.com",
        phone: authUser?.phone || "+1234567890",
        vehicle_type: "bike",
        is_available: true,
        rating: 4.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCourier(mockCourier);
    } catch (error) {
      console.error("Error loading courier data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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

  const navItems = [
    { name: "דשבורד", path: "/", icon: Home },
    { name: "פעיל", path: "/active", icon: Package },
    { name: "היסטוריה", path: "/history", icon: History },
    { name: "פרופיל", path: "/profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <h1 className="text-lg font-bold text-gray-900">MaxDelivery שותף</h1>
                {authUser && (
                  <p className="text-xs text-gray-500">שלום, {authUser.username || authUser.email?.split('@')[0] || 'שליח'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {authUser && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${authUser.isAvailable ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
                  <span className={`text-xs font-medium ${authUser.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {authUser.isAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>התנתקות</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-4 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 w-12 h-1 bg-blue-600 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
