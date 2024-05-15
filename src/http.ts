import type {
    BanchoClient,
    BanchoLobbyPlayer,
    BanchoLobbyPlayerStatesTypes,
    BanchoMultiplayerChannel,
} from "bancho.js";
import express from "express";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { hostname } from "os";
import type { Database } from "./lib/supabase-types";
import type { LobbyManager } from "./lobby";
import nodeHtmlToImage from "node-html-to-image";
import axios from "axios";
import { encodeToDataUrl } from "node-font2base64";
import { register } from "prom-client";
let bannerCreatedTime: Date;

const font = await encodeToDataUrl("data/GeistVF.woff2");

export function startHttpServer(
    client: BanchoClient,
    lobbies: Map<
        number,
        {
            config: Database["public"]["Tables"]["lobby"]["Row"];
            channel?: BanchoMultiplayerChannel;
            lobby?: LobbyManager;
        }
    >
) {
    const app = express();

    app.get("/health", (req, res) => res.end("OK"));

    app.get("/metrics", async (req, res) => {
        const metrics = await register.metrics();

        res.end(metrics);
    });

    app.get("/lobbies", async (req, res) => {
        const data = await getLobbyData(lobbies, {
            downloadImages: !!req.query.images,
            slotsArray: true,
        });
        res.json(data);
    });

    app.get("/banner", async (req, res) => {
        bannerCreatedTime = new Date();
        const file = Bun.file("data/banner.html");
        const stylesFile = Bun.file("data/tw.css");
        if (!(await file.exists()) || !(await stylesFile.exists())) {
            return res.status(500).json({
                message: "Banner template and/or tailwind styles don't exist.",
            });
        }

        let html = await file.text();
        try {
            const imageData = await nodeHtmlToImage({
                html,
                content: {
                    lobbies: await getLobbyData(lobbies, {
                        downloadImages: true,
                        starsArray: true,
                        slotsArray: true,
                    }),
                    styles: await stylesFile.text(),
                    rows: Math.ceil([...lobbies.keys()].length / 2),
                    font,
                },
                transparent: true,
            });

            res.writeHead(200, {
                "Content-Type": "image/png",
                "Cache-Control": "max-age=60",
                Age: (
                    (new Date().getTime() - bannerCreatedTime.getTime()) /
                    1000
                ).toFixed(0),
            });
            res.end(imageData, "binary");
        } catch (e) {
            logger.error(`${e}`);
            res.status(500).end("Unknown Server Error");
        }
    });

    app.listen(parseInt(env.PORT), env.HOST, () => {
        logger.info(
            `HTTP Server Listening on port ${
                env.PORT
            }\n\n\thttp://${hostname()}:${env.PORT}`
        );
    });
}

async function getLobbyData(
    lobbies: Map<
        number,
        {
            config: Database["public"]["Tables"]["lobby"]["Row"];
            channel?: BanchoMultiplayerChannel;
            lobby?: LobbyManager;
        }
    >,
    opts: {
        downloadImages?: boolean;
        starsArray?: boolean;
        slotsArray?: boolean;
    } = {
        downloadImages: false,
        starsArray: false,
        slotsArray: false,
    }
) {
    const data: {
        id: number;
        name: string;
        slots: number;
        slotsOccupied: number;
        slotsArray?: ({
            isHost: boolean;
            // state: string;
            user: {
                id: number;
                username: string;
            };
        } | null)[];
        beatmap?: {
            id: number;
            setId: number;
            title: string;
            artist: string;
            version: string;
            stars: number;
            image?: string;
            starsArray?: string[];
        };
        playing: boolean;
    }[] = [];

    for (const { lobby, config, channel } of lobbies.values()) {
        if (!channel || !lobby) continue;
        let beatmap;

        if (channel.lobby.beatmap) {
            const b = channel.lobby.beatmap;
            let imageData: string | undefined;
            if (opts.downloadImages) {
                try {
                    const imageUrl = `https://assets.ppy.sh/beatmaps/${b.setId}/covers/card@2x.jpg`;
                    const { data: imageBuffer } = await axios.get(imageUrl, {
                        responseType: "arraybuffer",
                    });

                    imageData = Buffer.from(imageBuffer).toString("base64");
                } catch (e) {
                    logger.error(
                        `[HTTP] #getLobbyData -> Failed to download cover image.\n${e}`
                    );
                }
            }

            beatmap = {
                id: b.id,
                setId: b.setId,
                title: b.title,
                artist: b.artist,
                version: b.version,
                stars: b.stars,
                starsArray: opts.starsArray
                    ? [...new Array(Math.round(b.stars))]
                    : undefined,
                image:
                    opts.downloadImages && imageData
                        ? `data:image/png;base64,${imageData}`
                        : undefined,
            };
        }

        data.push({
            id: channel.lobby.id,
            name: channel.lobby.name,
            slots: channel.lobby.size,
            slotsOccupied: channel.lobby.slots.reduce(
                (acc, cur) => (cur ? acc + 1 : acc),
                0
            ),
            slotsArray: opts.slotsArray
                ? channel.lobby.slots.map((pl) => {
                      if (!pl) return pl;

                      return {
                          isHost: pl.isHost,
                          //   state: pl.state.toString(),
                          user: {
                              id: pl.user.id,
                              username: pl.user.username,
                          },
                      };
                  })
                : undefined,
            beatmap,
            playing: channel.lobby.playing,
        });
    }
    return data;
}
