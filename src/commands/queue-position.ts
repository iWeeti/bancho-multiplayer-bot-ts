import type { Command } from "./command";

export default {
    name: "queue-position",
    aliases: ["qp", "queuepos"],
    syntax: "queue-position",
    help: "Shows your queueposition",
    async execute({ channel, message, lobby }) {
        const index = lobby.queue.findIndex((pl) => {
            return pl.user.id === message.user.id;
        });

        if (index === -1) {
            await channel.sendMessage(
                `${message.user.username}, You are not in the queue!`
            );
            return;
        }

        await channel.sendMessage(
            `Queue Position for ${message.user.username}: ${index + 1}`
        );
    },
} satisfies Command;
