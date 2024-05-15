import type { UserScore } from "nodesu";
import { nodesu } from "./nodesu";
import { supabase } from "./supabase";

export async function getPlayerRecentScore(userId: number) {
    const recents = (await nodesu.user.getRecent(userId)) as UserScore[];

    const mostRecent = recents.sort(
        (a, b) => b.date.getTime() - a.date.getTime()
    )[0];
    if (!mostRecent) throw new Error("Failed to get the most recent score");
    return mostRecent;
}

export async function saveMostRecentScore(
    userId: number,
    lobbyId: number,
    time: number
) {
    const score = await getPlayerRecentScore(userId);

    await supabase.from("score").insert({
        osu_user_id: userId,
        osu_id: Number.isNaN(score.scoreId) ? 0 : score.scoreId,
        beatmap_id: score.beatmapId,
        lobby_id: lobbyId,
        count_300: score.count300 + score.countGeki,
        count_100: score.count100 + score.countKatu,
        count_50: score.count50,
        count_miss: score.countMiss,
        max_combo: score.maxCombo,
        mods: score.enabledMods ?? 0,
        rank: score.rank,
        time, // todo implement
        total_score: score.score,
        created_at: score.date.toISOString(),
    });
}
