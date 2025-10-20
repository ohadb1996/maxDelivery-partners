import { Card, CardContent } from '@/components/ui/card';
import { Package, DollarSign, TrendingUp } from 'lucide-react';

interface MonthlyStatsCardProps {
  deliveryCount: number;
  totalEarnings: number;
  monthName: string;
  averagePerDelivery?: number;
}

export default function MonthlyStatsCard({ 
  deliveryCount, 
  totalEarnings, 
  monthName,
  averagePerDelivery 
}: MonthlyStatsCardProps) {
  const avgEarnings = averagePerDelivery || (deliveryCount > 0 ? totalEarnings / deliveryCount : 0);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 text-right">
        סיכום {monthName}
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{deliveryCount}</p>
            <p className="text-xs text-gray-600">משלוחים</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">₪{totalEarnings.toFixed(0)}</p>
            <p className="text-xs text-gray-600">סה"כ הכנסות</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">₪{avgEarnings.toFixed(0)}</p>
            <p className="text-xs text-gray-600">ממוצע למשלוח</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



