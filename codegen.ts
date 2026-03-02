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
          User: "@prisma/client#User as PrismaUser",
          Workspace: "@prisma/client#Workspace as PrismaWorkspace",
          WorkspaceMember:
            "@prisma/client#WorkspaceMember as PrismaWorkspaceMember",
          Notification: "@prisma/client#Notification as PrismaNotification",

          // Chat Module Architecture:
          // - Conversation: Handlers return GraphQL types directly (no mapper)
          // - ConversationMember: Dataloaders/field resolvers transform ChatMember
          // - ChatMemberRecord: Full database record type
          ConversationMember: "@prisma/client#ChatMember as PrismaChatMember",
          ChatMemberRecord: "@prisma/client#ChatMember as PrismaChatMember",
          ChatMessage: "@prisma/client#ChatMessage as PrismaChatMessage",

          // Pages: field resolver parent is GraphQLPagePartial (optional collaborators/creator/children).
          // This eliminates all `as any` casts in Page field resolvers.
          Page: "../modules/pages/graphql/mappers#GraphQLPagePartial",

          // Vault: use the mapped types (string dates, number sizeBytes) rather than raw Prisma
          // so the generated Resolvers type matches what toGraphQLFolder/toGraphQLFile return.
          VaultFolder: "../modules/vault/graphql/mappers#GraphQLVaultFolder",
          VaultFile: "../modules/vault/graphql/mappers#GraphQLVaultFile",

          // Issues: use the mapped types so the generated Resolvers type matches what
          // toGraphQLIssue / toGraphQLStatus / toGraphQLLabel return.
          Issue: "../modules/issues/graphql/mappers#GraphQLIssue",
          IssueStatus: "../modules/issues/graphql/mappers#GraphQLIssueStatus",
          IssueLabel: "../modules/issues/graphql/mappers#GraphQLIssueLabel",
        },
      },
    },
  },
};

export default config;
