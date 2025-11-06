# Postman Testing Guide - Complete Error Handling

This guide covers all test cases for the Scheduling System API, including error handling scenarios.

## 📦 Importing the Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select `postman_collection.json`
4. Click **Import**

## 🧪 Test Cases Overview

### ✅ Valid Requests (3 tests)
These should return **200 OK** with meeting suggestions:

1. **Valid Request - Example 1**: Basic valid request
2. **Valid Request - Example 2**: Different zip codes
3. **Valid Request - Same Day Overlap**: Clear overlapping times

**Expected Response:**
```json
{
  "success": true,
  "savedData": [...],
  "meetingSuggestions": [
    {
      "date": "Monday, November 11, 2025",
      "time": "10:00 AM - 11:00 AM",
      "zipCode": "10001",
      "location": "New York, NY",
      "travelTime": "Up to 30 minutes per person"
    }
  ],
  "message": "Found 3 meeting time(s) that work for all attendees"
}
```

### ❌ Error Cases - Missing Fields (3 tests)
These should return **400 Bad Request**:

1. **Missing userAvailability**: Only zipCodes provided
2. **Missing zipCodes**: Only userAvailability provided
3. **Empty Body**: No fields provided

**Expected Response:**
```json
{
  "error": "Missing required field: userAvailability",
  "details": "Please provide availability for all 3 users"
}
```

### ❌ Error Cases - Invalid Format (2 tests)
These should return **400 Bad Request**:

1. **userAvailability Not Array**: String instead of array
2. **zipCodes Not Array**: String instead of array

**Expected Response:**
```json
{
  "error": "Invalid format: userAvailability must be an array",
  "details": "Please provide availability as an array of 3 strings"
}
```

### ❌ Error Cases - Wrong Count (4 tests)
These should return **400 Bad Request**:

1. **Only 1 User**: Only 1 user provided
2. **Only 2 Users**: Only 2 users provided
3. **4 Users (Too Many)**: 4 users provided
4. **Mismatched Counts**: 3 users but 2 zip codes

**Expected Response:**
```json
{
  "error": "Invalid number of users",
  "details": "Expected 3 users, but received 1. Please provide availability for exactly 3 users."
}
```

### ❌ Error Cases - Empty Values (3 tests)
These should return **400 Bad Request**:

1. **Empty Availability String**: One empty string in array
2. **Empty Zip Code String**: One empty zip code
3. **Whitespace Only Values**: Only whitespace characters

**Expected Response:**
```json
{
  "error": "Empty availability detected",
  "details": "Please provide availability for all 3 users. All fields are required."
}
```

### ⚠️ Edge Cases (2 tests)
These should return **200 OK** but may have empty results:

1. **No Overlapping Times**: Times don't overlap
2. **Very Far Zip Codes**: Zip codes too far apart (>30 min travel)

**Expected Response (No Overlap):**
```json
{
  "success": true,
  "savedData": [...],
  "meetingSuggestions": [],
  "message": "No suitable meeting times found. The AI could not find overlapping availability that meets the 30-minute travel time requirement. Please try adjusting the availability times or zip codes."
}
```

## 🔍 Testing Checklist

### Before Testing
- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] `OPENROUTER_API_KEY` is set in `backend/.env`
- [ ] `SUPABASE_URL` and `SUPABASE_KEY` are set in `backend/.env`
- [ ] Database table is created (run `database/setup.sql`)

### Valid Request Tests
- [ ] Valid Request - Example 1 returns 200 OK
- [ ] Response contains `meetingSuggestions` array
- [ ] Each suggestion has `date`, `time`, `zipCode`, `location`, `travelTime`
- [ ] `zipCode` is displayed prominently

### Missing Fields Tests
- [ ] Missing userAvailability returns 400
- [ ] Missing zipCodes returns 400
- [ ] Empty body returns 400
- [ ] Error messages are clear and helpful

### Invalid Format Tests
- [ ] userAvailability as string returns 400
- [ ] zipCodes as string returns 400
- [ ] Error messages specify the issue

### Wrong Count Tests
- [ ] 1 user returns 400
- [ ] 2 users returns 400
- [ ] 4 users returns 400
- [ ] Mismatched counts return 400
- [ ] Error messages show expected vs received count

### Empty Values Tests
- [ ] Empty string in availability returns 400
- [ ] Empty string in zip codes returns 400
- [ ] Whitespace-only values return 400

### Edge Cases
- [ ] No overlapping times returns 200 with empty array
- [ ] Very far zip codes may return empty array
- [ ] Appropriate message shown when no results

## 📊 Response Validation

### Success Response (200 OK)
Check for:
- ✅ `success: true`
- ✅ `meetingSuggestions`: Array (may be empty)
- ✅ `savedData`: Database record (may be null if DB fails)
- ✅ `message`: Descriptive message
- ✅ Each suggestion has: `date`, `time`, `zipCode`, `location`, `travelTime`

### Error Response (400 Bad Request)
Check for:
- ✅ `error`: Error type
- ✅ `details`: Specific error message
- ✅ Status code: 400

### Server Error (500 Internal Server Error)
Check for:
- ✅ `error`: Error type
- ✅ `details`: Error message
- ✅ `suggestion`: Helpful suggestion (if applicable)
- ✅ Status code: 500

## 🐛 Common Issues

### Issue: All requests return 500
**Solution:** Check that `OPENROUTER_API_KEY` is set correctly in `.env`

### Issue: Valid requests return empty meetingSuggestions
**Possible causes:**
- No overlapping availability times
- Zip codes too far apart (>30 min travel)
- AI couldn't find suitable times

**Solution:** Try with clearly overlapping times and nearby zip codes

### Issue: Database errors but API still works
**Note:** This is expected! The API will still return AI suggestions even if database save fails (non-critical).

## 📝 Notes

- All error responses include both `error` and `details` fields for clarity
- Database errors are non-critical - API will still return AI suggestions
- Empty `meetingSuggestions` array is valid if no suitable times are found
- The AI may take 5-15 seconds to respond (30 second timeout)

## 🚀 Quick Test Sequence

1. Start with **Valid Request - Example 1** (should work)
2. Test **Missing userAvailability** (should return 400)
3. Test **Only 1 User** (should return 400)
4. Test **Empty Availability String** (should return 400)
5. Test **No Overlapping Times** (should return 200 with empty array)

This sequence tests the most common scenarios quickly.

