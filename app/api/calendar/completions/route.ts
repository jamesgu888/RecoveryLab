import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const date = searchParams.get("date"); // YYYY-MM-DD format

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    let query = adminDb
      .collection("users")
      .doc(userId)
      .collection("exercise_completions");

    if (date) {
      query = query.where("date", "==", date) as any;
    }

    const snapshot = await query.get();
    const completions: Record<string, any> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      completions[data.event_id] = {
        id: doc.id,
        ...data,
      };
    });

    return NextResponse.json({
      success: true,
      completions,
    });
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch completions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, event_id, event_title, date, completed } = await request.json();

    if (!user_id || !event_id || !date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const completionsRef = adminDb
      .collection("users")
      .doc(user_id)
      .collection("exercise_completions");

    if (completed) {
      // Mark as completed
      await completionsRef.doc(event_id).set({
        event_id,
        event_title: event_title || "Exercise",
        date,
        completed: true,
        completed_at: new Date().toISOString(),
        notification_sent: false,
      });

      // Trigger notification
      const response = await fetch(
        `${request.nextUrl.origin}/api/notifications/exercise-completed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id,
            event_id,
            event_title,
            date,
          }),
        }
      );

      return NextResponse.json({
        success: true,
        message: "Exercise marked as completed! Notification sent to care team.",
      });
    } else {
      // Remove completion
      await completionsRef.doc(event_id).delete();

      return NextResponse.json({
        success: true,
        message: "Exercise marked as incomplete",
      });
    }
  } catch (error) {
    console.error("Error updating completion:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update completion",
      },
      { status: 500 }
    );
  }
}
