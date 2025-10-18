import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onMonthChange: (year: number, month: number) => void;
  availableMonths?: { year: number; month: number; displayName: string }[];
}

export default function MonthSelector({ 
  selectedMonth, 
  selectedYear, 
  onMonthChange
  // availableMonths - לא בשימוש כרגע, שמור לעתיד
}: MonthSelectorProps) {
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange(selectedYear - 1, 11);
    } else {
      onMonthChange(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // לא ניתן לעבור לחודש עתידי
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return;
    }
    
    if (selectedMonth === 11) {
      onMonthChange(selectedYear + 1, 0);
    } else {
      onMonthChange(selectedYear, selectedMonth + 1);
    }
  };

  const isNextDisabled = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  };

  const isPrevDisabled = () => {
    // אפשר להגביל לשנה אחורה או פחות
    const oldestYear = new Date().getFullYear() - 2;
    return selectedYear <= oldestYear && selectedMonth === 0;
  };

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
      <Button
        onClick={handleNextMonth}
        disabled={isNextDisabled()}
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
      >
        <ChevronRight className="w-5 h-5" />
        
      </Button>

      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">
          {monthNames[selectedMonth]} {selectedYear}
        </span>
      </div>

      <Button
        onClick={handlePrevMonth}
        disabled={isPrevDisabled()}
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
    </div>
  );
}

