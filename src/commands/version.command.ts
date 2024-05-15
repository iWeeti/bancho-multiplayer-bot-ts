import type { Command } from "./command";

export default {
    name: "version",
    help: "Shows the version of the bot.",
    syntax: "version",
    async execute({ channel }) {
        await channel.sendMessage(
            `Bot Version: 0.0.0.0.0.0.0.0.0.0.0.00.0.00.0.01-alpha.beta.maybe`
        );
    },
} satisfies Command;
