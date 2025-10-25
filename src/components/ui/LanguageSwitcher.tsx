import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
      <button
        onClick={() => setLanguage('he')}
        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
          language === 'he'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        IL עברית
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
          language === 'en'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-600 hover:bg-white'
        }`}
      >
        US English
      </button>
    </div>
  );
}


