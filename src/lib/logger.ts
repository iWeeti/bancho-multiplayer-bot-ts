import { createLogger, transports, format } from "winston";
import { env } from "./env";

export const logger = createLogger({
    transports: [
        new transports.File({
            filename: "combined.log",
            format: format.combine(format.json(), format.timestamp()),
        }),
        new transports.File({
            filename: "error.log",
            format: format.combine(format.json(), format.timestamp()),
            level: "error",
        }),
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.cli(),
                format.timestamp()
            ),
            level: env.LOG_LEVEL ?? "debug",
        }),
    ],
});
