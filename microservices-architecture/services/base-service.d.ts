import { IncomingMessage, ServerResponse } from 'http';
export interface ServiceConfig {
    name: string;
    version: string;
    port: number;
    registryUrl: string;
    metadata?: Record<string, string>;
    ttl?: number;
}
export declare abstract class BaseService {
    protected server: import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
    protected instanceId: string;
    private heartbeatTimer;
    private registered;
    private config;
    constructor(config: ServiceConfig);
    abstract handleServiceRoute(req: IncomingMessage, res: ServerResponse, path: string, method: string, body: string | null): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConfig(): ServiceConfig;
    private register;
    private deregister;
    private startHeartbeat;
    private handleRequest;
    protected sendJson(res: ServerResponse, status: number, data: unknown): void;
    protected parseBody(req: IncomingMessage): Promise<string | null>;
}
//# sourceMappingURL=base-service.d.ts.map