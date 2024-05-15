import type { Command } from "./command";

export default {
    name: "skip",
    help: "Skips the current host if you are the host or starts a vote to skip the host.",
    syntax: "skip",
    aliases: ["s"],
    async execute({ channel, lobby, message }) {
        if (
            message.user.ircUsername ===
            channel.lobby.getHost().user.ircUsername
        ) {
            await lobby.setNextHost();
            await channel.sendMessage(`Skipped host.`);
            return;
        }

        const alreadyVoted = lobby.skipVoters.includes(message.user);

        const playerCount = channel.lobby.slots.reduce((acc, cur) => {
            if (!cur || !cur.user) return acc;
            return acc + 1;
        }, 0);
        const minVotes = Math.floor(playerCount / 2);
        if (alreadyVoted) {
            await channel.sendMessage(
                `[${lobby.skipVoters.length}/${minVotes}] ${message.user.username}, You already voted to skip the host.`
            );
            return;
        }

        lobby.skipVoters.push(message.user);

        if (lobby.skipVoters.length >= minVotes) {
            await lobby.setNextHost();
            await channel.sendMessage(`Skipped host.`);
            return;
        } else {
            await channel.sendMessage(
                `[${lobby.skipVoters.length}/${minVotes}] ${message.user.username}, Voted to skip the host.`
            );
        }
    },
} satisfies Command;
