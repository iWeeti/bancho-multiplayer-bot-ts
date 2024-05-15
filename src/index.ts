import BanchoJS, { BanchoLobby, BanchoMultiplayerChannel } from "bancho.js";
import "dotenv/config";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import type { Database } from "./lib/supabase-types";
import { supabase } from "./lib/supabase";
import { LobbyManager } from "./lobby";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { startHttpServer } from "./http";
import "./lib/prometheus";

const client = new BanchoJS.BanchoClient({
    username: env.IRC_USERNAME,
    password: env.IRC_PASSWORD,
    apiKey: env.OSU_API_KEY,
    botAccount: !!env?.IS_BOT_ACCOUNT,
});

const lobbies: Map<
    number,
    {
        config: Database["public"]["Tables"]["lobby"]["Row"];
        channel?: BanchoMultiplayerChannel;
        lobby?: LobbyManager;
    }
> = new Map();

let closing = false;
let realtimeChannel: RealtimeChannel | null = null;
process.on("SIGINT", async () => {
    if (closing) {
        logger.warn(`Forcing quit.`);
        client.disconnect();
        process.exit(0);
    }
    closing = true;
    logger.info(`Disconnecting from Bancho... [Ctrl+C again to force quit]`);
    for (const { config, channel, lobby } of lobbies.values()) {
        // if (channel) {
        //     await channel.lobby.closeLobby();
        // }
        // logger.info(`Closed: ${config.name}`);
        logger.info(`Destroying lobby for ${channel?.lobby.name}`);
        lobby?.destroy();
    }

    realtimeChannel?.unsubscribe();

    client.disconnect();
    process.exit(0);
});

logger.info(`Connecting to Bancho.`);

await client.connect();

logger.info(`Connected to Bancho.`);

logger.info(`Loading saved lobbies from database...`);
const { data: savedLobbies } = await supabase.from("lobby").select("*");

for (const config of savedLobbies ?? []) {
    const found = client.getChannel(`#mp_${config.id}`);

    let channel: BanchoMultiplayerChannel | undefined;
    let lobby: LobbyManager | undefined;
    if (found instanceof BanchoMultiplayerChannel) {
        try {
            channel = found;
            await channel.join();
            await channel.sendMessage("Reconnected to lobby.");
            lobby = new LobbyManager(config, channel, client);
        } catch {
            channel = undefined;
            lobby = undefined;
        }
    }
    lobbies.set(config.id, { config, channel, lobby });
}

logger.info(`Found ${savedLobbies?.length} saved lobbies.`);

logger.info(`Instantiating BanchoChannels for the lobbies.`);
for (const { config, channel: existing } of lobbies.values()) {
    if (existing) continue;
    const channel = await client.createLobby(config.name, false);
    const { data: updated } = await supabase
        .from("lobby")
        .update({
            ...config,
            id: channel.lobby.id,
        })
        .eq("id", config.id)
        .select()
        .single();

    if (!updated)
        throw new Error("Failed to save updated lobby config to supabase.");

    logger.info(`Created a channel for ${config.name} #mp_${channel.lobby.id}`);
    const lobby = new LobbyManager(updated, channel, client);
    lobbies.set(config.id, {
        config: config ?? updated,
        channel,
        lobby,
    });

    await channel.lobby.setPassword("");
    channel.on("message", (message) => {
        logger.debug(
            `${channel.name} -> ${message.user.username}: ${message.content}`
        );
    });
}
realtimeChannel = supabase.realtime
    .channel("lobby-configs")
    .on<Database["public"]["Tables"]["lobby"]["Row"]>(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "lobby",
        },
        async (payload) => {
            logger.info(`Received realtime insert to lobbies.`);
            const config = payload.new;
            try {
                const channel = await client.createLobby(config.name, false);
                await channel.lobby.setPassword("");
                const { data: updated } = await supabase
                    .from("lobby")
                    .update({
                        ...config,
                        id: channel.lobby.id,
                    })
                    .eq("id", config.id)
                    .select()
                    .single();

                if (!updated)
                    throw new Error(
                        "Failed to save updated lobby config to supabase."
                    );

                const lobby = new LobbyManager(updated, channel, client);
                lobbies.set(updated.id, {
                    channel,
                    config: updated,
                    lobby,
                });
            } catch (e) {
                logger.error(`Failed to create lobby\n${e}`);
            }
        }
    )
    .subscribe((status, err) => {
        if (err) logger.error(`${err}`);
        logger.debug(`Lobby insert realtime status: ${status}`);
    });

startHttpServer(client, lobbies);
