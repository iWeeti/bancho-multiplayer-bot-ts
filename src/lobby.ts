import {
    BanchoClient,
    BanchoLobbyTeamModes,
    BanchoLobbyWinConditions,
    BanchoMessage,
    BanchoMods,
    BanchoUser,
    type BanchoLobbyPlayer,
    type BanchoMultiplayerChannel,
} from "bancho.js";
import { type Beatmap } from "nodesu";
import { logger } from "./lib/logger";
import { calculatePPForMap } from "./lib/pp";
import { supabase } from "./lib/supabase";
import type { Database } from "./lib/supabase-types";
import { handleCommand } from "./commands/command";
import type { RealtimeChannel, Subscription } from "@supabase/supabase-js";
import { saveMostRecentScore } from "./lib/score";
import { playersGauge } from "./lib/prometheus";

export class LobbyManager {
    config: Database["public"]["Tables"]["lobby"]["Row"];
    channel: BanchoMultiplayerChannel;
    queue: BanchoLobbyPlayer[] = [];
    client: BanchoClient;

    startRetries = 0;
    startTimeout: Timer | null = null;
    previousMap: Beatmap | undefined;
    stopVoters: BanchoUser[] = [];
    skipVoters: BanchoUser[] = [];
    realtimeChannel: RealtimeChannel | null = null;
    startedPlayingTime: Date | null = null;
    constructor(
        config: Database["public"]["Tables"]["lobby"]["Row"],
        channel: BanchoMultiplayerChannel,
        client: BanchoClient
    ) {
        this.config = config;
        this.channel = channel;
        this.client = client;

        this.registerHandlers();
        this.checkLobbyConfig();
        this.lobby.slots.forEach((player) => {
            if (!player) return;

            this.queue.push(player);
        });
    }

    registerHandlers() {
        this.lobby.on("allPlayersReady", this.onAllPlayersReady.bind(this));
        this.lobby.on("playerJoined", this.onPlayerJoined.bind(this));
        this.lobby.on("playerLeft", this.onPlayerLeft.bind(this));
        this.lobby.on("beatmap", this.onBeatmap.bind(this));
        this.lobby.on("playing", this.onPlaying.bind(this));
        this.lobby.on("matchStarted", () => {
            this.startedPlayingTime = new Date();
        });
        this.lobby.on("matchFinished", this.onMatchFinished.bind(this));
        this.channel.on("message", this.onMessage.bind(this));
        this.realtimeChannel = supabase.realtime
            .channel("lobby-configs")
            .on<Database["public"]["Tables"]["lobby"]["Row"]>(
                "postgres_changes",
                {
                    event: "*",
                    filter: `id=eq.${this.lobby.id}`,
                    schema: "public",
                    table: "lobby",
                },
                async (payload) => {
                    logger.info(
                        `${this.channel.name} -> Received realtime update to config.`
                    );
                    if (payload.eventType === "UPDATE") {
                        this.config = payload.new;
                        await this.checkLobbyConfig();
                    } else if (payload.eventType === "DELETE") {
                        await this.lobby.closeLobby();
                        this.realtimeChannel?.unsubscribe();
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) logger.error(`${err}`);
                logger.debug(
                    `${this.channel.name} -> Realtime status: ${status}`
                );
            });
    }

    async onMatchFinished() {
        const playTime = this.startedPlayingTime
            ? (new Date().getTime() - this.startedPlayingTime.getTime()) / 1000
            : 0;
        this.startedPlayingTime = null;
        for (const slot of this.lobby.slots) {
            if (!slot || !slot.user) continue;
            try {
                await saveMostRecentScore(
                    slot.user.id,
                    this.lobby.id,
                    playTime
                );
            } catch {}
        }
    }

    destroy() {
        this.realtimeChannel?.unsubscribe();
    }

    async onMessage(message: BanchoMessage) {
        await handleCommand(message, this.channel, this.client, this);
    }

