import * as rosu from "rosu-pp-js";
import * as fsPromises from "node:fs/promises";
import * as fs from "node:fs";
import path from "node:path";
import axios from "axios";
import yauzl, { Entry, ZipFile } from "yauzl";
import { logger } from "./logger";
import { tmpdir } from "node:os";
import type { UserScore } from "nodesu";

const baseDir = path.dirname(path.dirname(path.dirname(import.meta.url)));
const cachePath = path.join(tmpdir(), "bancho-ahr-cache");
if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

async function downloadOsuMap(beatmapId: number) {
    const { data } = await axios.get<ArrayBuffer>(
        `https://osu.ppy.sh/osu/${beatmapId}`,
        {
            responseType: "arraybuffer",
        }
    );
    const filePath = path.join(cachePath, `${beatmapId}.osu`);
    await Bun.write(filePath, data);

    return data;
}

export async function calculatePPForMap(
    beatmapId: number,
    userScore?: UserScore
) {
    logger.info(`Downloading map: ${beatmapId}`);

    const file = Bun.file(path.join(cachePath, `${beatmapId}.osu`));

    if (!(await file.exists())) {
        // * Download the map if it doesn't exist in the cache.
        await downloadOsuMap(beatmapId);
    }

    const fileData = await file.arrayBuffer();

    const map = new rosu.Beatmap(new Uint8Array(fileData));

    const pp100 = new rosu.Performance({
        misses: 0,
        accuracy: 100,
        hitresultPriority: rosu.HitResultPriority.WorstCase,
    }).calculate(map);

    const pp98 = new rosu.Performance({
        misses: 0,
        accuracy: 98,
        hitresultPriority: rosu.HitResultPriority.WorstCase,
    }).calculate(map);

    const pp95 = new rosu.Performance({
        misses: 0,
        accuracy: 95,
        hitresultPriority: rosu.HitResultPriority.WorstCase,
    }).calculate(map);

    let score: rosu.PerformanceAttributes | null = null;

    if (userScore) {
        score = new rosu.Performance({
            misses: userScore.countMiss,
            combo: userScore.maxCombo,
            nGeki: userScore.countGeki,
            nKatu: userScore.countKatu,
            n300: userScore.count300,
            n100: userScore.count100,
            n50: userScore.count50,
            hitresultPriority: rosu.HitResultPriority.WorstCase,
        }).calculate(map);
    }

    map.free();

    return {
        100: pp100,
        98: pp98,
        95: pp95,
        score,
        free: () => {
            pp100.free();
            pp98.free();
            pp95.free();
            if (score !== null) {
                score.free();
            }
        },
    };
}

process.on("SIGINT", () => {
    // fs.unlinkSync(cachePath);
});
