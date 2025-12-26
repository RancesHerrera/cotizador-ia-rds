export interface Role {
    id?: number;
    name: string;
    hourly_rate: number;
}

export interface SystemConfig {
    key: string;
    value_text?: string | null;
    value_float?: number | null;
}
