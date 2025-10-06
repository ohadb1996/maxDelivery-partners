export type CountryCode = "IL" | "US" | "FR";

interface PhoneValidationResult {
  isValid: boolean;
  internationalFormat: string;
  error?: string;
}

// נתוני מדינות
export const countryData: Record<
  CountryCode,
  { name: string; prefix: string; flag: string }
> = {
  IL: { name: "IL", prefix: "+972", flag: "🇮🇱" },
  US: { name: "US", prefix: "+1", flag: "🇺🇸" },
  FR: { name: "FR", prefix: "+33", flag: "🇫🇷" }
};

// אימות טלפון
export function validatePhoneNumber(phone: string, country: CountryCode): PhoneValidationResult {
  const countryInfo = countryData[country];
  let error = '';
  let isValid = true;

  // בדיקות כלליות
  if (phone.length === 0) {
    return {
      isValid: false,
      internationalFormat: '',
      error: 'נא להזין מספר טלפון'
    };
  }

  if (!/^\d+$/.test(phone)) {
    return {
      isValid: false,
      internationalFormat: '',
      error: 'מספר טלפון יכול להכיל ספרות בלבד'
    };
  }

  // בדיקות ספציפיות למדינה
  switch(country) {
    case 'IL': // ישראל
      if (phone.length !== 9) {
        error = 'מספר טלפון ישראלי חייב להכיל בדיוק 9 ספרות (לדוגמה: 0521234567)';
        isValid = false;
      } else if (!phone.startsWith('5')) {
        error = 'מספר טלפון ישראלי חייב להתחיל ב-5 (לדוגמה: 0521234567)';
        isValid = false;
      }
      break;

    case 'US': // ארה"ב
      if (phone.length !== 10) {
        error = 'מספר טלפון אמריקאי חייב להכיל 10 ספרות';
        isValid = false;
      } else if (!phone.match(/^[2-9]\d{2}[2-9]\d{6}$/)) {
        error = 'פורמט מספר טלפון אמריקאי לא תקין';
        isValid = false;
      }
      break;

    case 'FR': // צרפת
      if (phone.length !== 9) {
        error = 'מספר טלפון צרפתי חייב להכיל 9 ספרות';
        isValid = false;
      } else if (!phone.match(/^[67]\d{8}$/)) {
        error = 'מספר טלפון צרפתי חייב להתחיל ב-6 או 7';
        isValid = false;
      }
      break;
  }

  return {
    isValid,
    internationalFormat: isValid ? `${countryInfo.prefix}${phone}` : '',
    error: isValid ? undefined : error
  };
}
