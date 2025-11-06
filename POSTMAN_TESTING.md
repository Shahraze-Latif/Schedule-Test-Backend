# Postman Testing Guide

This guide will help you test the Scheduling System API using Postman.

## 📦 Importing the Collection

### Option 1: Import Collection File
1. Open Postman
2. Click **Import** button (top left)
3. Select `postman_collection.json`
4. Click **Import**

### Option 2: Import Environment (Optional)
1. Open Postman
2. Click **Import** button
3. Select `postman_environment.json`
4. Click **Import**
5. Select the environment from the dropdown (top right)

## 🚀 Prerequisites

Before testing, make sure:

1. **Backend server is running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Environment variables are set** in `backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `OPENROUTER_API_KEY`

3. **Database is set up:**
   - Run the SQL script in `database/setup.sql` in your Supabase dashboard

## 📋 Available Requests

### 1. Schedule Meeting (Default)
- **Method:** POST
- **URL:** `http://localhost:5000/api/schedule`
- **Description:** Basic request with sample data

### 2. Schedule Meeting - Example 1
- **Method:** POST
- **URL:** `http://localhost:5000/api/schedule`
- **Description:** Example with overlapping availability times

### 3. Schedule Meeting - Example 2
- **Method:** POST
- **URL:** `http://localhost:5000/api/schedule`
- **Description:** Example with Monday and Wednesday availability

### 4. Schedule Meeting - Error Case
- **Method:** POST
- **URL:** `http://localhost:5000/api/schedule`
- **Description:** Tests error handling with missing data (should return 400)

## 📝 Request Body Format

All requests use the following JSON structure:

```json
{
  "userAvailability": [
    "Monday 9am-5pm, Tuesday 10am-3pm",
    "Tuesday 11am-5pm, Friday 10am-2pm",
    "Monday 8am-12pm, Friday 11am-2pm"
  ],
  "zipCodes": [
    "10001",
    "10002",
    "10003"
  ]
}
```

### Required Fields:
- `userAvailability`: Array of exactly 3 strings (one for each user)
- `zipCodes`: Array of exactly 3 strings (one zip code per user)

## ✅ Expected Response

### Success Response (200 OK):
```json
{
  "success": true,
  "savedData": [
    {
      "id": "uuid-here",
      "user_availability": [...],
      "zip_codes": [...],
      "created_at": "2025-11-06T20:00:00.000Z",
      "updated_at": "2025-11-06T20:00:00.000Z"
    }
  ],
  "meetingSuggestions": [
    {
      "date": "Monday, November 11, 2025",
      "time": "10:00 AM - 11:00 AM",
      "location": "Central location based on zip codes",
      "travelTime": "Up to 30 minutes per person"
    }
  ],
  "message": "Found 3 meeting time(s) that work for all attendees"
}
```

### Error Response (400 Bad Request):
```json
{
  "error": "Please provide availability for all 3 users"
}
```

### Error Response (500 Internal Server Error):
```json
{
  "error": "Failed to get meeting suggestions from AI"
}
```

## 🧪 Testing Scenarios

### Test Case 1: Valid Request
1. Use "Schedule Meeting - Example 1"
2. Click **Send**
3. **Expected:** 200 OK with meeting suggestions

### Test Case 2: Missing Data
1. Use "Schedule Meeting - Error Case"
2. Click **Send**
3. **Expected:** 400 Bad Request with error message

### Test Case 3: No Overlapping Times
1. Create a new request with non-overlapping availability
2. **Expected:** 200 OK with empty `meetingSuggestions` array

### Test Case 4: Invalid Zip Codes
1. Test with invalid zip code formats
2. **Expected:** AI will still process but may return fewer suggestions

## 🔧 Customizing Requests

You can modify the request body in Postman:

1. Select a request
2. Go to **Body** tab
3. Select **raw** and **JSON**
4. Edit the JSON as needed
5. Click **Send**

## 📊 Response Validation

Check the response for:
- ✅ Status code: 200 for success, 400/500 for errors
- ✅ `success`: Should be `true` for successful requests
- ✅ `meetingSuggestions`: Array with up to 3 suggestions
- ✅ Each suggestion should have: `date`, `time`, `location`, `travelTime`
- ✅ `savedData`: Should contain the saved database record

## 🐛 Troubleshooting

### Issue: Connection Refused
- **Solution:** Make sure the backend server is running on port 5000

### Issue: 500 Error - "Failed to get meeting suggestions from AI"
- **Solution:** Check that `OPENROUTER_API_KEY` is set correctly in `.env`

### Issue: 500 Error - "Could not find the table 'public.meetings'"
- **Solution:** Run the SQL script in `database/setup.sql` in Supabase

### Issue: Empty meetingSuggestions array
- **Solution:** This is normal if no overlapping times are found. Try different availability times.

## 📚 Additional Resources

- Backend API code: `backend/src/index.ts`
- Database setup: `database/setup.sql`
- Environment setup: `DATABASE_SETUP.md`

