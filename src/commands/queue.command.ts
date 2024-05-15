import type { Command } from "./command";

export default {
    name: "queue",
    aliases: ["q"],
    help: "Shows the queue.",
    syntax: "queue",
    async execute({ channel, lobby }) {
        await channel.sendMessage(
            `Queue: ${lobby.queue
                .map((pl) =>
                    pl.user.username
                        ? `${pl.user.username.at(
                              0
                          )}\u200b${pl.user.username.slice(1)}`
                        : "Loading..."
                )
                .join(", ")}`
        );
    },
} satisfies Command;
