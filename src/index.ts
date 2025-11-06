import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase with your credentials (you'll add them later)
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// Helper function to call OpenRouter API
async function findMeetingTimes(userAvailability: string[], zipCodes: string[]) {
  // Get current date for reference
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();
  const currentDateStr = `${now.toLocaleString('en-US', { weekday: 'long' })}, ${now.toLocaleString('en-US', { month: 'long' })} ${currentDay}, ${currentYear}`;

  const prompt = `You are an expert meeting scheduling assistant with knowledge of US zip codes and geography. Your task is to analyze availability and zip codes to find meeting times.

CURRENT DATE: ${currentDateStr}
IMPORTANT: All meeting dates must be in the FUTURE (after ${currentDateStr}). Use actual calendar dates.

IMPORTANT: You must FIRST check if:
1. The availability times actually OVERLAP (same day and overlapping time windows)
2. The zip codes are within reasonable distance (travel time <= 30 minutes between them)

User Availability and Locations:
1. User 1 (Zip Code: ${zipCodes[0]}): ${userAvailability[0]}
2. User 2 (Zip Code: ${zipCodes[1]}): ${userAvailability[1]}
3. User 3 (Zip Code: ${zipCodes[2]}): ${userAvailability[2]}

STEP-BY-STEP ANALYSIS REQUIRED (MUST FOLLOW EXACTLY):

STEP 1: Parse each user's availability by day
- User 1: List each day and time range (e.g., Monday: 9am-3pm, Tuesday: 10am-1pm)
- User 2: List each day and time range (e.g., Tuesday: 11:30am-5pm, Friday: 10am-2pm)
- User 3: List each day and time range (e.g., Monday: 10am-2pm, Wednesday: 2pm-5pm)

STEP 2: Find days where ALL 3 users have availability
- Check each day: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- For a day to be valid, ALL 3 users MUST have availability on that day
- If ANY user does NOT have availability on a day, that day is INVALID
- Example: If User 1 has Monday, User 2 has Monday, but User 3 does NOT have Monday, then Monday is INVALID

STEP 3: For each valid day (where all 3 users are available), find overlapping time windows
- For each valid day, list the time ranges for all 3 users
- Find the INTERSECTION (overlap) of all 3 time ranges
- To find overlap: Take the LATEST start time and the EARLIEST end time
- The overlap must be at least 1 hour long
- SPECIAL CASE: If all 3 users have IDENTICAL time ranges, the overlap is the FULL time range (perfect match!)
- Example 1: 
  * User 1: Monday 9am-3pm
  * User 2: Monday 10am-2pm
  * User 3: Monday 10am-2pm
  * Start times: 9am, 10am, 10am → Latest = 10am
  * End times: 3pm, 2pm, 2pm → Earliest = 2pm
  * Overlap: 10am-2pm (4 hours) ✓ VALID

- Example 2 (YOUR EXACT SCENARIO):
  * User 1: Monday 10am-2pm
  * User 2: Monday 11am-3pm
  * User 3: Monday 12pm-4pm
  * Start times: 10am, 11am, 12pm → Latest = 12pm
  * End times: 2pm, 3pm, 4pm → Earliest = 2pm
  * Overlap: 12pm-2pm (2 hours) ✓ VALID - SUGGEST THIS!

- Example 3:
  * User 1: Wednesday 2pm-5pm
  * User 2: Wednesday 1pm-4pm
  * User 3: Wednesday 3pm-6pm
  * Start times: 2pm, 1pm, 3pm → Latest = 3pm
  * End times: 5pm, 4pm, 6pm → Earliest = 4pm
  * Overlap: 3pm-4pm (1 hour) ✓ VALID - SUGGEST THIS!

- Example of NO overlap (times don't intersect):
  * User 1: Monday 9am-10am
  * User 2: Monday 11am-12pm
  * User 3: Monday 1pm-2pm
  * No overlap exists → INVALID

- Example of NO overlap (user missing):
  * User 1: Tuesday 10am-1pm
  * User 2: Tuesday 11:30am-5pm
  * User 3: NO TUESDAY AVAILABILITY
  * Result: Tuesday is INVALID because User 3 has no Tuesday availability ✗

STEP 4: Verify zip code proximity
- Analyze the zip codes: ${zipCodes.join(", ")}
- IMPORTANT: Sequential zip codes (like 12345, 12346, 12347) are USUALLY in the same area and close together
- Determine which city/state each zip code belongs to
- Calculate if they are within 30 minutes travel time of each other
- If zip codes are in the SAME city/area or sequential numbers, they are LIKELY close enough (within 30 min)
- If zip codes are in different cities/states far apart (e.g., 10001 NYC, 90210 LA, 33101 Miami), they are TOO FAR
- Examples of CLOSE zip codes:
  * 12345, 12346, 12347 → Same area, likely within 30 min ✓
  * 10001, 10002, 10003 → All Manhattan, NYC, within 30 min ✓
  * 90210, 90211, 90212 → All Beverly Hills area, within 30 min ✓
- Examples of FAR zip codes:
  * 10001 (NYC), 90210 (LA), 33101 (Miami) → Different cities, too far ✗
  * 02101 (Boston), 60601 (Chicago), 94102 (SF) → Different cities, too far ✗

STEP 5: DETERMINE OPTIMAL MEETING LOCATION
- Analyze the geographic locations of zip codes ${zipCodes.join(", ")}
- Find the CENTRAL zip code that minimizes travel time for all 3 users
- This could be one of the provided zip codes OR a nearby zip code in the same area
- Use your knowledge of US geography to determine the best central location
- The chosen zip code must be within 30 minutes travel time from all 3 users' zip codes

STEP 6: Only suggest meetings if ALL conditions are met:
- ✓ ALL 3 users have availability on the SAME day
- ✓ The time windows OVERLAP (intersect) for all 3 users
- ✓ The overlap is at least 1 hour long
- ✓ Zip codes are within 30 minutes travel time

IMPORTANT REMINDERS:
- If zip codes are sequential (like ${zipCodes.join(", ")}) or in the same city, they are LIKELY close enough
- Do NOT reject meetings just because zip codes are different numbers - check if they're in the same geographic area
- Only reject if zip codes are clearly in different cities/states that are far apart

CRITICAL REQUIREMENTS:
- Find up to 3 meeting date/time options that work for ALL 3 attendees
- ALL 3 users MUST have availability on the SAME day - if any user is missing that day, exclude it
- The time windows MUST OVERLAP for all 3 users on that day
- Maximum travel time per person: 30 minutes (if zip codes are too far apart, return empty array)
- DETERMINE the optimal central zip code location that minimizes travel time for all attendees
- Each meeting should be at least 1 hour long
- Use REAL calendar dates in the future (not past dates like October 2023)

VALIDATION CHECKLIST (verify before suggesting):
For each suggested meeting, confirm:
1. ✓ All 3 users have availability on this day
2. ✓ All 3 users' time ranges overlap on this day
3. ✓ The overlapping window is at least 1 hour
4. ✓ Zip codes are within 30 minutes travel time
5. ✓ Date is in the future

If ANY of these checks fail, DO NOT suggest that meeting time.

Return the results as a JSON array with this EXACT format (use REAL values, not placeholders):
[
  {
    "date": "Day, Month DD, YYYY",
    "time": "HH:MM AM/PM - HH:MM AM/PM",
    "zipCode": "ACTUAL_ZIP_CODE",
    "location": "ACTUAL_CITY_NAME",
    "travelTime": "ACTUAL_TRAVEL_TIME"
  }
]

CRITICAL - USE REAL VALUES (NOT PLACEHOLDERS):
- "date": Use the ACTUAL calendar date from the overlapping availability (must be AFTER ${currentDateStr}, use real dates like "Monday, November 11, ${currentYear}" or "Tuesday, November 12, ${currentYear}")
- "time": Use the ACTUAL overlapping time window (e.g., "10:00 AM - 11:00 AM")
- "zipCode": DETERMINE the optimal central zip code by analyzing the geographic locations of ${zipCodes.join(", ")}
  * Use your knowledge of US zip codes and geography
  * Find the zip code that is most central and minimizes travel time for all 3 users
  * This can be one of the provided zip codes OR a nearby zip code in the same geographic area
  * The zip code must be within 30 minutes travel time from all users
  * Return a REAL 5-digit zip code (e.g., if users are at 10001, 10002, 10003, you might choose 10001 or 10002 as central)
  * If users are at 90210, 90211, 90212, you might choose 90210 or 90211 as central
  * NEVER use placeholder values like "12345"
- "location": Use the ACTUAL city/state name for the chosen zip code (e.g., "New York, NY" for 10001, "Beverly Hills, CA" for 90210, "Miami, FL" for 33101)
- "travelTime": Calculate SPECIFIC travel times based on actual distance (e.g., "10-15 minutes", "15-20 minutes", "20-25 minutes", "25-30 minutes")

EXAMPLES OF CORRECT FORMAT:
If zip codes are 10001, 10002, 10003 (all NYC area):
{
  "date": "Monday, November 11, ${currentYear}",
  "time": "10:00 AM - 11:00 AM",
  "zipCode": "10001",
  "location": "New York, NY",
  "travelTime": "15-20 minutes"
}

If zip codes are 90210, 90211, 90212 (all LA/Beverly Hills area):
{
  "date": "Tuesday, November 12, ${currentYear}",
  "time": "2:00 PM - 3:00 PM",
  "zipCode": "90210",
  "location": "Beverly Hills, CA",
  "travelTime": "10-15 minutes"
}

If zip codes are 10001 (NYC), 10002 (NYC), 10003 (NYC):
- Analyze: All are in Manhattan, NYC
- Optimal zip code: Choose 10001 or 10002 (most central)
- Location: "New York, NY"
- Travel time: "10-15 minutes" (all in same area)

If zip codes are 90210 (Beverly Hills), 90211 (Beverly Hills), 90024 (West LA):
- Analyze: All in Los Angeles area, close together
- Optimal zip code: Choose 90210 or 90024 (most central)
- Location: "Los Angeles, CA" or "Beverly Hills, CA"
- Travel time: "15-20 minutes"

CRITICAL RULES - READ CAREFULLY:
- MANDATORY: Before suggesting ANY meeting, verify that ALL 3 users have availability on that day
- MANDATORY: Calculate the overlap correctly: Latest start time to Earliest end time
- MANDATORY: If the overlap is 1 hour or more, it is VALID and you MUST suggest it
- If User 1 has Monday, User 2 has Monday, but User 3 does NOT have Monday → DO NOT suggest Monday
- If User 1 has Tuesday 10am-1pm, User 2 has Tuesday 11:30am-5pm, but User 3 has NO Tuesday → DO NOT suggest Tuesday
- Only suggest meetings where ALL 3 users have overlapping availability on the SAME day
- IMPORTANT: Even if the overlap is just 1 hour, it is still VALID - suggest it!
- ZIP CODE ANALYSIS:
  * Sequential zip codes (${zipCodes.join(", ")}) are USUALLY in the same area
  * If zip codes are sequential or in the same city, assume they are within 30 minutes
  * Only reject if zip codes are clearly in different major cities (NYC vs LA vs Miami)
  * When in doubt about zip code proximity, assume they are close enough if sequential
- If NO overlapping times exist for all 3 users, return: []
- If zip codes are CLEARLY too far apart (different major cities), return: []
- NEVER use placeholder values like "12345", "City/Area name", or "Estimated travel time"
- ALWAYS use real zip codes (determined by analyzing the geographic locations), real city names, and specific travel times
- Dates must be in the FUTURE (after ${currentDateStr}) - use real calendar dates
- You MUST determine the optimal central zip code by analyzing the geographic locations of the provided zip codes
- The zip code you choose must be a REAL zip code that exists and is central to all users
- Return ONLY valid JSON array, no markdown, no code blocks, no explanations
- If no suitable times are found, return an empty array: []

HOW TO CALCULATE OVERLAP (CRITICAL):
1. List all 3 users' time ranges for the day
2. Find the LATEST start time among all 3 users
3. Find the EARLIEST end time among all 3 users
4. If Latest Start < Earliest End, there IS an overlap
5. The overlap is: Latest Start to Earliest End
6. If the overlap is >= 1 hour, it is VALID - suggest it!

EXAMPLE OF CORRECT VALIDATION (NO OVERLAP):
User 1: Monday 9am-3pm, Tuesday 10am-1pm
User 2: Tuesday 11:30am-5pm, Friday 10am-2pm
User 3: Monday 10am-2pm, Wednesday 2pm-5pm

Analysis:
- Monday: User 1 ✓, User 2 ✗, User 3 ✓ → INVALID (User 2 missing)
- Tuesday: User 1 ✓, User 2 ✓, User 3 ✗ → INVALID (User 3 missing)
- Wednesday: User 1 ✗, User 2 ✗, User 3 ✓ → INVALID (Users 1 & 2 missing)
- Friday: User 1 ✗, User 2 ✓, User 3 ✗ → INVALID (Users 1 & 3 missing)
Result: [] (no valid meetings)

EXAMPLE OF CORRECT OVERLAP (SIMPLE):
User 1: Monday 9am-3pm, Tuesday 10am-1pm
User 2: Monday 10am-2pm, Tuesday 11am-2pm
User 3: Monday 10am-2pm, Tuesday 12pm-3pm

Analysis:
- Monday: All 3 users available
  * User 1: 9am-3pm, User 2: 10am-2pm, User 3: 10am-2pm
  * Latest start: 10am, Earliest end: 2pm
  * Overlap: 10am-2pm (4 hours) → VALID ✓
- Tuesday: All 3 users available
  * User 1: 10am-1pm, User 2: 11am-2pm, User 3: 12pm-3pm
  * Latest start: 12pm, Earliest end: 1pm
  * Overlap: 12pm-1pm (1 hour) → VALID ✓
Result: Can suggest meetings for Monday and Tuesday

EXAMPLE OF CORRECT OVERLAP (COMPLEX - YOUR SCENARIO):
User 1: Monday 10am-2pm, Wednesday 2pm-5pm, Friday 2pm-5pm
User 2: Monday 11am-3pm, Wednesday 1pm-4pm
User 3: Monday 12pm-4pm, Wednesday 3pm-6pm

Analysis:
- Monday: All 3 users available
  * User 1: 10am-2pm, User 2: 11am-3pm, User 3: 12pm-4pm
  * Latest start: 12pm, Earliest end: 2pm
  * Overlap: 12pm-2pm (2 hours) → VALID ✓ SUGGEST THIS!
- Wednesday: All 3 users available
  * User 1: 2pm-5pm, User 2: 1pm-4pm, User 3: 3pm-6pm
  * Latest start: 3pm, Earliest end: 4pm
  * Overlap: 3pm-4pm (1 hour) → VALID ✓ SUGGEST THIS!
- Friday: User 1 ✓, User 2 ✗, User 3 ✗ → INVALID (Users 2 & 3 missing)
Result: Can suggest meetings for Monday (12pm-2pm) and Wednesday (3pm-4pm)

EXAMPLE OF PERFECT OVERLAP (IDENTICAL TIMES):
User 1: Monday 10am-2pm, Wednesday 2pm-5pm | Zip: 12345
User 2: Monday 10am-2pm, Wednesday 2pm-5pm | Zip: 12346
User 3: Monday 10am-2pm, Wednesday 2pm-5pm | Zip: 12347

Analysis:
- Monday: All 3 users available with IDENTICAL times
  * User 1: 10am-2pm, User 2: 10am-2pm, User 3: 10am-2pm
  * Latest start: 10am, Earliest end: 2pm
  * Overlap: 10am-2pm (4 hours) → VALID ✓ SUGGEST THIS!
- Wednesday: All 3 users available with IDENTICAL times
  * User 1: 2pm-5pm, User 2: 2pm-5pm, User 3: 2pm-5pm
  * Latest start: 2pm, Earliest end: 5pm
  * Overlap: 2pm-5pm (3 hours) → VALID ✓ SUGGEST THIS!
- Zip codes 12345, 12346, 12347 are sequential → Same area, within 30 min ✓
- Central zip code: 12346 (middle of the three)
Result: MUST suggest meetings for Monday (10am-2pm) and Wednesday (2pm-5pm)`;

  try {
    // Validate API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }

    console.log("Calling OpenRouter API with prompt...");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini", // Using a cost-effective model
        messages: [
          {
            role: "system",
            content: `You are an expert meeting scheduling assistant. CRITICAL INSTRUCTIONS:
1. You MUST analyze availability and zip codes exactly as described in the prompt
2. Sequential zip codes (like 12345, 12346, 12347) are in the same area and within 30 minutes
3. If all 3 users have the SAME availability times, there IS a perfect overlap - suggest it!
4. Calculate overlaps correctly: Latest start to Earliest end
5. You MUST respond with ONLY valid JSON array format. No markdown, no code blocks, no explanations. Just the JSON array.
6. If conditions are met, you MUST return suggestions. Do not return empty array unless truly no overlap exists.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Scheduling System"
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content || "[]";
    console.log("=== AI RESPONSE DEBUG ===");
    console.log("AI Raw Response (first 500 chars):", aiResponse.substring(0, 500));
    console.log("AI Raw Response (full length):", aiResponse.length, "characters");
    console.log("==========================");
    
    // Parse the JSON response (handle cases where AI adds markdown code blocks)
    let meetingSuggestions;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      
      // Try to extract JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        meetingSuggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing as-is
        meetingSuggestions = JSON.parse(cleanedResponse);
        // If it's an object with a results key, extract it
        if (typeof meetingSuggestions === 'object' && !Array.isArray(meetingSuggestions)) {
          const keys = Object.keys(meetingSuggestions);
          if (keys.length > 0 && Array.isArray(meetingSuggestions[keys[0]])) {
            meetingSuggestions = meetingSuggestions[keys[0]];
          }
        }
      }
    } catch (parseError: any) {
      console.error("Error parsing AI response:", parseError.message);
      console.error("AI Response received:", aiResponse);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate the response structure
    if (!Array.isArray(meetingSuggestions)) {
      console.error("AI response is not an array:", meetingSuggestions);
      return [];
    }

    // Validate each suggestion has required fields and real values (not placeholders)
    const validSuggestions = meetingSuggestions
      .filter((suggestion: any) => {
        const hasRequiredFields = suggestion.date && suggestion.time && suggestion.zipCode;
        if (!hasRequiredFields) {
          console.warn("Invalid suggestion missing required fields:", suggestion);
          return false;
        }
        
        // Check for placeholder values
        const hasPlaceholders = 
          suggestion.zipCode === "12345" ||
          suggestion.location === "City/Area name" ||
          suggestion.travelTime === "Estimated travel time for each person (max 30 min)" ||
          suggestion.travelTime?.toLowerCase().includes("estimated");
        
        if (hasPlaceholders) {
          console.warn("Suggestion contains placeholder values:", suggestion);
          console.warn("AI may not have provided real values. Check the prompt.");
        }
        
        return true;
      })
      .slice(0, 3); // Limit to 3 suggestions

    console.log(`=== PARSING RESULTS ===`);
    console.log(`Total suggestions from AI: ${meetingSuggestions.length}`);
    console.log(`Valid suggestions after filtering: ${validSuggestions.length}`);
    if (validSuggestions.length > 0) {
      console.log("Sample suggestion:", JSON.stringify(validSuggestions[0], null, 2));
    } else if (meetingSuggestions.length > 0) {
      console.log("WARNING: AI returned suggestions but they were filtered out!");
      console.log("First invalid suggestion:", JSON.stringify(meetingSuggestions[0], null, 2));
    } else {
      console.log("AI returned empty array - no suggestions found");
    }
    console.log("========================");
    return validSuggestions;
  } catch (error: any) {
    console.error("OpenRouter API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in .env file");
    } else if (error.response?.status === 429) {
      throw new Error("OpenRouter API rate limit exceeded. Please try again later");
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Request timeout. The AI service is taking too long to respond");
    } else {
      throw new Error(`Failed to get meeting suggestions: ${error.message}`);
    }
  }
}

// Define a route to handle scheduling meetings
app.post("/api/schedule", async (req, res) => {
  try {
    const { userAvailability, zipCodes } = req.body;

    // Validate input - check if fields exist
    if (!userAvailability) {
      return res.status(400).json({ 
        error: "Missing required field: userAvailability",
        details: "Please provide availability for all 3 users"
      });
    }

    if (!Array.isArray(userAvailability)) {
      return res.status(400).json({ 
        error: "Invalid format: userAvailability must be an array",
        details: "Please provide availability as an array of 3 strings"
      });
    }

    if (userAvailability.length !== 3) {
      return res.status(400).json({ 
        error: "Invalid number of users",
        details: `Expected 3 users, but received ${userAvailability.length}. Please provide availability for exactly 3 users.`
      });
    }

    // Check for empty availability strings
    const emptyAvailability = userAvailability.some((avail: string) => !avail || avail.trim() === "");
    if (emptyAvailability) {
      return res.status(400).json({ 
        error: "Empty availability detected",
        details: "Please provide availability for all 3 users. All fields are required."
      });
    }

    if (!zipCodes) {
      return res.status(400).json({ 
        error: "Missing required field: zipCodes",
        details: "Please provide zip codes for all 3 users"
      });
    }

    if (!Array.isArray(zipCodes)) {
      return res.status(400).json({ 
        error: "Invalid format: zipCodes must be an array",
        details: "Please provide zip codes as an array of 3 strings"
      });
    }

    if (zipCodes.length !== 3) {
      return res.status(400).json({ 
        error: "Invalid number of zip codes",
        details: `Expected 3 zip codes, but received ${zipCodes.length}. Please provide exactly 3 zip codes.`
      });
    }

    // Check for empty zip codes
    const emptyZipCodes = zipCodes.some((zip: string) => !zip || zip.trim() === "");
    if (emptyZipCodes) {
      return res.status(400).json({ 
        error: "Empty zip code detected",
        details: "Please provide zip codes for all 3 users. All fields are required."
      });
    }

    console.log("Processing schedule request...");
    console.log("User Availability:", JSON.stringify(userAvailability, null, 2));
    console.log("Zip Codes:", JSON.stringify(zipCodes, null, 2));

    // Call OpenRouter AI to find meeting times
    let meetingSuggestions = [];
    try {
      console.log("Calling AI to find meeting times...");
      meetingSuggestions = await findMeetingTimes(userAvailability, zipCodes);
      console.log("AI returned suggestions:", JSON.stringify(meetingSuggestions, null, 2));
    } catch (aiError: any) {
      console.error("AI Error:", aiError);
      console.error("AI Error Stack:", aiError.stack);
      return res.status(500).json({ 
        error: "AI Service Error",
        details: aiError.message || "Failed to get meeting suggestions from AI",
        suggestion: "Please check your OPENROUTER_API_KEY in the .env file and try again."
      });
    }

    // Save the meeting data to Supabase (non-blocking)
    let savedData = null;
    try {
      const { data, error } = await supabase
        .from("meetings")
        .insert([{ 
          user_availability: userAvailability, 
          zip_codes: zipCodes 
        }])
        .select();

      if (error) {
        console.error("Supabase error (non-critical):", error);
        // Don't fail the request if Supabase fails, still return AI suggestions
      } else {
        savedData = data;
      }
    } catch (dbError: any) {
      console.error("Database error (non-critical):", dbError);
      // Continue even if database save fails
    }

    // Analyze why no suggestions were found (for better error messages)
    let reasonMessage = "";
    if (!meetingSuggestions || meetingSuggestions.length === 0) {
      // Check if there are any common days
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const user1Days = userAvailability[0].match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi) || [];
      const user2Days = userAvailability[1].match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi) || [];
      const user3Days = userAvailability[2].match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi) || [];
      
      const commonDays = days.filter(day => {
        const dayLower = day.toLowerCase();
        return user1Days.some((d: string) => d.toLowerCase() === dayLower) &&
               user2Days.some((d: string) => d.toLowerCase() === dayLower) &&
               user3Days.some((d: string) => d.toLowerCase() === dayLower);
      });
      
      if (commonDays.length === 0) {
        reasonMessage = "No common days found where all 3 users are available. Please ensure at least one day overlaps for all users.";
      } else {
        // Check zip codes - if they're sequential, they're likely close
        const zipNums = zipCodes.map(z => parseInt(z)).filter(z => !isNaN(z));
        const isSequential = zipNums.length === 3 && 
          (Math.max(...zipNums) - Math.min(...zipNums) <= 10);
        
        if (isSequential) {
          reasonMessage = `Found common days (${commonDays.join(", ")}) but the AI could not find overlapping time windows. Please check that the time ranges actually overlap on those days.`;
        } else {
          reasonMessage = `Found common days (${commonDays.join(", ")}) but the zip codes may be too far apart (>30 minutes travel time) or time windows don't overlap. Please verify zip codes are in the same area and times overlap.`;
        }
      }
    }

    // Prepare response - ALWAYS include meetingSuggestions
    const response = {
      success: true,
      savedData: savedData || null,
      meetingSuggestions: meetingSuggestions || [],
      message: meetingSuggestions && meetingSuggestions.length > 0 
        ? `Found ${meetingSuggestions.length} meeting time(s) that work for all attendees`
        : reasonMessage || "No suitable meeting times found. Please check that all users have overlapping availability on the same days and zip codes are within 30 minutes travel time."
    };

    console.log("Final Response:", JSON.stringify(response, null, 2));
    console.log("Response includes meetingSuggestions:", Array.isArray(response.meetingSuggestions));
    console.log("Number of suggestions:", response.meetingSuggestions.length);
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error("Unexpected error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message || "An unexpected error occurred",
      suggestion: "Please check the server logs for more details."
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

