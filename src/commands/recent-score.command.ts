import type { Beatmap } from "nodesu";
import { nodesu } from "../lib/nodesu";
import { getPlayerRecentScore } from "../lib/score";
import type { Command } from "./command";
import { BanchoMods } from "bancho.js";
import { calculatePPForMap } from "../lib/pp";

export default {
    name: "recent-score",
    aliases: ["rs"],
    help: "Shows your most recent score.",
    syntax: "recent-score",
    async execute({ message, channel }) {
        const score = await getPlayerRecentScore(message.user.id);

        const [beatmap] = (await nodesu.beatmaps.getByBeatmapId(
            score.beatmapId
        )) as Beatmap[];

        let response = `Recent score for ${message.user.username}: `;

        response += `[https://osu.ppy.sh/b/${beatmap.id} ${beatmap.artist} - ${
            beatmap.title
        } [${beatmap.version ?? ""}]] | [https://osu.ppy.sh/s/${
            score.scoreId
        } ${score.rank}]`;

        if (score.enabledMods && score.enabledMods !== 0) {
            response += ` | ${BanchoMods.parseBitFlags(score.enabledMods ?? 0)
                .map((mod) => mod.shortMod)
                .join(" ")}`;
        }

        const pp = await calculatePPForMap(beatmap.id, score);

        if (pp.score) response += ` | ${pp.score.pp.toFixed(2)} PP`;

        if (!score.perfect) {
            response += ` (${pp[100].pp.toFixed(2)} PP if FC)`;
        }

        response += ` | x${score.maxCombo}/${beatmap.maxCombo} | ${
            score.count300 + score.countGeki
        }/${score.count100 + score.countKatu}/${score.count50}/${
            score.countMiss
        }`;

        pp.free();

        await channel.sendMessage(response);
    },
} satisfies Command;
