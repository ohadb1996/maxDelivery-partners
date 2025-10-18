import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DailyStats } from '@/services/deliveryService';

interface MonthlyDeliveriesChartProps {
  data: DailyStats[];
  title: string;
}

export default function MonthlyDeliveriesChart({ data, title }: MonthlyDeliveriesChartProps) {
  // סינון רק ימים שיש בהם משלוחים (או הצגת כולם - תלוי בהעדפה)
  const filteredData = data.filter(d => d.deliveryCount > 0);
  
  // אם אין נתונים
  if (filteredData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        <p>אין משלוחים בחודש זה</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={filteredData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="day" 
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            label={{ value: 'יום בחודש', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
          />
          <YAxis 
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              direction: 'rtl',
              textAlign: 'right'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'deliveryCount') return [value, 'משלוחים'];
              if (name === 'earnings') return [`₪${value.toFixed(2)}`, 'הכנסות'];
              return [value, name];
            }}
            labelFormatter={(label) => `יום ${label}`}
          />
          <Legend 
            wrapperStyle={{ direction: 'rtl', textAlign: 'right' }}
            formatter={(value) => {
              if (value === 'deliveryCount') return 'משלוחים';
              if (value === 'earnings') return 'הכנסות (₪)';
              return value;
            }}
          />
          <Bar 
            dataKey="deliveryCount" 
            fill="#3b82f6" 
            radius={[8, 8, 0, 0]}
            name="deliveryCount"
          />
          <Bar 
            dataKey="earnings" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="earnings"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


