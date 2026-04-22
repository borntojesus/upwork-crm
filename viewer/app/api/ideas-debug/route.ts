import { NextResponse } from "next/server";
import { readIdea, ideaStats } from "@/lib/ideas";

export async function GET() {
  try {
    const stats = ideaStats();
    const idea = readIdea("00-roadmap/01-lead-scoring-engine");
    return NextResponse.json({ stats, ideaFound: idea !== null, ideaTitle: idea?.title });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
