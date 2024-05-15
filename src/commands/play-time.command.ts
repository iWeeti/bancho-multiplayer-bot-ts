import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import type { Command } from "./command";

export default {
    name: "play-time",
    aliases: ["pt"],
    help: "Shows your playtime stats.",
    syntax: "play-time",
    async execute({ channel, message }) {
        const { data, error } = await supabase.rpc(
            "get_user_total_playtime_seconds",
            {
                user_id: message.user.id,
            }
        );

        if (!data) {
            logger.error(JSON.stringify(error, null, 2));
            await channel.sendMessage("Failed to get playtime stats.");
            return;
        }

        // let seconds = data

        const d = new Date(0);
        d.setSeconds(data);
        const [hours, minutes, seconds] = d
            .toISOString()
            .slice(11, 19)
            .split(":");

        await channel.sendMessage(
            `Playtime stats for ${message.user.username} : ${hours} hours ${minutes} minutes ${seconds} seconds`
        );
    },
} satisfies Command;