    async onPlaying(playing: boolean) {
        this.stopVoters = [];
        this.skipVoters = [];
        if (playing && this.startTimeout) {
            clearTimeout(this.startTimeout);
        }

        if (playing) {
            if (!(await this.checkLobbyConfig())) {
                this.previousMap = this.lobby.beatmap;
            }
        }

        if (!playing) {
            await this.setNextHost();
        }
    }

    checkBeatmap(beatmap: Beatmap): boolean {
        if (
            this.config.min_length_seconds &&
            beatmap.totalLength < this.config.min_length_seconds
        ) {
            this.channel.sendMessage(
                `This beatmap is too short, ${beatmap.totalLength} < ${this.config.min_length_seconds}`
            );
            return false;
        }
        if (
            this.config.max_length_seconds &&
            beatmap.totalLength > this.config.max_length_seconds
        ) {
            this.channel.sendMessage(
                `This beatmap is too long, ${beatmap.totalLength} > ${this.config.max_length_seconds}`
            );
            return false;
        }

        if (
            this.config.star_rating_min &&
            beatmap.stars + this.config.star_rating_error <
                this.config.star_rating_min
        ) {
            this.channel.sendMessage(
                `This beatmap is too easy, ${beatmap.stars} < ${this.config.star_rating_min}`
            );
            return false;
        }
        if (
            this.config.star_rating_max &&
            beatmap.stars - this.config.star_rating_error >
                this.config.star_rating_max
        ) {
            this.channel.sendMessage(
                `This beatmap is too hard, ${beatmap.stars} > ${this.config.star_rating_max}`
            );
            return false;
        }

        return true;
    }

    async onBeatmap(beatmap?: Beatmap) {
        if (this.startTimeout) {
            clearTimeout(this.startTimeout);
        }

        if (!beatmap || this.lobby.playing) {
            return;
        }

        if (!this.checkBeatmap(beatmap)) {
            if (this.previousMap) this.lobby.setMap(this.previousMap);
            return;
        }

        this.previousMap = beatmap;

        await this.channel.sendMessage(
            `[https://osu.ppy.sh/b/${beatmap.id} ${beatmap.artist} - ${beatmap.title}] - ([https://beatconnect.io/b/${beatmap.id} BeatConnect Mirror] - [https://osu.direct/d/${beatmap.id} osu.direct Mirror])`
        );
        const d = new Date(0);
        d.setSeconds(beatmap.totalLength);
        await this.channel.sendMessage(
            `(Star Rating: ${beatmap.stars} | ${
                beatmap.rankedStatus
            } | Length: ${d.toISOString().slice(14, 19)} | BPM: ${beatmap.bpm})`
        );
        const pp = await calculatePPForMap(beatmap.id);
        await this.channel.sendMessage(
            `(AR: ${beatmap.AR} | CS: ${beatmap.CS} | OD: ${beatmap.OD} | HP: ${
                beatmap.HP
            } | 100%: ${Math.round(pp[100].pp)}pp | 98%: ${Math.round(
                pp[98].pp
            )}pp | 95%: ${Math.round(pp[95].pp)}pp)`
        );
        pp.free();
        await this.startTimer(60);
    }

    async startTimer(seconds: number) {
        await this.channel.sendMessage(
            `Starting match in ${seconds} seconds, use !stop to cancel the timer.`
        );

        this.startTimeout = setTimeout(async () => {
            if (this.lobby.playing) return;
            await this.channel.sendMessage(`Starting match.`);
            await this.lobby.startMatch();
            this.startTimeout = null;
        }, seconds * 1000);
    }

    async onPlayerJoined({
        player,
        slot,
        team,
    }: {
        player: BanchoLobbyPlayer;
        slot: number;
        team: string;
    }) {
        this.queue.push(player);
        if (!this.lobby.getHost()) await this.setNextHost();
        this.setMetrics();
    }

