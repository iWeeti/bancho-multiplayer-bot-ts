import { Gauge, collectDefaultMetrics } from "prom-client";

collectDefaultMetrics();

export const playersGauge = new Gauge({
    name: "players_count",
    help: "The amount of players in the lobby.",
    labelNames: ["lobby_id", "lobby_name"] as const,
});
