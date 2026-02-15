import { NextRequest, NextResponse } from "next/server";
import { broadcastNotification } from "@/lib/notifications-admin";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { user_id, event_id, event_title, date } = await request.json();

    if (!user_id || !event_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subject = "Exercise Completed! 💪";
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    
    const message = `Great job! "${event_title}" has been completed on ${formattedDate}. Keep up the excellent work on your recovery journey!`;

    // Send notification to care team
    await broadcastNotification({
      userId: user_id,
      type: "exercise_completion",
      subject,
      message,
    });

    // Mark notification as sent
    await adminDb
      .collection("users")
      .doc(user_id)
      .collection("exercise_completions")
      .doc(event_id)
      .update({ notification_sent: true });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Error sending exercise completion notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send notification",
      },
      { status: 500 }
    );
  }
}
