import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, History, User as UserIcon, X, LogOut } from "lucide-react";
import { Logo } from "../ui/Logo";
import { useAuth } from "@/context/AuthContext";

interface SideNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SideNavigation({ isOpen, onToggle }: SideNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { name: "דשבורד", path: "/", icon: Home },
    { name: "פעיל", path: "/active", icon: Package },
    { name: "היסטוריית משלוחים", path: "/history", icon: History },
    { name: "פרופיל", path: "/profile", icon: UserIcon },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      onToggle(); // Close the sidebar
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Side Navigation */}
      <nav className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Logo size="md" showText={false} />
              <div>
                <h1 className="text-lg font-bold text-gray-900">MaxDelivery</h1>
                <p className="text-xs text-gray-500">תפריט ניווט</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onToggle}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    isActive
                      ? "bg-green-50 text-green-700 border-2 border-green-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
                    <Icon className={`w-6 h-6 transition-all ${isActive ? 'scale-110 drop-shadow-lg' : ''}`} />  
                  </div>
                  <span className={`text-lg font-medium ${isActive ? 'font-bold' : ''}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <div className="mr-auto w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all w-full text-gray-600 hover:bg-red-50 hover:text-red-600 mt-4"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-lg font-medium">התנתק</span>
            </button>
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="text-center text-xs text-gray-500">
              <p>MaxDelivery Partner App</p>
              <p>גרסה 1.0.0</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
