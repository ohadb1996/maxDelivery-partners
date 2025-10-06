import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Package, History, User as UserIcon } from "lucide-react";
import { User, Courier } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadCourierData();
  }, []);

  const loadCourierData = async () => {
    try {
      // Mock data for now - replace with actual API calls
      const mockUser: User = {
        id: "1",
        email: "courier@example.com",
        full_name: "John Courier",
        phone: "+1234567890",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockCourier: Courier = {
        id: "1",
        created_by: mockUser.email,
        phone: mockUser.phone || "",
        vehicle_type: "bike",
        is_available: true,
        rating: 4.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setCourier(mockCourier);
    } catch (error) {
      console.error("Error loading courier data:", error);
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Active", path: "/active", icon: Package },
    { name: "History", path: "/history", icon: History },
    { name: "Profile", path: "/profile", icon: UserIcon },
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
              <div>
                <h1 className="text-lg font-bold text-gray-900">MaxDelivery Partner</h1>
                {user && (
                  <p className="text-xs text-gray-500">Hi, {user.full_name?.split(' ')[0] || 'Courier'}</p>
                )}
              </div>
            </div>
            {courier && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${courier.is_available ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
                <span className={`text-xs font-medium ${courier.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                  {courier.is_available ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
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
