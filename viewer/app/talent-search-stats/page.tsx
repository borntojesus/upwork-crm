import { getRankingFromServer } from "@/lib/talent-search";
import { TalentSearchTracker } from "@/components/talent-search/tracker";

export default async function TalentSearchStatsPage() {
  const { dataset, stage } = await getRankingFromServer();

  return (
    <TalentSearchTracker
      initialDataset={dataset}
      initialStage={stage === "none" ? "none" : stage}
    />
  );
}
