import NodeSu from "nodesu";
import { env } from "./env";

export const nodesu = new NodeSu.Client(env.OSU_API_KEY, {
    parseData: true,
});
