import type {
    BanchoClient,
    BanchoMessage,
    BanchoMultiplayerChannel,
} from "bancho.js";
import { Glob } from "bun";
import { platform } from "os";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import type { LobbyManager } from "../lobby";

export interface CommandExecuteOptions {
    commands: Map<string, Command>;
    channel: BanchoMultiplayerChannel;
    client: BanchoClient;
    message: BanchoMessage;
    args: string[];
    lobby: LobbyManager;
}

export interface Command {
    name: string;
    help: string;
    syntax: string;
    aliases?: string[];
    execute: (opts: CommandExecuteOptions) => Promise<void>;
}

export const commands = new Map<string, Command>();

const glob = new Glob("**/*.command.ts");

for await (const file of glob.scan(".")) {
    const split = file.split(platform() === "win32" ? "\\" : "/");
    const fileName = split[split.length - 1].replace(/\.ts$/, "");
    const command = (await import(`./${fileName}`)).default as Command;
    logger.info(`Loaded command: ${command.name}`);
    // logger.info(file);
    commands.set(command.name, command);
}

export async function handleCommand(
    message: BanchoMessage,
    channel: BanchoMultiplayerChannel,
    client: BanchoClient,
    lobby: LobbyManager
) {
    if (!message.content.startsWith(env.PREFIX)) return;

    const args = message.content.slice(env.PREFIX.length).split(/\s+/g);
    const commandName = args.shift();

    if (!commandName) return;

    let command = commands.get(commandName);

    if (!command) {
        for (const cmd of commands.values()) {
            if (cmd.aliases?.includes(commandName)) {
                command = cmd;
                break;
            }
        }
        if (!command) return;
    }

    logger.info(`${channel.name} -> Executing command ${command.name}`);
    try {
        await command.execute({
            client,
            channel,
            message,
            commands,
            args,
            lobby,
        });
    } catch (e) {
        if (e instanceof Error) {
            logger.error(e.stack ?? `${e.name}: ${e.message}`);
        } else {
            logger.error(`${e}`);
        }
        await channel.sendMessage(`Failed to run the command.`);
    }
}
