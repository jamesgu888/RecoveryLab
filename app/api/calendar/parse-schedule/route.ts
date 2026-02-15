import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedExercise {
  title: string;
  sets?: number;
  reps?: number;
  duration_minutes?: number;
  frequency: "daily" | "weekly" | "custom";
  days_per_week?: number;
  specific_days?: string[];
  preferred_time?: string;
  instructions?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, schedule_text } = await request.json();

    if (!user_id || !schedule_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use Claude to parse the schedule into structured data
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a physical therapy schedule parser. Parse exercise schedules into structured JSON.

For each exercise, extract:
- title: Exercise name
- sets: Number of sets (if mentioned)
- reps: Number of repetitions (if mentioned)
- duration_minutes: Duration in minutes (if mentioned)
- frequency: "daily" or "weekly" or "custom"
- days_per_week: Number (if weekly frequency, e.g., "3x per week" = 3)
- specific_days: Array of day names if specific days mentioned (e.g., ["Monday", "Wednesday", "Friday"])
- preferred_time: Time string (e.g., "9:00 AM", "afternoon", "evening")
- instructions: Any special instructions

Respond with ONLY a JSON object with an "exercises" array. No other text.

Schedule text:
${schedule_text}`,
        },
      ],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    let parsedData: { exercises?: ParsedExercise[] } = {};
    
    try {
      parsedData = JSON.parse(content);
    } catch {
      // If parsing fails, try to extract JSON from the response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    const exercises = parsedData.exercises || [];

    if (exercises.length === 0) {
      return NextResponse.json(
        { success: false, error: "No exercises could be parsed" },
        { status: 400 }
      );
    }

    // Add exercises to calendar
    const userRef = adminDb.collection("users").doc(user_id);
    const calendarRef = userRef.collection("calendar");

    const batch = adminDb.batch();
    const today = new Date();
    const eventsCreated: any[] = [];

    for (const exercise of exercises) {
      // Create recurring events based on frequency
      if (exercise.frequency === "daily") {
        // Create events for next 30 days
        for (let i = 0; i < 30; i++) {
          const eventDate = new Date(today);
          eventDate.setDate(today.getDate() + i);
          
          const eventRef = calendarRef.doc();
          const eventData: any = {
            title: exercise.title,
            date: eventDate.toISOString().split('T')[0],
            time: exercise.preferred_time || "09:00",
            completed: false,
            notification_sent: false,
            created_at: new Date().toISOString(),
            source: "pt_schedule",
          };
          
          // Only add optional fields if they exist
          if (exercise.sets) eventData.sets = exercise.sets;
          if (exercise.reps) eventData.reps = exercise.reps;
          if (exercise.duration_minutes) eventData.duration = exercise.duration_minutes;
          if (exercise.instructions) eventData.instructions = exercise.instructions;
          
          batch.set(eventRef, eventData);
          eventsCreated.push(eventData);
        }
      } else if (exercise.frequency === "weekly" && exercise.days_per_week) {
        // Create events for next 8 weeks
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        for (let week = 0; week < 8; week++) {
          // If specific days are mentioned, use those
          if (exercise.specific_days && exercise.specific_days.length > 0) {
            for (const dayName of exercise.specific_days) {
              const dayIndex = daysOfWeek.indexOf(dayName);
              if (dayIndex === -1) continue;
              
              const eventDate = new Date(today);
              const currentDay = eventDate.getDay();
              const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
              eventDate.setDate(today.getDate() + daysUntilTarget + (week * 7));
              
              const eventRef = calendarRef.doc();
              const eventData: any = {
                title: exercise.title,
                date: eventDate.toISOString().split('T')[0],
                time: exercise.preferred_time || "09:00",
                completed: false,
                notification_sent: false,
                created_at: new Date().toISOString(),
                source: "pt_schedule",
              };
              
              // Only add optional fields if they exist
              if (exercise.sets) eventData.sets = exercise.sets;
              if (exercise.reps) eventData.reps = exercise.reps;
              if (exercise.duration_minutes) eventData.duration = exercise.duration_minutes;
              if (exercise.instructions) eventData.instructions = exercise.instructions;
              
              batch.set(eventRef, eventData);
              eventsCreated.push(eventData);
            }
          } else {
            // Distribute across week (e.g., 3x per week = Mon/Wed/Fri)
            const distribution = getWeekDistribution(exercise.days_per_week);
            for (const dayIndex of distribution) {
              const eventDate = new Date(today);
              const currentDay = eventDate.getDay();
              const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
              eventDate.setDate(today.getDate() + daysUntilTarget + (week * 7));
              
              const eventRef = calendarRef.doc();
              const eventData: any = {
                title: exercise.title,
                date: eventDate.toISOString().split('T')[0],
                time: exercise.preferred_time || "09:00",
                completed: false,
                notification_sent: false,
                created_at: new Date().toISOString(),
                source: "pt_schedule",
              };
              
              // Only add optional fields if they exist
              if (exercise.sets) eventData.sets = exercise.sets;
              if (exercise.reps) eventData.reps = exercise.reps;
              if (exercise.duration_minutes) eventData.duration = exercise.duration_minutes;
              if (exercise.instructions) eventData.instructions = exercise.instructions;
              
              batch.set(eventRef, eventData);
              eventsCreated.push(eventData);
            }
          }
        }
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      exercises_added: exercises.length,
      events_created: eventsCreated.length,
    });
  } catch (error) {
    console.error("Error parsing schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse schedule",
      },
      { status: 500 }
    );
  }
}

// Helper function to distribute days across the week
function getWeekDistribution(daysPerWeek: number): number[] {
  // Returns array of day indices (0 = Sunday, 6 = Saturday)
  switch (daysPerWeek) {
    case 1:
      return [1]; // Monday
    case 2:
      return [1, 4]; // Monday, Thursday
    case 3:
      return [1, 3, 5]; // Monday, Wednesday, Friday
    case 4:
      return [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
    case 5:
      return [1, 2, 3, 4, 5]; // Weekdays
    case 6:
      return [1, 2, 3, 4, 5, 6]; // All except Sunday
    case 7:
      return [0, 1, 2, 3, 4, 5, 6]; // Every day
    default:
      return [1, 3, 5]; // Default to 3x per week
  }
}
