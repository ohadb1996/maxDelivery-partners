import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, DollarSign, Navigation2 } from "lucide-react";
import { DeliveryBatch } from "@/services/batchingService";

interface BatchDeliveryCardProps {
  batch: DeliveryBatch;
  onAccept: (batch: DeliveryBatch) => void;
  isLoading?: boolean;
}

export default function BatchDeliveryCard({ batch, onAccept, isLoading }: BatchDeliveryCardProps) {
  const [delivery1, delivery2] = batch.deliveries;
  const isCrossBusiness = batch.type === 'cross_business';

  return (
    <Card className={`border-2 shadow-lg hover:shadow-xl transition-shadow ${
      isCrossBusiness 
        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50'
        : 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50'
    }`}>
      <CardContent className="p-4">
        {/* Header - Batch Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-white px-3 py-1 ${
              isCrossBusiness 
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}>
              <Package className="w-3 h-3 mr-1" />
              משלוח כפול
            </Badge>
            {isCrossBusiness && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                🏪🏪 2 עסקים!
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              isCrossBusiness ? 'text-orange-700' : 'text-purple-700'
            }`}>₪{batch.total_earnings}</p>
            <p className="text-xs text-gray-600">הכנסה כוללת</p>
          </div>
        </div>

        {/* Business Name */}
        <div className={`rounded-lg p-2 mb-3 ${
          isCrossBusiness ? 'bg-orange-100/80' : 'bg-white/80'
        }`}>
          <p className="text-sm font-semibold text-gray-700">
            🏪 {batch.business_name}
          </p>
          {isCrossBusiness && (
            <p className="text-xs text-orange-700 font-medium mt-1">
              💰 הכנסה כפולה ממשני עסקים שונים!
            </p>
          )}
        </div>

        {/* Delivery 1 */}
        <div className="bg-white rounded-lg p-3 mb-2 border-l-4 border-blue-500">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs bg-blue-50">
                  משלוח #1
                </Badge>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ₪{delivery1.payment_amount || 0}
                </Badge>
              </div>
              <h4 className="font-semibold text-gray-900">{delivery1.customer_name}</h4>
              <p className="text-sm text-gray-600">{delivery1.package_description}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700">{delivery1.delivery_address}</p>
          </div>
        </div>

        {/* Distance Between Arrow */}
        <div className="flex items-center justify-center my-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isCrossBusiness ? 'bg-orange-100' : 'bg-purple-100'
          }`}>
            <Navigation2 className={`w-4 h-4 ${
              isCrossBusiness ? 'text-orange-600' : 'text-purple-600'
            }`} />
            <span className={`text-sm font-semibold ${
              isCrossBusiness ? 'text-orange-700' : 'text-purple-700'
            }`}>
              {isCrossBusiness && batch.distance_between_pickups && (
                <span className="ml-1">📍 איסוף: {batch.distance_between_pickups.toFixed(2)} ק"מ • </span>
              )}
              📦 {batch.distance_between_dropoffs.toFixed(2)} ק"מ ביניהם
            </span>
          </div>
        </div>

        {/* Delivery 2 */}
        <div className="bg-white rounded-lg p-3 mb-3 border-l-4 border-green-500">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs bg-green-50">
                  משלוח #2
                </Badge>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ₪{delivery2.payment_amount || 0}
                </Badge>
              </div>
              <h4 className="font-semibold text-gray-900">{delivery2.customer_name}</h4>
              <p className="text-sm text-gray-600">{delivery2.package_description}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700">{delivery2.delivery_address}</p>
          </div>
        </div>

        {/* Accept Button */}
        <Button
          onClick={() => onAccept(batch)}
          disabled={isLoading}
          className={`w-full text-white font-semibold py-6 text-lg shadow-md ${
            isCrossBusiness
              ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מקבל...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isCrossBusiness 
                ? `קבל 2 משלוחים מ-2 עסקים (₪${batch.total_earnings})` 
                : `קבל 2 משלוחים ביחד (₪${batch.total_earnings})`
              }
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

