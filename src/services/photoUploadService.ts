import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/api/config/firebase.config';

/**
 * Upload delivery proof photo to Firebase Storage
 * @param file - The image file to upload
 * @param deliveryId - The delivery ID for organizing photos
 * @param courierId - The courier ID who took the photo
 * @returns URL of the uploaded photo
 */
export async function uploadDeliveryPhoto(
  file: File,
  deliveryId: string,
  courierId: string
): Promise<string> {
  try {
    // ✅ Check if storage is available
    if (!storage) {
      console.error('❌ [PhotoUpload] Firebase Storage not initialized!');
      throw new Error('Firebase Storage לא מוגדר. בדוק את ההגדרות.');
    }

    console.log('📸 [PhotoUpload] Starting upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      deliveryId,
      courierId,
      storageAvailable: !!storage
    });

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `delivery_${deliveryId}_${timestamp}.${fileExtension}`;
    
    console.log('📸 [PhotoUpload] Creating storage reference:', `delivery-photos/${deliveryId}/${fileName}`);
    
    // Create storage reference: delivery-photos/{deliveryId}/{fileName}
    const photoRef = storageRef(storage, `delivery-photos/${deliveryId}/${fileName}`);
    
    console.log('📸 [PhotoUpload] Storage reference created:', photoRef.fullPath);

    // Add metadata
    const metadata = {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        deliveryId,
        courierId,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'courier'
      }
    };

    // Upload file
    console.log('📸 [PhotoUpload] Starting uploadBytes...');
    console.log('📸 [PhotoUpload] File blob size:', file.size, 'bytes');
    
    const snapshot = await uploadBytes(photoRef, file, metadata);
    
    console.log('✅ [PhotoUpload] Upload successful!', {
      fullPath: snapshot.metadata.fullPath,
      size: snapshot.metadata.size,
      contentType: snapshot.metadata.contentType
    });

    // Get download URL
    console.log('📸 [PhotoUpload] Getting download URL...');
    const downloadURL = await getDownloadURL(photoRef);
    
    console.log('✅ [PhotoUpload] Download URL generated:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ [PhotoUpload] Upload failed:', error);
    console.error('❌ [PhotoUpload] Error code:', error.code);
    console.error('❌ [PhotoUpload] Error message:', error.message);
    console.error('❌ [PhotoUpload] Full error:', JSON.stringify(error, null, 2));
    
    // Provide specific error messages
    if (error.code === 'storage/unauthorized') {
      throw new Error('⚠️ Firebase Storage לא מוגדר!\n\nנדרש להגדיר הרשאות ב-Firebase Console.\n\nראה: FIREBASE_STORAGE_SETUP.md');
    } else if (error.code === 'storage/unauthenticated') {
      throw new Error('⚠️ לא מחובר!\n\nהתנתק והתחבר מחדש.');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('⚠️ בעיית רשת!\n\nבדוק חיבור לאינטרנט ונסה שוב.');
    } else {
      throw new Error(`שגיאה: ${error.message || 'אנא נסה שוב'}`);
    }
  }
}

/**
 * Compress image before upload to save bandwidth
 * @param file - Original image file
 * @param maxWidth - Maximum width in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            console.log('📸 [Compression] Original:', file.size, 'bytes → Compressed:', compressedFile.size, 'bytes');
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

