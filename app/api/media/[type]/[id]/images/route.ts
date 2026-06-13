import { NextRequest, NextResponse } from "next/server";
import { fetchMediaImages } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const images = await fetchMediaImages(id, type);
    return NextResponse.json(images);
  } catch (err: any) {
    console.error(`Failed to fetch images for ${type} ${id}:`, err);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
