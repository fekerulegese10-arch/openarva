export interface WebGatewayConfig {
    port?: number;
    authSecret?: string;
}
export declare function startWebGateway(config?: WebGatewayConfig): void;
