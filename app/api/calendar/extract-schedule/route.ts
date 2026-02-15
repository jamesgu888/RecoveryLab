import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { user_id, file_data, file_type } = await request.json();

    if (!user_id || !file_data) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isPdf = file_type === "application/pdf";
    const isImage = file_type.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Determine media type for Claude
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
    if (file_type === "image/png") mediaType = "image/png";
    else if (file_type === "image/gif") mediaType = "image/gif";
    else if (file_type === "image/webp") mediaType = "image/webp";
    else if (file_type === "application/pdf") mediaType = "image/png"; // PDFs converted to PNG

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: file_data,
              },
            },
            {
              type: "text",
              text: `You are a medical schedule extraction assistant. Extract all physical therapy exercises from this document.

For each exercise, extract:
- Exercise name
- Sets and reps (if mentioned)
- Frequency (daily, 3x per week, etc.)
- Preferred time (if mentioned)
- Duration (if mentioned)
- Any special instructions

Format your response as a plain text list, one exercise per line, like:
- Hip flexor stretch: 3 sets of 15 reps, daily, 9:00 AM
- Calf raises: 2 sets of 20 reps, 5x per week, afternoon
- Balance exercises: 10 minutes, 3x per week

If no exercises are found, respond with "No exercises found in this document."`,
            },
          ],
        },
      ],
    });

    const scheduleText = response.content[0].type === "text" ? response.content[0].text : "";

    if (scheduleText.includes("No exercises found")) {
      return NextResponse.json(
        { success: false, error: "No exercises found in the document" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule_text: scheduleText,
    });
  } catch (error) {
    console.error("Error extracting schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract schedule",
      },
      { status: 500 }
    );
  }
}
