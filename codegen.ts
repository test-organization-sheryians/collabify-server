import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "../schema.graphql",
  generates: {
    "src/graphql/generated.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "./types#ServiceContext",
        useIndexSignature: true,
        mappers: {
          Project: "@prisma/client#Project as PrismaProject",
          ProjectMember: "@prisma/client#ProjectMember as PrismaProjectMember",
          // Add other mappers as needed for other modules
          User: "@prisma/client#User as PrismaUser",
          Workspace: "@prisma/client#Workspace as PrismaWorkspace",
          WorkspaceMember:
            "@prisma/client#WorkspaceMember as PrismaWorkspaceMember",
          Notification: "@prisma/client#Notification as PrismaNotification",
          Conversation: "@prisma/client#ChatConversation as PrismaConversation",
          ChatMember: "@prisma/client#ChatMember as PrismaChatMember",
          ChatMessage: "@prisma/client#ChatMessage as PrismaChatMessage",
          UserPresence: "@prisma/client#UserPresence as PrismaUserPresence",
        },
      },
    },
  },
};

export default config;
