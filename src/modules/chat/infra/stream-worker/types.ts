export interface StreamWorker {
  isRunning: boolean;
  assignedStreams: Set<string>;
  knownGroups: Set<string>;
  init(): Promise<void>;
  heartbeatLoop(): Promise<void>;
  consumptionLoop(): Promise<void>;
  recoveryLoop(): Promise<void>;
  ensureGroups(streams: string[]): Promise<void>;
  safeProcessMessage(streamKey: string, id: string, fields: string[]): Promise<void>;
  processMessage(streamKey: string, id: string, fields: string[]): Promise<void>;
  stop(): void;
}

export interface WorkerAssignment {
  consumerName: string;
  streams: string[];
}