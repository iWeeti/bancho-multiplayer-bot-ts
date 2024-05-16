import type { Command } from "./command";

export default {
    name: "start",
    help: "Starts the match if you are the host or starts a vote to start the match.",
    syntax: "start [seconds]",
    async execute({ channel, lobby, message, args }) {
        const arg = args.shift();
        const seconds = arg ? parseInt(arg) : undefined;

        if (channel.lobby.playing) {
            await channel.sendMessage("Already playing...");
            return;
        }

        if (seconds) {
            if (
                message.user.ircUsername !==
                channel.lobby.getHost().user.ircUsername
            ) {
                await channel.sendMessage(
                    `${message.user.username}, Only the host can start a timer.`
                );
                return;
            }
            if (Number.isNaN(seconds)) {
                await channel.sendMessage(
                    `${message.user.username}, Invalid seconds "${arg}" passed to start command.`
                );
                return;
            }
            if (lobby.startTimeout) {
                await channel.sendMessage(`There's a start timer already.`);
                return;
            }

            await lobby.startTimer(seconds);
            return;
        }

        if (
            message.user.ircUsername ===
            channel.lobby.getHost().user.ircUsername
        ) {
            if (lobby.startTimeout) {
                clearTimeout(lobby.startTimeout);
                lobby.startTimeout = null;
            }
            await channel.sendMessage(`Starting match.`);

            return;
        }

        const alreadyVoted = lobby.startVoters.includes(message.user);

        const playerCount = channel.lobby.slots.reduce((acc, cur) => {
            if (!cur || !cur.user) return acc;
            return acc + 1;
        }, 0);
        const minVotes = Math.floor(playerCount / 2);
        if (alreadyVoted) {
            await channel.sendMessage(
                `[${lobby.startVoters.length}/${minVotes}] ${message.user.username}, You already voted to start the match.`
            );
            return;
        }

        lobby.startVoters.push(message.user);

        if (lobby.startVoters.length >= minVotes) {
            if (lobby.startTimeout) {
                clearTimeout(lobby.startTimeout);
                lobby.startTimeout = null;
            }
            await lobby.startTimer(0);
            return;
        } else {
            await channel.sendMessage(
                `[${lobby.startVoters.length}/${minVotes / 2}] ${
                    message.user.username
                }, Voted to start the match.`
            );
        }
    },
} satisfies Command;
