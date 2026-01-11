import { FlowProducer, type ConnectionOptions } from "bullmq";
import { createConnection } from "./connection";

type FlowProducerOptions = ConstructorParameters<typeof FlowProducer>[0];

export const createFlow = (name: string, options?: FlowProducerOptions) => {
  return new FlowProducer({
    connection: createConnection() as unknown as ConnectionOptions,
    ...options,
  });
};
