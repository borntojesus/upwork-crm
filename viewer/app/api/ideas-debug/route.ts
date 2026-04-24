import { NextResponse } from "next/server";
import { listIdeas, ideaStatsByStatus, getIdea } from "@/lib/ideas";

export async function GET() {
  try {
    const stats = ideaStatsByStatus();
    const ideas = listIdeas();
    const idea = getIdea("lead-scoring");
    return NextResponse.json({
      stats,
      total: ideas.length,
      ideaFound: idea !== undefined,
      ideaTitle: idea?.title,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
