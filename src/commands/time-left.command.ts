import type { Command } from "./command";

export default {
    name: "time-left",
    aliases: ["tl"],
    help: "Shows the estimated time left for the current map.",
    syntax: "time-left",
    async execute({ channel, lobby }) {
        if (!lobby.lobby.playing || !lobby.startedPlayingTime) {
            await channel.sendMessage("Not playing.");
            return;
        }

        const msLeft =
            new Date().getTime() - lobby.startedPlayingTime.getTime();

        const d = new Date(0);
        d.setMilliseconds(msLeft);
        const text = d.toISOString().slice(11, 19);
        await channel.sendMessage(`Estimated time left: ${text}`);
    },
} satisfies Command;
