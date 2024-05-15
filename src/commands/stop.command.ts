import type { Command } from "./command";

export default {
    name: "stop",
    help: "Stops the timer if you are the host or starts a vote to stop the timer.",
    syntax: "stop",
    async execute({ channel, lobby, message }) {
        if (!lobby.startTimeout) {
            await channel.sendMessage(`There's no timer to stop.`);
            return;
        }

        if (
            message.user.ircUsername ===
            channel.lobby.getHost().user.ircUsername
        ) {
            clearTimeout(lobby.startTimeout);
            lobby.startTimeout = null;
            await channel.sendMessage(
                `Canceled the start timer, use !start or use the Start Match button to start the match.`
            );
            return;
        }

        const alreadyVoted = lobby.stopVoters.includes(message.user);

        const playerCount = channel.lobby.slots.reduce((acc, cur) => {
            if (!cur || !cur.user) return acc;
            return acc + 1;
        }, 0);
        const minVotes = Math.floor(playerCount / 2);
        if (alreadyVoted) {
            await channel.sendMessage(
                `\[${lobby.stopVoters.length}/${minVotes}\] ${message.user.username}, You already voted to stop the timer.`
            );
            return;
        }

        lobby.stopVoters.push(message.user);

        if (lobby.stopVoters.length >= minVotes) {
            clearTimeout(lobby.startTimeout);
            lobby.startTimeout = null;
            await channel.sendMessage(
                `Canceled the start timer, use !start or use the Start Match button to start the match.`
            );
            return;
        } else {
            await channel.sendMessage(
                `\[${lobby.stopVoters.length}/${channel.lobby.slots.reduce(
                    (acc, cur) => {
                        if (cur) return acc + 1;
                        return acc;
                    },
                    0
                )}\] ${message.user.username}, Voted to stop the timer.`
            );
        }
    },
} satisfies Command;
