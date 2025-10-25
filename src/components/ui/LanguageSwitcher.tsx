import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1 border border-gray-200">
      <Globe className="w-4 h-4 text-gray-500 ml-2" />
      <button
        onClick={() => setLanguage('he')}
        className={`px-3 py-1 rounded transition-all text-sm font-medium ${
          language === 'he'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇮🇱 עברית
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded transition-all text-sm font-medium ${
          language === 'en'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇺🇸 English
      </button>
    </div>
  );
}


