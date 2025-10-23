import { ref, update } from 'firebase/database';
import { db } from '@/api/config/firebase.config';

/**
 * 📍 GPS Location Tracking Service
 * 
 * שירות זה אחראי על:
 * 1. מעקב אחר מיקום השליח בזמן אמת
 * 2. שמירת המיקום ל-Firebase
 * 3. ניהול הרשאות שיתוף מיקום
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdated: string;
}

class LocationTrackingService {
  private watchId: number | null = null;
  private userId: string | null = null;
  private isTracking: boolean = false;
  private updateIntervalMs: number = 30000; // עדכון כל 30 שניות
  private periodicUpdateTimer: NodeJS.Timeout | null = null; // טיימר לעדכון תקופתי

  /**
   * התחל מעקב אחר מיקום השליח
   * @param userId - ID של השליח
   * @param enableSharing - האם לאפשר שיתוף מיקום
   */
  async startTracking(userId: string, enableSharing: boolean = true): Promise<boolean> {
    console.log('📍 [LocationService] Starting location tracking for user:', userId);

    this.userId = userId;
    this.isTracking = true;

    // בדוק אם הדפדפן תומך ב-Geolocation
    if (!navigator.geolocation) {
      console.error('❌ [LocationService] Geolocation is not supported by this browser');
      return false;
    }

    try {
      // בקש הרשאה ומיקום ראשוני
      await this.updateLocationOnce();

      // התחל מעקב רציף עם watchPosition (מעדכן כשיש תנועה)
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true, // דיוק גבוה (משתמש ב-GPS)
          timeout: 10000, // timeout של 10 שניות
          maximumAge: 5000, // אל תשתמש במיקום ישן יותר מ-5 שניות
        }
      );

      // התחל גם עדכון תקופתי (כל 30 שניות) - גם אם אין תנועה!
      this.startPeriodicUpdates();

      // עדכן סטטוס שיתוף מיקום
      await this.updateLocationSharingStatus(enableSharing);

      console.log('✅ [LocationService] Location tracking started successfully (with periodic updates)');
      return true;
    } catch (error) {
      console.error('❌ [LocationService] Failed to start tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * עצור מעקב אחר מיקום
   */
  stopTracking(): void {
    console.log('📍 [LocationService] Stopping location tracking');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // עצור גם את העדכון התקופתי
    this.stopPeriodicUpdates();

    this.isTracking = false;

    // המיקום יישאר ב-DB כדי שהאדמין יוכל לראות את המיקום האחרון
    // אם רוצים למחוק, ניתן לקרוא ל-clearLocationFromDB()
  }

  /**
   * קבל מיקום נוכחי פעם אחת
   */
  private async updateLocationOnce(): Promise<void> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.handleLocationUpdate(position);
          resolve();
        },
        (error) => {
          this.handleLocationError(error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * התחל עדכונים תקופתיים (כל 30 שניות גם אם אין תנועה)
   */
  private startPeriodicUpdates(): void {
    // נקה טיימר קיים אם יש
    this.stopPeriodicUpdates();

    console.log('📍 [LocationService] Starting periodic location updates (every 30 seconds)');
    
    this.periodicUpdateTimer = setInterval(() => {
      if (this.isTracking) {
        console.log('⏰ [LocationService] Periodic update triggered');
        this.forceLocationUpdate();
      }
    }, this.updateIntervalMs);
  }

  /**
   * עצור עדכונים תקופתיים
   */
  private stopPeriodicUpdates(): void {
    if (this.periodicUpdateTimer !== null) {
      clearInterval(this.periodicUpdateTimer);
      this.periodicUpdateTimer = null;
      console.log('📍 [LocationService] Stopped periodic updates');
    }
  }

  /**
   * אלץ עדכון מיקום (קורא ל-getCurrentPosition)
   */
  private forceLocationUpdate(): void {
    if (!navigator.geolocation || !this.isTracking || !this.userId) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          lastUpdated: new Date().toISOString(),
        };

        console.log('📍 [LocationService] Location updated (periodic):', {
          lat: locationData.latitude.toFixed(6),
          lng: locationData.longitude.toFixed(6),
          accuracy: locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'unknown',
        });

        this.saveLocationToDB(locationData);
      },
      (error) => this.handleLocationError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // תמיד קבל מיקום חדש
      }
    );
  }

  /**
   * טיפול בעדכון מיקום חדש (מ-watchPosition)
   */
  private async handleLocationUpdate(position: GeolocationPosition): Promise<void> {
    if (!this.isTracking || !this.userId) {
      return;
    }

    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      lastUpdated: new Date().toISOString(),
    };

    console.log('📍 [LocationService] Location updated (movement detected):', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      accuracy: locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'unknown',
    });

    await this.saveLocationToDB(locationData);
  }

  /**
   * טיפול בשגיאת מיקום
   */
  private async handleLocationError(error: GeolocationPositionError): Promise<void> {
    console.error('❌ [LocationService] Location error:', {
      code: error.code,
      message: error.message,
    });

    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.log('⚠️ [LocationService] User denied location permission');
        this.updateLocationSharingStatus(false);
        break;
      case error.POSITION_UNAVAILABLE:
        console.log('⚠️ [LocationService] Location unavailable (no GPS on this device)');
        console.log('📍 [LocationService] Using fallback location (Tel Aviv center)');
        // במחשבים שאין להם GPS - השתמש במיקום ברירת מחדל
        await this.useFallbackLocation();
        break;
      case error.TIMEOUT:
        console.log('⚠️ [LocationService] Location request timed out');
        console.log('📍 [LocationService] Using fallback location (Tel Aviv center)');
        await this.useFallbackLocation();
        break;
    }
  }

  /**
   * השתמש במיקום fallback (תל אביב מרכז) - למחשבים ללא GPS
   */
  private async useFallbackLocation(): Promise<void> {
    if (!this.userId) return;

    const fallbackLocation: LocationData = {
      latitude: 32.0853, // תל אביב מרכז
      longitude: 34.7818,
      accuracy: 1000, // דיוק נמוך - 1 ק"מ
      lastUpdated: new Date().toISOString(),
    };

    console.log('📍 [LocationService] Using fallback location:', fallbackLocation);
    await this.saveLocationToDB(fallbackLocation);
    await this.updateLocationSharingStatus(true);
  }

  /**
   * שמור מיקום ל-Firebase
   */
  private async saveLocationToDB(locationData: LocationData): Promise<void> {
    if (!this.userId) {
      console.error('❌ [LocationService] No user ID set');
      return;
    }

    try {
      const courierRef = ref(db, `Couriers/${this.userId}`);
      await update(courierRef, {
        location: locationData,
      });

      console.log('✅ [LocationService] Location saved to Firebase');
    } catch (error) {
      console.error('❌ [LocationService] Failed to save location:', error);
    }
  }

  /**
   * עדכן סטטוס שיתוף מיקום
   */
  private async updateLocationSharingStatus(enabled: boolean): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      const courierRef = ref(db, `Couriers/${this.userId}`);
      await update(courierRef, {
        locationSharingEnabled: enabled,
      });

      console.log(`✅ [LocationService] Location sharing ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ [LocationService] Failed to update sharing status:', error);
    }
  }

  /**
   * נקה מיקום מה-DB (למקרה שרוצים למחוק כשהשליח לא זמין)
   * כרגע לא בשימוש - המיקום נשאר ב-DB גם כשהשליח לא זמין
   */
  async clearLocationFromDB(): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      const courierRef = ref(db, `Couriers/${this.userId}`);
      await update(courierRef, {
        location: null,
        locationSharingEnabled: false,
      });

      console.log('✅ [LocationService] Location cleared from Firebase');
    } catch (error) {
      console.error('❌ [LocationService] Failed to clear location:', error);
    }
  }

  /**
   * בדוק אם המעקב פעיל
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }
}

// יצירת instance יחיד של השירות (Singleton)
export const locationService = new LocationTrackingService();

