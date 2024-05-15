import type { Command } from "./command";

export default {
    name: "queue",
    aliases: ["q"],
    help: "Shows the queue.",
    syntax: "queue",
    async execute({ channel, lobby }) {
        console.log(lobby.queue);
        await channel.sendMessage(
            `Queue: ${lobby.queue
                .map((pl) => pl?.user?.username ?? "Loading...")
                .join(", ")
                .slice(0, 100)}`
        );
    },
} satisfies Command;
