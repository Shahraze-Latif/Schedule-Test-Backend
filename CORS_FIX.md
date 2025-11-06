# CORS Fix for Deployment

## ✅ Changes Made

### Updated CORS Configuration
**File:** `backend/src/index.ts`

**Changes:**
1. Simplified CORS origin checking logic
2. Explicitly allows all `vercel.app` domains
3. Added explicit OPTIONS handler for preflight requests
4. Added proper methods and headers configuration

### Key Improvements:
- ✅ All Vercel domains are now allowed (including preview deployments)
- ✅ Explicit OPTIONS request handling for CORS preflight
- ✅ Proper methods and headers configuration
- ✅ Better error handling and logging

## 🔧 Railway Environment Variables

Make sure you have set in Railway:

```
FRONTEND_URL=https://schedule-test-frontend.vercel.app
```

**Note:** Even though the code now allows all Vercel domains, it's good practice to set `FRONTEND_URL` for reference.

## 🚀 Deployment Steps

1. **Commit and push the changes:**
   ```bash
   cd backend
   git add .
   git commit -m "Fix CORS configuration for Vercel deployment"
   git push origin main
   ```

2. **Railway will automatically redeploy** (if auto-deploy is enabled)

3. **Verify the fix:**
   - Visit your frontend: `https://schedule-test-frontend.vercel.app`
   - Try submitting the form
   - Check browser console - CORS errors should be gone

## 🐛 If Still Having Issues

1. **Check Railway logs:**
   - Go to Railway dashboard → Your project → Deployments → View logs
   - Look for any CORS-related errors

2. **Verify environment variables:**
   - Make sure `FRONTEND_URL` is set in Railway
   - Check that all other required variables are set

3. **Test backend directly:**
   ```bash
   curl -X OPTIONS https://schedule-test-backend-production.up.railway.app/api/schedule \
     -H "Origin: https://schedule-test-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```
   Should return `Access-Control-Allow-Origin` header

4. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache completely

## ✅ Expected Behavior

After deployment:
- ✅ Frontend can make requests to backend
- ✅ No CORS errors in browser console
- ✅ Preflight OPTIONS requests succeed
- ✅ POST requests to `/api/schedule` work correctly

