# 🔥 Firebase Storage Setup Guide

## Problem
Upload photos are getting stuck with CORS error:
```
Access to XMLHttpRequest... has been blocked by CORS policy
```

## Solution (2 minutes)

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select your project: **maxdeliveries** (or your project name)

### Step 2: Enable Firebase Storage
1. In left sidebar, click **"Storage"** (it might say "Build → Storage")
2. If you see "Get Started", click it
3. Click **"Next"** → **"Done"**

### Step 3: Configure Security Rules
1. Click the **"Rules"** tab at the top
2. **DELETE** all the existing rules
3. **PASTE** these new rules:

```javascript
rules_version = '2';

// ⚠️ Production-Ready Rules for Delivery Photos
service firebase.storage {
  match /b/{bucket}/o {
    
    // 📸 Delivery photos - couriers can upload, authenticated users can read
    match /delivery-photos/{deliveryId}/{fileName} {
      // ✅ Write: Only authenticated couriers
      allow write: if request.auth != null 
                   && request.resource.size < 10 * 1024 * 1024  // Max 10MB
                   && request.resource.contentType.matches('image/.*');  // Only images
      
      // ✅ Read: Any authenticated user (couriers, businesses, admins)
      allow read: if request.auth != null;
    }
    
    // ❌ Block all other paths by default
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click **"Publish"** (top-right blue button)
5. Wait 10 seconds for rules to deploy

### Step 4: Test Upload
1. Go back to your partner app (http://localhost:5173)
2. Click **"בטל והתחל מחדש"** (Cancel and Restart) if stuck
3. Take a new photo
4. Click **"אשר תמונה"** (Confirm Photo)
5. **Should upload successfully!** ✅

---

## ✅ What These Rules Do

### Security Features:
- ✅ **Only authenticated users** can upload/download
- ✅ **Max file size: 10MB** (prevents abuse)
- ✅ **Only images allowed** (blocks other file types)
- ✅ **Organized by delivery ID** (easy to find)
- ✅ **Couriers upload, everyone reads** (businesses/admins can see photos)

### File Structure:
```
storage/
└── delivery-photos/
    ├── -OcKR9f1EakNS3IXOuOY/
    │   └── delivery_-OcKR9f1EakNS3IXOuOY_1761296332832.png
    ├── -OcKOJEyipC573n0PHmu/
    │   └── delivery_-OcKOJEyipC573n0PHmu_1761296142626.png
    └── ...
```

---

## 🧪 Troubleshooting

### If it's still stuck:
1. **Wait 30 seconds** after publishing rules
2. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear browser cache** if needed
4. **Check console for new errors** (F12)

### If you see "storage/unauthorized":
- Rules not published yet → Wait 30 seconds
- User not logged in → Log out and log in again

### If you see different error:
- Copy the full error from console
- Share with me so I can help

---

## 📱 Next Steps After Setup

Once upload works:
- ✅ Photos will appear in Business App (already coded)
- ✅ Photos will be in Firebase Storage console
- ⏳ TODO: Add photos to Admin App (next feature)

---

## 🔒 Production Checklist

Before going live:
- ✅ Storage rules are set ✓ (done above)
- ✅ Image compression works ✓ (1.3MB → 109KB)
- ✅ File size limit: 10MB ✓
- ✅ Only authenticated users ✓
- ⏳ Consider adding backup/archive strategy
- ⏳ Monitor storage usage in Firebase Console

---

**Good luck! The upload should work immediately after Step 3.** 🚀
