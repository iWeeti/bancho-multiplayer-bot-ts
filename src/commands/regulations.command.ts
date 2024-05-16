import type { Command } from "./command";

export default {
    name: "regulations",
    help: "Shows the regulations for the lobby.",
    syntax: "regulations",
    aliases: ["r"],
    async execute({ channel, lobby }) {
        let d = new Date(0);
        d.setSeconds(lobby.config.max_length_seconds ?? 0);
        const maxLength = d.toISOString().slice(11, 19);
        d = new Date(0);
        d.setSeconds(lobby.config.min_length_seconds ?? 0);
        const minLength = d.toISOString().slice(11, 19);
        await channel.sendMessage(
            `Regulations: ${lobby.config.star_rating_min?.toFixed(
                2
            )}* - ${lobby.config.star_rating_max?.toFixed(
                2
            )}* | Length: ${minLength.split(":").join(":\u200b")} - ${maxLength
                .split(":")
                .join(":\u200b")}`
        );
    },
} satisfies Command;
