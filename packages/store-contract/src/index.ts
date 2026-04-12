export interface MemoryStoreRecord<TValue = unknown> {
  readonly key: string;
  readonly value: TValue;
  readonly updatedAtMs: number;
}

export interface MemoryStore {
  get<TValue = unknown>(key: string): Promise<MemoryStoreRecord<TValue> | null>;
  put<TValue = unknown>(record: MemoryStoreRecord<TValue>): Promise<void>;
  list(prefix?: string): Promise<Array<MemoryStoreRecord>>;
}