    async checkLobbyConfig() {
        await this.lobby.updateSettings();
        if (
            this.lobby.teamMode !== this.config.team_mode ||
            this.lobby.winCondition !== this.config.win_condition ||
            this.lobby.size !== this.config.size
        ) {
            this.lobby.setSettings(
                BanchoLobbyTeamModes.HeadToHead,
                BanchoLobbyWinConditions.Score,
                this.config.size
            );
        }
        let sent = false;

        const cancelMatch = async () => {
            if (sent) return;
            if (this.lobby.playing) await this.lobby.abortMatch();
            await this.setNextHost();
            await this.channel.sendMessage(
                "Tried to start an invalid match, aborting."
            );
        };

        if (
            this.config.mods &&
            BanchoMods.returnBitFlags(this.lobby.mods) !== this.config.mods
        ) {
            this.lobby.setMods(
                BanchoMods.parseBitFlags(this.config.mods ?? 0, true)
            );
            await cancelMatch();
        }

        if (this.config.free_mod !== this.lobby.freemod) {
            this.lobby.setMods(
                BanchoMods.parseBitFlags(this.config.mods ?? 0),
                true
            );
            await cancelMatch();
        }

        if (this.lobby.name !== this.config.name) {
            this.lobby.setName(this.config.name);
        }

        this.lobby.slots.forEach((pl) => {
            if (!pl || !pl.user) return;
            if (!this.queue.includes(pl)) {
                this.queue.push(pl);
            }
        });

        await this.saveUsers();

        return true;
    }

    async saveUsers() {
        await supabase.from("user").upsert(
            [...this.lobby.slots]
                .filter((s) => s && s?.user)
                .map((slot) => {
                    return {
                        osu_id: slot.user.id,
                        username: slot.user.username,
                    };
                }),
            { onConflict: "osu_id" }
        );
    }

    async setNextHost() {
        const nextHost = this.queue.shift();
        if (!nextHost) return;
        await this.lobby.setHost(`#${nextHost.user.id}`);

        this.queue.push(nextHost);
    }

    async onPlayerLeft(player: BanchoLobbyPlayer) {
        this.queue = this.queue.filter(
            (p) => p?.user?.ircUsername !== player?.user?.ircUsername
        );
        if (player.isHost) {
            await this.setNextHost();
        }
        this.stopVoters = this.stopVoters.filter((u) => u !== player.user);
        this.skipVoters = this.skipVoters.filter((u) => u !== player.user);

        if (
            this.lobby.slots.reduce((acc, cur) => {
                if (!cur || !cur.user) return acc;
                return acc + 1;
            }, 0) === 0
        ) {
            if (this.lobby.playing) await this.lobby.abortMatch();
        }
        this.setMetrics();
    }

    async onAllPlayersReady() {
        if (this.startRetries >= 5) {
            logger.error(`Failed to start the match with 5 retries.`);
            return;
        }
        try {
            this.startRetries += 1;
            await this.lobby.startMatch(5000);
            this.startRetries = 0;
        } catch (e) {
            logger.error(`${this.channel.name}: Failed to start match...`);
            logger.error(e);
            this.channel.sendMessage(`Failed to start the match.`);
            this.onAllPlayersReady();
        }
    }

    setMetrics() {
        playersGauge.set(
            {
                lobby_id: this.lobby.id.toString(),
                lobby_name: this.lobby.name,
            },
            this.playerCount
        );
    }

    get playerCount() {
        return this.lobby.slots.reduce((acc, cur) => {
            if (!cur || !cur.user) return acc;

            return acc + 1;
        }, 0);
    }

    get lobby() {
        return this.channel.lobby;
    }

    async saveConfig() {
        const { data: updated } = await supabase
            .from("lobby")
            .update({
                ...this.config,
                id: this.channel.lobby.id,
            })
            .eq("id", this.config.id)
            .select()
            .single();

        if (!updated) throw new Error("Failed to save config to Supabase");

        this.config = updated;
    }
}