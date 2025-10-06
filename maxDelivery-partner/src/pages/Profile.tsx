import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User2, Phone, Star, Package, TrendingUp, LogOut, Bike, Car, Truck } from "lucide-react";
import { User, Courier, DeliveryStats } from "@/types";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [stats, setStats] = useState<DeliveryStats>({ total: 0, thisWeek: 0, rating: 5.0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Mock data - replace with actual API calls
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
      setStats({
        total: 127,
        thisWeek: 8,
        rating: mockCourier.rating || 5.0
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      // Mock logout - replace with actual logout logic
      console.log("Logging out...");
      // Redirect to login page or handle logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const vehicleIcons = {
    bike: Bike,
    motorcycle: Bike,
    car: Car,
    van: Truck
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const VehicleIcon = vehicleIcons[courier?.vehicle_type || 'bike'];

  return (
    <div className="p-4 pb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>

      <Card className="mb-4 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{user?.full_name}</h3>
              <p className="text-gray-600 mb-2">{user?.email}</p>
              {courier?.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="w-3 h-3" />
                  {courier.phone}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              <VehicleIcon className="w-3 h-3 mr-1" />
              {courier?.vehicle_type || 'bike'}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-gray-900">{stats.rating.toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            <p className="text-xs text-gray-500">This Week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Rating</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200">
        <CardContent className="p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
