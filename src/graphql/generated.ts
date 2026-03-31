import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Project as PrismaProject, ProjectMember as PrismaProjectMember, User as PrismaUser, Workspace as PrismaWorkspace, WorkspaceMember as PrismaWorkspaceMember, Notification as PrismaNotification, ChatMember as PrismaChatMember, ChatMessage as PrismaChatMessage } from '@prisma/client';
import { GraphQLPagePartial } from '../modules/pages/graphql/mappers';
import { GraphQLVaultFolder, GraphQLVaultFile } from '../modules/vault/graphql/mappers';
import { GraphQLIssue, GraphQLIssueStatus, GraphQLIssueLabel } from '../modules/issues/graphql/mappers';
import { ServiceContext } from './types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type AcceptInviteInput = {
  token: Scalars['String']['input'];
  userEmail?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type ActiveCollaborator = {
  __typename?: 'ActiveCollaborator';
  connectionId: Scalars['ID']['output'];
  cursorPosition?: Maybe<CursorPosition>;
  joinedAt: Scalars['DateTime']['output'];
  lastSeenAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type ActiveFeatureFlag = {
  __typename?: 'ActiveFeatureFlag';
  enabled: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
};

export type ActiveUserContext = {
  __typename?: 'ActiveUserContext';
  featureFlags: Array<ActiveFeatureFlag>;
  grantedPermissions: Array<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
  projectRole?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  workspaceId: Scalars['ID']['output'];
  workspaceRole?: Maybe<Scalars['String']['output']>;
};

export type AddBoardCollaboratorsResult = {
  __typename?: 'AddBoardCollaboratorsResult';
  addedCount: Scalars['Int']['output'];
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type AddChannelMembersResult = {
  __typename?: 'AddChannelMembersResult';
  addedCount: Scalars['Int']['output'];
  members: Array<ChannelMemberInfo>;
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type AddGroupMembersResult = {
  __typename?: 'AddGroupMembersResult';
  addedCount: Scalars['Int']['output'];
  members: Array<GroupMemberInfo>;
  skippedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type AddPageCollaboratorsInput = {
  collaborators: Array<PageCollaboratorInput>;
  pageId: Scalars['ID']['input'];
};

export type AddPageCollaboratorsResult = {
  __typename?: 'AddPageCollaboratorsResult';
  addedCollaborators: Array<PageCollaborator>;
};

export type ArchiveChannelInput = {
  channelId: Scalars['ID']['input'];
};

export type ArchivePageInput = {
  pageId: Scalars['ID']['input'];
};

export type ArchivePageResult = {
  __typename?: 'ArchivePageResult';
  page: Page;
};

export type AvailabilityResponse = {
  __typename?: 'AvailabilityResponse';
  available: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  reservationId?: Maybe<Scalars['String']['output']>;
};

export type BoardCollaborator = {
  __typename?: 'BoardCollaborator';
  joinedAt: Scalars['DateTime']['output'];
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export type BoardConnection = {
  __typename?: 'BoardConnection';
  boards: Array<Whiteboard>;
  nextCursor?: Maybe<Scalars['ID']['output']>;
};

export type BoardPayload = {
  __typename?: 'BoardPayload';
  /** Collaborators that were successfully added (may be fewer than requested if some failed validation) */
  addedCollaborators: Array<BoardCollaborator>;
  board: Whiteboard;
};

export type BoardSnapshot = {
  __typename?: 'BoardSnapshot';
  boardId: Scalars['ID']['output'];
  lastStreamId?: Maybe<Scalars['String']['output']>;
  snapshot: Scalars['String']['output'];
  snapshotTimestamp?: Maybe<Scalars['DateTime']['output']>;
};

export type ChannelAvailabilityResponse = {
  __typename?: 'ChannelAvailabilityResponse';
  available: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  reservationId?: Maybe<Scalars['String']['output']>;
};

export type ChannelMemberInfo = {
  __typename?: 'ChannelMemberInfo';
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export type ChatMemberRecord = {
  __typename?: 'ChatMemberRecord';
  conversationId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isMuted: Scalars['Boolean']['output'];
  joinedAt: Scalars['DateTime']['output'];
  lastDeliveredMsgId?: Maybe<Scalars['ID']['output']>;
  lastReadMsgId?: Maybe<Scalars['ID']['output']>;
  role: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  authorUserId: Scalars['ID']['output'];
  content: Scalars['JSON']['output'];
  conversationId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  editedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isEdited: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  parentMessageId?: Maybe<Scalars['ID']['output']>;
  replyCount: Scalars['Int']['output'];
  sequence: Scalars['Int']['output'];
  streamId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type CheckChannelAvailabilityInput = {
  projectId: Scalars['ID']['input'];
  slug: Scalars['String']['input'];
};

export type CloseThreadResult = {
  __typename?: 'CloseThreadResult';
  closedAt: Scalars['DateTime']['output'];
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

export type ConfirmIssueDescriptionUploadInput = {
  descriptionFileId: Scalars['ID']['input'];
};

export type ConfirmIssueDescriptionUploadResult = {
  __typename?: 'ConfirmIssueDescriptionUploadResult';
  issue: Issue;
};

export type ConfirmUploadResult = {
  __typename?: 'ConfirmUploadResult';
  file: VaultFile;
};

export type ConfirmVaultUploadInput = {
  fileId: Scalars['ID']['input'];
};

export type Conversation = {
  __typename?: 'Conversation';
  createdAt: Scalars['DateTime']['output'];
  createdBy?: Maybe<Scalars['ID']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  lastMessage?: Maybe<LastMessagePreview>;
  memberCount: Scalars['Int']['output'];
  members?: Maybe<Array<ConversationMember>>;
  name?: Maybe<Scalars['String']['output']>;
  parentMessageId?: Maybe<Scalars['ID']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
  topic?: Maybe<Scalars['String']['output']>;
  type: ConversationType;
  unreadCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type ConversationConnection = {
  __typename?: 'ConversationConnection';
  edges: Array<Conversation>;
  pageInfo: PageInfo;
};

export type ConversationMember = {
  __typename?: 'ConversationMember';
  isMuted: Scalars['Boolean']['output'];
  joinedAt: Scalars['DateTime']['output'];
  role: Scalars['String']['output'];
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export enum ConversationType {
  Channel = 'CHANNEL',
  Dm = 'DM',
  GroupDm = 'GROUP_DM',
  Thread = 'THREAD'
}

export type ConversationUnreadCount = {
  __typename?: 'ConversationUnreadCount';
  conversationId: Scalars['ID']['output'];
  lastUnreadMessageId?: Maybe<Scalars['ID']['output']>;
  unreadCount: Scalars['Int']['output'];
};

export type CreateBoardInput = {
  /** Optional: Add workspace members as collaborators during board creation */
  collaboratorIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type CreateChannelInput = {
  memberUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  topic?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ConversationType>;
  workspaceId: Scalars['ID']['input'];
};

export type CreateDmInput = {
  projectId: Scalars['ID']['input'];
  recipientUserId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type CreateFolderResult = {
  __typename?: 'CreateFolderResult';
  folder: VaultFolder;
};

export type CreateGroupInput = {
  memberUserIds: Array<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type CreateIssueInput = {
  assigneeId?: InputMaybe<Scalars['ID']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  labelIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  priority?: InputMaybe<IssuePriority>;
  projectId: Scalars['ID']['input'];
  statusId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type CreateIssueLabelInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateIssueLabelResult = {
  __typename?: 'CreateIssueLabelResult';
  label: IssueLabel;
};

export type CreateIssueResult = {
  __typename?: 'CreateIssueResult';
  issue: Issue;
};

export type CreateIssueStatusInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateIssueStatusResult = {
  __typename?: 'CreateIssueStatusResult';
  status: IssueStatus;
};

export type CreatePageInput = {
  collaboratorIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  coverUrl?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  /** null = root-level page */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** Fractional index position for sibling ordering */
  position: Scalars['Float']['input'];
  projectId: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['ID']['input'];
};

export type CreatePageResult = {
  __typename?: 'CreatePageResult';
  page: Page;
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProjectRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  rank: Scalars['Int']['input'];
};

export type CreateThreadInput = {
  conversationId: Scalars['ID']['input'];
  messageId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type CreateVaultFolderInput = {
  name: Scalars['String']['input'];
  /** null = create at root level (Home) */
  parentFolderId?: InputMaybe<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
};

export type CreateWorkspaceRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  rank: Scalars['Int']['input'];
};

export type CursorPosition = {
  __typename?: 'CursorPosition';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type DeleteBoardResult = {
  __typename?: 'DeleteBoardResult';
  boardId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteChannelResult = {
  __typename?: 'DeleteChannelResult';
  channelId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteDmResult = {
  __typename?: 'DeleteDmResult';
  dmId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteGroupResult = {
  __typename?: 'DeleteGroupResult';
  groupId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteIssueInput = {
  issueId: Scalars['ID']['input'];
};

export type DeleteIssueLabelInput = {
  labelId: Scalars['ID']['input'];
};

export type DeleteIssueStatusInput = {
  statusId: Scalars['ID']['input'];
};

export type DeletePageInput = {
  pageId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type DeletePageResult = {
  __typename?: 'DeletePageResult';
  pageId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

/** Generic success/id response for delete operations */
export type DeleteResult = {
  __typename?: 'DeleteResult';
  id: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteThreadResult = {
  __typename?: 'DeleteThreadResult';
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

export type DeleteVaultFileInput = {
  fileId: Scalars['ID']['input'];
};

export type DeleteVaultFolderInput = {
  cascade?: InputMaybe<Scalars['Boolean']['input']>;
  folderId: Scalars['ID']['input'];
};

export type DmConversation = {
  __typename?: 'DmConversation';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  memberCount: Scalars['Int']['output'];
  members: Array<DmMember>;
  projectId: Scalars['ID']['output'];
  type: ConversationType;
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type DmMember = {
  __typename?: 'DmMember';
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export type DmUserProfile = {
  __typename?: 'DmUserProfile';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type FeatureFlagRecord = {
  __typename?: 'FeatureFlagRecord';
  defaultEnabled: Scalars['Boolean']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  overrides: Array<FlagOverrideRecord>;
};

export enum FlagContextType {
  Global = 'GLOBAL',
  Project = 'PROJECT',
  User = 'USER',
  Workspace = 'WORKSPACE'
}

export type FlagOverrideRecord = {
  __typename?: 'FlagOverrideRecord';
  contextId?: Maybe<Scalars['ID']['output']>;
  contextType: FlagContextType;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
};

/** Returned by getPageSnapshot — everything the client needs to initialise the Y.Doc */
export type GetPageSnapshotResult = {
  __typename?: 'GetPageSnapshotResult';
  /** Last Redis Stream entry ID processed into this snapshot — used for gap-fill on subscribe */
  lastStreamId: Scalars['String']['output'];
  pageId: Scalars['ID']['output'];
  /** base64-encoded Y.encodeStateAsUpdate() — apply on client with Y.applyUpdate() */
  snapshot: Scalars['String']['output'];
  /** Unix timestamp (ms) of when this snapshot was compiled */
  snapshotTimestamp: Scalars['Float']['output'];
};

export type GroupMemberInfo = {
  __typename?: 'GroupMemberInfo';
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export type HistoryPayload = {
  __typename?: 'HistoryPayload';
  hasMore: Scalars['Boolean']['output'];
  messages: Array<ChatMessage>;
  minSequence?: Maybe<Scalars['Int']['output']>;
};

export type InviteResponse = {
  __typename?: 'InviteResponse';
  invitedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type InviteToWorkspaceInput = {
  emails: Array<Scalars['String']['input']>;
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type Issue = {
  __typename?: 'Issue';
  assignee?: Maybe<IssueUser>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: IssueUser;
  descriptionS3Key?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  labels: Array<IssueLabel>;
  number: Scalars['Int']['output'];
  position: Scalars['Float']['output'];
  priority: IssuePriority;
  projectId: Scalars['ID']['output'];
  status: IssueStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type IssueDescriptionUrl = {
  __typename?: 'IssueDescriptionUrl';
  expiresAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
};

export type IssueLabel = {
  __typename?: 'IssueLabel';
  color: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
};

export enum IssuePriority {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  NoPriority = 'NO_PRIORITY',
  Urgent = 'URGENT'
}

export type IssueStatus = {
  __typename?: 'IssueStatus';
  color: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  issueCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Float']['output'];
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type IssueStatusCount = {
  __typename?: 'IssueStatusCount';
  color: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  issueCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  statusId: Scalars['ID']['output'];
};

export type IssueUser = {
  __typename?: 'IssueUser';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type JoinResponse = {
  __typename?: 'JoinResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  workspaceSlug: Scalars['String']['output'];
};

export type LastMessagePreview = {
  __typename?: 'LastMessagePreview';
  authorUserId: Scalars['ID']['output'];
  content: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type LeaveGroupResult = {
  __typename?: 'LeaveGroupResult';
  groupId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type LockPageInput = {
  pageId: Scalars['ID']['input'];
};

export type LockPageResult = {
  __typename?: 'LockPageResult';
  page: Page;
};

export type MarkFilesUnreferencedInput = {
  /** The entity (page or issue) whose save triggered this mark. */
  entityId: Scalars['ID']['input'];
  /** The entity type — PAGE or TASK. */
  entityType: VaultFileSource;
  /** File IDs that are no longer present in the saved document content. */
  fileIds: Array<Scalars['ID']['input']>;
};

export type MarkFilesUnreferencedResult = {
  __typename?: 'MarkFilesUnreferencedResult';
  /** Number of files successfully marked unreferenced. */
  markedCount: Scalars['Int']['output'];
};

export type MessageReaction = {
  __typename?: 'MessageReaction';
  count: Scalars['Int']['output'];
  emoji: Scalars['String']['output'];
  hasReacted: Scalars['Boolean']['output'];
  recentUsers: Array<User>;
};

export type MessagesDelta = {
  __typename?: 'MessagesDelta';
  hasMore: Scalars['Boolean']['output'];
  lastSequence: Scalars['Int']['output'];
  messages: Array<ChatMessage>;
};

export type MoveFileResult = {
  __typename?: 'MoveFileResult';
  file: VaultFile;
};

export type MoveFolderResult = {
  __typename?: 'MoveFolderResult';
  folder: VaultFolder;
};

export type MoveIssueStatusInput = {
  issueId: Scalars['ID']['input'];
  newPosition?: InputMaybe<Scalars['Float']['input']>;
  statusId: Scalars['ID']['input'];
};

export type MoveIssueStatusResult = {
  __typename?: 'MoveIssueStatusResult';
  issue: Issue;
};

export type MoveVaultFileInput = {
  fileId: Scalars['ID']['input'];
  /** null = move to root (Home) */
  targetFolderId?: InputMaybe<Scalars['ID']['input']>;
};

export type MoveVaultFolderInput = {
  folderId: Scalars['ID']['input'];
  /** null = move to root (Home) */
  targetParentFolderId?: InputMaybe<Scalars['ID']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  _health?: Maybe<Scalars['String']['output']>;
  acceptWorkspaceInvite: JoinResponse;
  addBoardCollaborators: AddBoardCollaboratorsResult;
  addChannelMembers: AddChannelMembersResult;
  addGroupMembers: AddGroupMembersResult;
  /** Upsert-semantics: can be used for both inviting and changing roles. */
  addPageCollaborators: AddPageCollaboratorsResult;
  addProjectMember: ProjectMember;
  archiveBoard: Whiteboard;
  archiveChannel: Conversation;
  /** Archives a page and all its descendants. */
  archivePage: ArchivePageResult;
  archiveProject: Project;
  assignRolePermission: RolePermission;
  cancelWorkspaceInvite: Scalars['Boolean']['output'];
  checkChannelAvailability: ChannelAvailabilityResponse;
  checkProjectSlugAvailability: AvailabilityResponse;
  checkSlugAvailability: AvailabilityResponse;
  closeThread: CloseThreadResult;
  /** Step 2 of 2: verifies S3 upload and activates the description. */
  confirmIssueDescriptionUpload: ConfirmIssueDescriptionUploadResult;
  /**
   * Step 2 of 2 for uploading a file to Vault.
   * Verifies the S3 object (size + MIME), sets the file to ACTIVE, and updates storage usage.
   */
  confirmVaultUpload: ConfirmUploadResult;
  createBoard: BoardPayload;
  createChannel: Conversation;
  createDm: Conversation;
  createGroup: Conversation;
  createIssue: CreateIssueResult;
  createIssueLabel: CreateIssueLabelResult;
  createIssueStatus: CreateIssueStatusResult;
  createOnboardingWorkspace: Workspace;
  /**
   * Creates a new page in a project. Initialises Y.Doc and uploads initial snapshot to S3.
   * The calling user is automatically added as an EDITOR collaborator.
   */
  createPage: CreatePageResult;
  createProject: Project;
  createProjectRole: ProjectRole;
  createThread: Conversation;
  createVaultFolder: CreateFolderResult;
  createWorkspace: Workspace;
  createWorkspaceRole: WorkspaceRole;
  deleteAccount: Scalars['Boolean']['output'];
  deleteBoard: DeleteBoardResult;
  deleteChannel: DeleteChannelResult;
  deleteDm: DeleteDmResult;
  deleteGroup: DeleteGroupResult;
  deleteIssue: DeleteResult;
  deleteIssueLabel: DeleteResult;
  deleteIssueStatus: DeleteResult;
  /**
   * Soft-deletes a page. Fails with 409 if the page has active subscribers.
   * Does not cascade to child pages — handle descendants explicitly first.
   */
  deletePage: DeletePageResult;
  deleteProject: Scalars['Boolean']['output'];
  deleteProjectRole: Scalars['Boolean']['output'];
  deleteThread: DeleteThreadResult;
  /** Soft-deletes a vault file and releases its storage quota. */
  deleteVaultFile: DeleteResult;
  /**
   * Soft-deletes a folder.
   * cascade=false (default): returns error if folder is non-empty.
   * cascade=true: recursively soft-deletes all child folders and files.
   */
  deleteVaultFolder: DeleteResult;
  deleteWorkspace: Scalars['Boolean']['output'];
  deleteWorkspaceRole: Scalars['Boolean']['output'];
  inviteToWorkspace: InviteResponse;
  leaveGroup: LeaveGroupResult;
  leaveProject: Scalars['Boolean']['output'];
  leaveWorkspace: Scalars['Boolean']['output'];
  lockBoard: Whiteboard;
  /**
   * Acquires an exclusive editor lock on the page.
   * Returns 423 if another user currently holds the lock.
   * Lock auto-releases after 1 hour (safety net for crashed clients).
   */
  lockPage: LockPageResult;
  /** Mark all notifications as read. */
  markAllNotificationsRead: Scalars['Boolean']['output'];
  /**
   * Called by the editor on save when one or more vault://fileId references
   * have been removed from the document content since the last save.
   *
   * Does NOT delete files immediately — sets unrefAt for the cleanup job to
   * process after a grace period (default 30 min), preserving in-session undo.
   */
  markFilesUnreferenced: MarkFilesUnreferencedResult;
  /** Mark specific notifications as read. */
  markNotificationRead: Scalars['Boolean']['output'];
  moveIssueStatus: MoveIssueStatusResult;
  moveVaultFile: MoveFileResult;
  moveVaultFolder: MoveFolderResult;
  muteConversation: MuteConversationResult;
  pinVaultFolder: PinFolderResult;
  /**
   * Register a file upload initiated outside the standard Vault UI flow.
   * Used by Chat (attachments), Pages/Issues (BlockNote uploadFile adapter),
   * and Whiteboard (Excalidraw onAddFile).
   *
   * Enforces storage quota before issuing the presigned URL.
   * Creates a PENDING VaultFile row. The caller must:
   *   1. PUT bytes to presignedUrl
   *   2. Call confirmVaultUpload(fileId) to activate
   */
  registerExternalFile: RegisterExternalFileResult;
  removeBoardCollaborator: RemoveBoardCollaboratorResult;
  removeChannelMember: RemoveChannelMemberResult;
  removeGroupMember: RemoveGroupMemberResult;
  /** Cannot remove the page creator. */
  removePageCollaborator: RemovePageCollaboratorResult;
  removeProjectMember: Scalars['Boolean']['output'];
  removeRolePermission: Scalars['Boolean']['output'];
  removeWorkspaceMember: InviteResponse;
  renameBoard: Whiteboard;
  renameChannel: Conversation;
  renameGroup: RenameGroupResult;
  renamePage: RenamePageResult;
  /** Renames a file. S3 key is unchanged — only the display name is updated. */
  renameVaultFile: RenameFileResult;
  renameVaultFolder: RenameFolderResult;
  reopenThread: ReopenThreadResult;
  reorderIssue: ReorderIssueResult;
  reorderIssueStatus: ReorderIssueStatusResult;
  /**
   * Moves a page to a new position (and optionally a new parent).
   * Validate no circular nesting before calling (circular guard runs server-side too).
   */
  reorderPage: ReorderPageResult;
  /** Step 1 of 2: reserves an S3 slot and returns a presigned PUT URL. */
  requestIssueDescriptionUpload: RequestIssueDescriptionUploadResult;
  /**
   * Step 1 of 2 for uploading a file to Vault.
   * Checks quota, creates a PENDING VaultFile row, returns a presigned PUT URL.
   * The client must PUT the file directly to S3 using this URL, then call confirmVaultUpload.
   */
  requestVaultUpload: RequestUploadResult;
  resendWorkspaceInvite: Scalars['Boolean']['output'];
  subscribeThread: SubscribeThreadResult;
  syncUser: User;
  toggleFeatureFlag: ToggleFlagResult;
  transferWorkspaceOwnership: WorkspaceMember;
  unarchiveBoard: Whiteboard;
  unarchiveChannel: UnarchiveChannelResult;
  /**
   * Unarchives a page. Fails if the parent is still archived.
   * Child pages are NOT automatically unarchived — handle each explicitly.
   */
  unarchivePage: UnarchivePageResult;
  unarchiveProject: Project;
  unlockBoard: Whiteboard;
  /** Lock owner or workspace ADMIN can unlock. */
  unlockPage: UnlockPageResult;
  unpinVaultFolder: DeleteResult;
  unsubscribeThread: UnsubscribeThreadResult;
  updateBoardDescription: Whiteboard;
  updateChannelDescription: UpdateChannelDescriptionResult;
  updateChannelVisibility: UpdateChannelVisibilityResult;
  updateIssue: UpdateIssueResult;
  updateIssueLabel: UpdateIssueLabelResult;
  updateIssueStatus: UpdateIssueStatusResult;
  updateProfile: User;
  updateProject: Project;
  updateProjectMemberRole: ProjectMember;
  updateProjectRole: ProjectRole;
  updateWorkspace: Workspace;
  updateWorkspaceMemberRole: WorkspaceMember;
  updateWorkspaceRole: WorkspaceRole;
};


export type MutationAcceptWorkspaceInviteArgs = {
  input: AcceptInviteInput;
};


export type MutationAddBoardCollaboratorsArgs = {
  boardId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationAddChannelMembersArgs = {
  channelId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type MutationAddGroupMembersArgs = {
  groupId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type MutationAddPageCollaboratorsArgs = {
  input: AddPageCollaboratorsInput;
};


export type MutationAddProjectMemberArgs = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationArchiveBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationArchiveChannelArgs = {
  input: ArchiveChannelInput;
};


export type MutationArchivePageArgs = {
  input: ArchivePageInput;
};


export type MutationArchiveProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationAssignRolePermissionArgs = {
  conditions?: InputMaybe<Scalars['String']['input']>;
  effect?: InputMaybe<Scalars['String']['input']>;
  permissionId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationCancelWorkspaceInviteArgs = {
  inviteId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationCheckChannelAvailabilityArgs = {
  input: CheckChannelAvailabilityInput;
};


export type MutationCheckProjectSlugAvailabilityArgs = {
  slug: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationCheckSlugAvailabilityArgs = {
  slug: Scalars['String']['input'];
};


export type MutationCloseThreadArgs = {
  threadId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationConfirmIssueDescriptionUploadArgs = {
  input: ConfirmIssueDescriptionUploadInput;
};


export type MutationConfirmVaultUploadArgs = {
  input: ConfirmVaultUploadInput;
};


export type MutationCreateBoardArgs = {
  input: CreateBoardInput;
};


export type MutationCreateChannelArgs = {
  input: CreateChannelInput;
};


export type MutationCreateDmArgs = {
  input: CreateDmInput;
};


export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


export type MutationCreateIssueArgs = {
  input: CreateIssueInput;
};


export type MutationCreateIssueLabelArgs = {
  input: CreateIssueLabelInput;
};


export type MutationCreateIssueStatusArgs = {
  input: CreateIssueStatusInput;
};


export type MutationCreatePageArgs = {
  input: CreatePageInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
  workspaceId: Scalars['ID']['input'];
};


export type MutationCreateProjectRoleArgs = {
  input: CreateProjectRoleInput;
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationCreateThreadArgs = {
  input: CreateThreadInput;
};


export type MutationCreateVaultFolderArgs = {
  input: CreateVaultFolderInput;
};


export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};


export type MutationCreateWorkspaceRoleArgs = {
  input: CreateWorkspaceRoleInput;
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationDeleteChannelArgs = {
  channelId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteDmArgs = {
  dmId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteGroupArgs = {
  groupId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteIssueArgs = {
  input: DeleteIssueInput;
};


export type MutationDeleteIssueLabelArgs = {
  input: DeleteIssueLabelInput;
};


export type MutationDeleteIssueStatusArgs = {
  input: DeleteIssueStatusInput;
};


export type MutationDeletePageArgs = {
  input: DeletePageInput;
};


export type MutationDeleteProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteProjectRoleArgs = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteThreadArgs = {
  threadId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteVaultFileArgs = {
  input: DeleteVaultFileInput;
};


export type MutationDeleteVaultFolderArgs = {
  input: DeleteVaultFolderInput;
};


export type MutationDeleteWorkspaceArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type MutationDeleteWorkspaceRoleArgs = {
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationInviteToWorkspaceArgs = {
  input: InviteToWorkspaceInput;
};


export type MutationLeaveGroupArgs = {
  groupId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationLeaveProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationLeaveWorkspaceArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type MutationLockBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationLockPageArgs = {
  input: LockPageInput;
};


export type MutationMarkFilesUnreferencedArgs = {
  input: MarkFilesUnreferencedInput;
};


export type MutationMarkNotificationReadArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationMoveIssueStatusArgs = {
  input: MoveIssueStatusInput;
};


export type MutationMoveVaultFileArgs = {
  input: MoveVaultFileInput;
};


export type MutationMoveVaultFolderArgs = {
  input: MoveVaultFolderInput;
};


export type MutationMuteConversationArgs = {
  conversationId: Scalars['ID']['input'];
  isMuted: Scalars['Boolean']['input'];
};


export type MutationPinVaultFolderArgs = {
  input: PinVaultFolderInput;
};


export type MutationRegisterExternalFileArgs = {
  input: RegisterExternalFileInput;
};


export type MutationRemoveBoardCollaboratorArgs = {
  boardId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationRemoveChannelMemberArgs = {
  channelId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRemoveGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRemovePageCollaboratorArgs = {
  input: RemovePageCollaboratorInput;
};


export type MutationRemoveProjectMemberArgs = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRemoveRolePermissionArgs = {
  permissionId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRemoveWorkspaceMemberArgs = {
  memberId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRenameBoardArgs = {
  boardId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationRenameChannelArgs = {
  input: RenameChannelInput;
};


export type MutationRenameGroupArgs = {
  groupId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationRenamePageArgs = {
  input: RenamePageInput;
};


export type MutationRenameVaultFileArgs = {
  input: RenameVaultFileInput;
};


export type MutationRenameVaultFolderArgs = {
  input: RenameVaultFolderInput;
};


export type MutationReopenThreadArgs = {
  threadId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationReorderIssueArgs = {
  input: ReorderIssueInput;
};


export type MutationReorderIssueStatusArgs = {
  input: ReorderIssueStatusInput;
};


export type MutationReorderPageArgs = {
  input: ReorderPageInput;
};


export type MutationRequestIssueDescriptionUploadArgs = {
  input: RequestIssueDescriptionUploadInput;
};


export type MutationRequestVaultUploadArgs = {
  input: RequestVaultUploadInput;
};


export type MutationResendWorkspaceInviteArgs = {
  inviteId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationSubscribeThreadArgs = {
  threadId: Scalars['ID']['input'];
};


export type MutationSyncUserArgs = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  clerkId: Scalars['String']['input'];
  email: Scalars['String']['input'];
  emailVerified?: InputMaybe<Scalars['Boolean']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationToggleFeatureFlagArgs = {
  input: ToggleFeatureFlagInput;
};


export type MutationTransferWorkspaceOwnershipArgs = {
  newOwnerId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUnarchiveBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationUnarchiveChannelArgs = {
  channelId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUnarchivePageArgs = {
  input: UnarchivePageInput;
};


export type MutationUnarchiveProjectArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationUnlockBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationUnlockPageArgs = {
  input: UnlockPageInput;
};


export type MutationUnpinVaultFolderArgs = {
  input: UnpinVaultFolderInput;
};


export type MutationUnsubscribeThreadArgs = {
  threadId: Scalars['ID']['input'];
};


export type MutationUpdateBoardDescriptionArgs = {
  boardId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateChannelDescriptionArgs = {
  channelId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateChannelVisibilityArgs = {
  channelId: Scalars['ID']['input'];
  isPublic: Scalars['Boolean']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateIssueArgs = {
  input: UpdateIssueInput;
};


export type MutationUpdateIssueLabelArgs = {
  input: UpdateIssueLabelInput;
};


export type MutationUpdateIssueStatusArgs = {
  input: UpdateIssueStatusInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateProjectArgs = {
  input: UpdateProjectInput;
  projectId: Scalars['ID']['input'];
};


export type MutationUpdateProjectMemberRoleArgs = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateProjectRoleArgs = {
  input: UpdateProjectRoleInput;
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateWorkspaceArgs = {
  input: UpdateWorkspaceInput;
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateWorkspaceMemberRoleArgs = {
  memberId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUpdateWorkspaceRoleArgs = {
  input: UpdateWorkspaceRoleInput;
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type MuteConversationResult = {
  __typename?: 'MuteConversationResult';
  conversationId: Scalars['ID']['output'];
  isMuted: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type Notification = {
  __typename?: 'Notification';
  actor?: Maybe<User>;
  actorId?: Maybe<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  chatMessage?: Maybe<ChatMessage>;
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  entityId: Scalars['String']['output'];
  entityType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  isRead: Scalars['Boolean']['output'];
  page?: Maybe<Page>;
  project?: Maybe<Project>;
  recipientUserId: Scalars['String']['output'];
  task?: Maybe<Task>;
  workspace?: Maybe<Workspace>;
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges: Array<NotificationEdge>;
  pageInfo: PageInfo;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor: Scalars['String']['output'];
  node: Notification;
};

export type OnboardingStatus = {
  __typename?: 'OnboardingStatus';
  hasProject: Scalars['Boolean']['output'];
  hasUser: Scalars['Boolean']['output'];
  hasWorkspace: Scalars['Boolean']['output'];
  workspaceSlug?: Maybe<Scalars['String']['output']>;
};

export type OverviewIssue = {
  __typename?: 'OverviewIssue';
  assigneeAvatar?: Maybe<Scalars['String']['output']>;
  assigneeId?: Maybe<Scalars['ID']['output']>;
  assigneeName?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  priority: Scalars['String']['output'];
  statusColor: Scalars['String']['output'];
  statusName: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type OverviewMember = {
  __typename?: 'OverviewMember';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  joinedAt: Scalars['String']['output'];
  name: Scalars['String']['output'];
  roleName?: Maybe<Scalars['String']['output']>;
  roleRank?: Maybe<Scalars['Int']['output']>;
  userId: Scalars['ID']['output'];
};

/**
 * A collaborative document page within a project.
 * The Y.Doc content is synced via WebSocket and accessed via getPageSnapshot.
 */
export type Page = {
  __typename?: 'Page';
  /** Populated only by getProjectPages — empty in all other contexts */
  children: Array<Page>;
  collaborators: Array<PageCollaborator>;
  coverUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['ID']['output'];
  creator: UserBasic;
  /** Emoji or absolute URL for the page icon */
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  isLocked: Scalars['Boolean']['output'];
  /** null = root-level page (no parent) */
  parentId?: Maybe<Scalars['ID']['output']>;
  /** Fractional index position for ordering within parent (e.g., 1.5 between 1.0 and 2.0) */
  position: Scalars['Float']['output'];
  projectId: Scalars['ID']['output'];
  /** S3 key for the latest compiled Yjs snapshot (disaster recovery reference) */
  s3Key?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type PageCollaborator = {
  __typename?: 'PageCollaborator';
  joinedAt: Scalars['DateTime']['output'];
  role: PageRole;
  user: UserBasic;
  userId: Scalars['ID']['output'];
};

export type PageCollaboratorInput = {
  role: PageRole;
  userId: Scalars['ID']['input'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export enum PageRole {
  Commenter = 'COMMENTER',
  Editor = 'EDITOR',
  Viewer = 'VIEWER'
}

/**
 * Returned by getPageSnapshot.
 *
 * snapshot         — base64 Y.js diff. Client calls Y.applyUpdate(localDoc, decode(snapshot)).
 * lastStreamId     — client passes this to subscribe-page for gap-fill replay.
 * snapshotTimestamp — when the base snapshot was last compacted by the stream worker. Null for new pages.
 */
export type PageSnapshot = {
  __typename?: 'PageSnapshot';
  lastStreamId: Scalars['String']['output'];
  snapshot: Scalars['String']['output'];
  snapshotTimestamp?: Maybe<Scalars['DateTime']['output']>;
};

export type Permission = {
  __typename?: 'Permission';
  action: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  module: Scalars['String']['output'];
  resource: Scalars['String']['output'];
};

export type PinFolderResult = {
  __typename?: 'PinFolderResult';
  folder: VaultFolder;
};

export type PinVaultFolderInput = {
  folderId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export enum PresenceStatus {
  Away = 'AWAY',
  Offline = 'OFFLINE',
  Online = 'ONLINE'
}

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  isPrivate?: Maybe<Scalars['Boolean']['output']>;
  key: Scalars['String']['output'];
  members: Array<ProjectMember>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

/**
 * A 1:1 DM conversation with the other participant's profile resolved.
 * The caller's own userId must be used to identify 'otherUser' on the client.
 */
export type ProjectDmItem = {
  __typename?: 'ProjectDmItem';
  id: Scalars['ID']['output'];
  otherUser: DmUserProfile;
  unreadCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ProjectMember = {
  __typename?: 'ProjectMember';
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  role?: Maybe<Scalars['String']['output']>;
  user: User;
  userId: Scalars['ID']['output'];
};

export type ProjectOverview = {
  __typename?: 'ProjectOverview';
  completedIssues: Scalars['Int']['output'];
  issuesByStatus: Array<IssueStatusCount>;
  members: Array<OverviewMember>;
  openIssues: Scalars['Int']['output'];
  overdueIssues: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  recentIssues: Array<OverviewIssue>;
  totalIssues: Scalars['Int']['output'];
};

export type ProjectRole = {
  __typename?: 'ProjectRole';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  projectId?: Maybe<Scalars['ID']['output']>;
  rank: Scalars['Int']['output'];
  scopeType: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type PublicUser = {
  __typename?: 'PublicUser';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  activeCollaborators: Array<ActiveCollaborator>;
  activeContext: ActiveUserContext;
  allPermissions: Array<Permission>;
  boardCollaborators: Array<BoardCollaborator>;
  featureFlags: Array<FeatureFlagRecord>;
  /** Live presence from Redis ZSET (not DB). Reflects current editing sessions. */
  getActivePageCollaborators: Array<PageCollaborator>;
  /**
   * Batch-fetch presigned GET URLs for a list of fileIds.
   * Returns one result entry per fileId in the same order as the input.
   * Failed or deleted files return a non-null entry with status != ACTIVE.
   *
   * Max 50 fileIds per call.
   */
  getBatchDownloadUrls: Array<VaultBatchDownloadResult>;
  getBoard?: Maybe<Whiteboard>;
  getBoardSnapshot: BoardSnapshot;
  getChannelMembers: Array<ChatMemberRecord>;
  getConversation: Conversation;
  getDmByUsers?: Maybe<DmConversation>;
  /** Returns full detail for a single issue. Used when opening the issue modal. */
  getIssue: Issue;
  /**
   * Returns a short-lived presigned GET URL for reading an issue description from S3.
   * TTL: 5 minutes. Always request fresh — never cache.
   */
  getIssueDescriptionUrl: IssueDescriptionUrl;
  /** Returns all labels defined in a project. */
  getIssueLabels: Array<IssueLabel>;
  /** Returns all Kanban columns for a project, ordered by position. */
  getIssueStatuses: Array<IssueStatus>;
  getLastReadMessage?: Maybe<Scalars['ID']['output']>;
  getMessageById?: Maybe<ChatMessage>;
  getMessagesAfterCursor: Array<ChatMessage>;
  getMissingMessages: Array<ChatMessage>;
  /** Fetch page metadata. Use getPageSnapshot for Y.Doc content. */
  getPage: Page;
  /** DB collaborator list (authoritative). For real-time presence, use getActivePageCollaborators. */
  getPageCollaborators: Array<PageCollaborator>;
  /**
   * Returns the authoritative Y.Doc snapshot diff + a stream cursor for gap-fill.
   *
   * First open (no offline state):
   *   getPageSnapshot(pageId: "cuid")
   *
   * Reconnect with offline edits:
   *   getPageSnapshot(pageId: "cuid", clientSnapshot: "<base64 Y.encodeStateAsUpdate>")
   *
   * Client workflow:
   *   1. Call this query → receive { snapshot, lastStreamId }
   *   2. Apply snapshot: Y.applyUpdate(localDoc, base64Decode(snapshot))
   *   3. Open WS: page:subscribe-page { pageId, lastStreamId }  ← gap-fill
   */
  getPageSnapshot: PageSnapshot;
  getProjectDms: Array<ProjectDmItem>;
  /**
   * Returns all issues for a project, sorted by priority (URGENT first)
   * then by position within each column.
   * Optional filters: assigneeId, labelIds, priority.
   */
  getProjectIssues: Array<Issue>;
  /** Returns the full nested page tree for a project (non-archived, non-deleted). */
  getProjectPages: Array<Page>;
  getReadReceipts: ReadReceiptsResponse;
  getThreadMessages: Array<ChatMessage>;
  getUnreadCounts: UnreadCountsResponse;
  getUserConversations: ConversationConnection;
  getUsersByIds: Array<UserBasic>;
  /**
   * Returns the ancestor folder chain for a given folder, ordered root → current.
   * The last element is the folder itself, the first is the top-level ancestor.
   * Returns [] when the folder has no parent (it is already at root level).
   * Used exclusively by the vault breadcrumb (server fallback path for direct URL visits).
   */
  getVaultAncestors: Array<VaultFolder>;
  /**
   * Returns the immediate children (subfolders + files) of a folder.
   * parentFolderId = null → Home view (root-level items with no parent).
   */
  getVaultChildren: VaultChildrenResult;
  /**
   * Returns a short-lived presigned GET URL for downloading or previewing a vault file.
   * URL is valid for 5 minutes. Never cache — always request fresh.
   */
  getVaultDownloadUrl: VaultDownloadUrl;
  /**
   * Returns full metadata for a single vault folder or file.
   * Used for the detail/info side panel. Not used for listing.
   */
  getVaultNode: VaultNode;
  /**
   * Returns sidebar data: user-pinned folders + system folders (From Chat, From Pages, etc.).
   * Fetched once on Vault mount. Never re-called during folder navigation.
   */
  getVaultSidebar: VaultSidebar;
  /**
   * Returns current storage usage for the project and its workspace.
   * Poll every 60 seconds + invalidate after uploads/deletions.
   */
  getVaultUsage: VaultUsage;
  getWorkspaceInviteInfo: WorkspaceInviteInfo;
  health: Scalars['String']['output'];
  history: HistoryPayload;
  me?: Maybe<User>;
  messageReactions: Array<MessageReaction>;
  messagesDelta: MessagesDelta;
  myProjects: Array<Project>;
  myWorkspaces: Array<Workspace>;
  /** Get paginated notifications for the current user. */
  notifications: NotificationConnection;
  onboardingStatus: OnboardingStatus;
  project?: Maybe<Project>;
  projectBySlug?: Maybe<Project>;
  projectMembers: Array<ProjectMember>;
  projectOverview: ProjectOverview;
  projectRoles: Array<ProjectRole>;
  reactionUsers: ReactionUsersConnection;
  rolePermissions: Array<RolePermission>;
  /** Get count of unread notifications. */
  unreadNotificationCount: Scalars['Int']['output'];
  user?: Maybe<PublicUser>;
  userBoards: BoardConnection;
  workspaceBoards: BoardConnection;
  workspaceById?: Maybe<Workspace>;
  workspaceBySlug: Workspace;
  workspaceInvites: Array<WorkspaceInvite>;
  workspaceMembers: Array<WorkspaceMember>;
  workspaceOverview: WorkspaceOverview;
  workspaceRoles: Array<WorkspaceRole>;
  workspaceUser?: Maybe<WorkspaceMember>;
};


export type QueryActiveCollaboratorsArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryActiveContextArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryAllPermissionsArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryBoardCollaboratorsArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryGetActivePageCollaboratorsArgs = {
  pageId: Scalars['ID']['input'];
};


export type QueryGetBatchDownloadUrlsArgs = {
  fileIds: Array<Scalars['ID']['input']>;
};


export type QueryGetBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryGetBoardSnapshotArgs = {
  boardId: Scalars['ID']['input'];
  clientSnapshot?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetChannelMembersArgs = {
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetConversationArgs = {
  conversationId: Scalars['ID']['input'];
};


export type QueryGetDmByUsersArgs = {
  otherUserId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryGetIssueArgs = {
  issueId: Scalars['ID']['input'];
};


export type QueryGetIssueDescriptionUrlArgs = {
  issueId: Scalars['ID']['input'];
};


export type QueryGetIssueLabelsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryGetIssueStatusesArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryGetLastReadMessageArgs = {
  channelId: Scalars['ID']['input'];
};


export type QueryGetMessageByIdArgs = {
  messageId: Scalars['ID']['input'];
};


export type QueryGetMessagesAfterCursorArgs = {
  afterCursor: Scalars['ID']['input'];
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetMissingMessagesArgs = {
  channelId: Scalars['ID']['input'];
  rangeEnd: Scalars['ID']['input'];
  rangeStart: Scalars['ID']['input'];
};


export type QueryGetPageArgs = {
  pageId: Scalars['ID']['input'];
};


export type QueryGetPageCollaboratorsArgs = {
  pageId: Scalars['ID']['input'];
};


export type QueryGetPageSnapshotArgs = {
  pageId: Scalars['ID']['input'];
};


export type QueryGetProjectDmsArgs = {
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryGetProjectIssuesArgs = {
  assigneeId?: InputMaybe<Scalars['ID']['input']>;
  labelIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  priority?: InputMaybe<IssuePriority>;
  projectId: Scalars['ID']['input'];
};


export type QueryGetProjectPagesArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryGetReadReceiptsArgs = {
  messageId: Scalars['ID']['input'];
};


export type QueryGetThreadMessagesArgs = {
  beforeCursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  parentMessageId: Scalars['ID']['input'];
};


export type QueryGetUnreadCountsArgs = {
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryGetUserConversationsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  type?: InputMaybe<ConversationType>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryGetUsersByIdsArgs = {
  userIds: Array<Scalars['ID']['input']>;
};


export type QueryGetVaultAncestorsArgs = {
  folderId: Scalars['ID']['input'];
};


export type QueryGetVaultChildrenArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  parentFolderId?: InputMaybe<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
  sortBy?: InputMaybe<VaultSortField>;
  sortDir?: InputMaybe<SortDirection>;
};


export type QueryGetVaultDownloadUrlArgs = {
  fileId: Scalars['ID']['input'];
};


export type QueryGetVaultNodeArgs = {
  id: Scalars['ID']['input'];
  type: VaultNodeType;
};


export type QueryGetVaultSidebarArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryGetVaultUsageArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryGetWorkspaceInviteInfoArgs = {
  token: Scalars['String']['input'];
};


export type QueryHistoryArgs = {
  beforeSequence: Scalars['Int']['input'];
  conversationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMessageReactionsArgs = {
  messageId: Scalars['ID']['input'];
};


export type QueryMessagesDeltaArgs = {
  afterSequence?: InputMaybe<Scalars['Int']['input']>;
  afterStreamId?: InputMaybe<Scalars['String']['input']>;
  conversationId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyProjectsArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryNotificationsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  isRead?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectBySlugArgs = {
  slug: Scalars['String']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryProjectMembersArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectOverviewArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectRolesArgs = {
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryReactionUsersArgs = {
  cursor?: InputMaybe<Scalars['Int']['input']>;
  emoji: Scalars['String']['input'];
  messageId: Scalars['ID']['input'];
};


export type QueryRolePermissionsArgs = {
  roleId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUserBoardsArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceBoardsArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceByIdArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryWorkspaceInvitesArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceMembersArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceOverviewArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceRolesArgs = {
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceUserArgs = {
  userId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type ReactionUsersConnection = {
  __typename?: 'ReactionUsersConnection';
  nextCursor?: Maybe<Scalars['Int']['output']>;
  users: Array<User>;
};

export type ReadReceiptUser = {
  __typename?: 'ReadReceiptUser';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type ReadReceiptsResponse = {
  __typename?: 'ReadReceiptsResponse';
  readBy: Array<ReadReceiptUser>;
  totalMembers: Scalars['Int']['output'];
  totalReads: Scalars['Int']['output'];
};

export type RegisterExternalFileInput = {
  /** Optional override folder. Defaults to the source module's system folder. */
  folderId?: InputMaybe<Scalars['ID']['input']>;
  mimeType: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  /** File size in bytes. Use Float to stay JS-safe (no BigInt serialisation issues). */
  sizeBytes: Scalars['Float']['input'];
  /** Which module is uploading the file. Determines the system folder it lands in. */
  source: VaultFileSource;
  /**
   * ID of the originating entity (conversationId, pageId, boardId, issueId).
   * Nullable — may not yet exist when uploading before the entity is created.
   */
  sourceId?: InputMaybe<Scalars['ID']['input']>;
  workspaceId: Scalars['ID']['input'];
};

/**
 * Returned by registerExternalFile and requestVaultUpload.
 * The client must PUT the file bytes to presignedUrl, then call confirmVaultUpload.
 */
export type RegisterExternalFileResult = {
  __typename?: 'RegisterExternalFileResult';
  expiresAt: Scalars['DateTime']['output'];
  fileId: Scalars['ID']['output'];
  presignedUrl: Scalars['String']['output'];
};

export type RemoveBoardCollaboratorResult = {
  __typename?: 'RemoveBoardCollaboratorResult';
  success: Scalars['Boolean']['output'];
};

export type RemoveChannelMemberResult = {
  __typename?: 'RemoveChannelMemberResult';
  channelId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
};

export type RemoveGroupMemberResult = {
  __typename?: 'RemoveGroupMemberResult';
  groupId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
};

export type RemovePageCollaboratorInput = {
  pageId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemovePageCollaboratorResult = {
  __typename?: 'RemovePageCollaboratorResult';
  success: Scalars['Boolean']['output'];
};

export type RenameChannelInput = {
  channelId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type RenameFileResult = {
  __typename?: 'RenameFileResult';
  file: VaultFile;
};

export type RenameFolderResult = {
  __typename?: 'RenameFolderResult';
  folder: VaultFolder;
};

export type RenameGroupResult = {
  __typename?: 'RenameGroupResult';
  groupId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type RenamePageInput = {
  pageId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type RenamePageResult = {
  __typename?: 'RenamePageResult';
  page: Page;
};

export type RenameVaultFileInput = {
  fileId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type RenameVaultFolderInput = {
  folderId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type ReopenThreadResult = {
  __typename?: 'ReopenThreadResult';
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

export type ReorderIssueInput = {
  issueId: Scalars['ID']['input'];
  newPosition: Scalars['Float']['input'];
};

export type ReorderIssueResult = {
  __typename?: 'ReorderIssueResult';
  issue: Issue;
};

export type ReorderIssueStatusInput = {
  newPosition: Scalars['Float']['input'];
  statusId: Scalars['ID']['input'];
};

export type ReorderIssueStatusResult = {
  __typename?: 'ReorderIssueStatusResult';
  status: IssueStatus;
};

export type ReorderPageInput = {
  /** null = move to root (remove from parent) */
  newParentId?: InputMaybe<Scalars['ID']['input']>;
  newPosition: Scalars['Float']['input'];
  pageId: Scalars['ID']['input'];
};

export type ReorderPageResult = {
  __typename?: 'ReorderPageResult';
  page: Page;
};

export type RequestIssueDescriptionUploadInput = {
  issueId: Scalars['ID']['input'];
  sizeBytes: Scalars['Int']['input'];
};

export type RequestIssueDescriptionUploadResult = {
  __typename?: 'RequestIssueDescriptionUploadResult';
  descriptionFileId: Scalars['ID']['output'];
  expiresAt: Scalars['DateTime']['output'];
  presignedUrl: Scalars['String']['output'];
};

export type RequestUploadResult = {
  __typename?: 'RequestUploadResult';
  expiresAt: Scalars['DateTime']['output'];
  fileId: Scalars['ID']['output'];
  presignedUrl: Scalars['String']['output'];
};

export type RequestVaultUploadInput = {
  /** null = upload to Home (root level) */
  folderId?: InputMaybe<Scalars['ID']['input']>;
  mimeType: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  sizeBytes: Scalars['Int']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type RolePermission = {
  __typename?: 'RolePermission';
  conditions?: Maybe<Scalars['String']['output']>;
  effect: Scalars['String']['output'];
  permission: Permission;
  permissionId: Scalars['ID']['output'];
  roleId: Scalars['ID']['output'];
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type SubscribeThreadResult = {
  __typename?: 'SubscribeThreadResult';
  isSubscribed: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

export type Task = {
  __typename?: 'Task';
  id: Scalars['ID']['output'];
  statusName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ToggleFeatureFlagInput = {
  contextId?: InputMaybe<Scalars['ID']['input']>;
  contextType: FlagContextType;
  enabled: Scalars['Boolean']['input'];
  flagKey: Scalars['String']['input'];
};

export type ToggleFlagResult = {
  __typename?: 'ToggleFlagResult';
  enabled: Scalars['Boolean']['output'];
  flagKey: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UnarchiveChannelResult = {
  __typename?: 'UnarchiveChannelResult';
  channelId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UnarchivePageInput = {
  pageId: Scalars['ID']['input'];
};

export type UnarchivePageResult = {
  __typename?: 'UnarchivePageResult';
  page: Page;
};

export type UnlockPageInput = {
  pageId: Scalars['ID']['input'];
};

export type UnlockPageResult = {
  __typename?: 'UnlockPageResult';
  page: Page;
};

export type UnpinVaultFolderInput = {
  folderId: Scalars['ID']['input'];
};

export type UnreadCountsResponse = {
  __typename?: 'UnreadCountsResponse';
  conversations: Array<ConversationUnreadCount>;
};

export type UnsubscribeThreadResult = {
  __typename?: 'UnsubscribeThreadResult';
  isSubscribed: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

export type UpdateChannelDescriptionResult = {
  __typename?: 'UpdateChannelDescriptionResult';
  channelId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type UpdateChannelVisibilityResult = {
  __typename?: 'UpdateChannelVisibilityResult';
  channelId: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateIssueInput = {
  assigneeId?: InputMaybe<Scalars['ID']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  issueId: Scalars['ID']['input'];
  labelIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  priority?: InputMaybe<IssuePriority>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateIssueLabelInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  labelId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateIssueLabelResult = {
  __typename?: 'UpdateIssueLabelResult';
  label: IssueLabel;
};

export type UpdateIssueResult = {
  __typename?: 'UpdateIssueResult';
  issue: Issue;
};

export type UpdateIssueStatusInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  statusId: Scalars['ID']['input'];
};

export type UpdateIssueStatusResult = {
  __typename?: 'UpdateIssueStatusResult';
  status: IssueStatus;
};

export type UpdateProfileInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  rank?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateWorkspaceInput = {
  domainWhitelist?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkspaceRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  rank?: InputMaybe<Scalars['Int']['input']>;
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type UserBasic = {
  __typename?: 'UserBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type UserPresence = {
  __typename?: 'UserPresence';
  lastActiveAt?: Maybe<Scalars['DateTime']['output']>;
  status: PresenceStatus;
  userId: Scalars['ID']['output'];
};

/**
 * Result entry for a single file in a batch download URL request.
 * Clients must check status before using the url.
 */
export type VaultBatchDownloadResult = {
  __typename?: 'VaultBatchDownloadResult';
  fileId: Scalars['ID']['output'];
  mimeType: Scalars['String']['output'];
  name: Scalars['String']['output'];
  sizeBytes: Scalars['Float']['output'];
  /**
   * ACTIVE    — url is valid, render normally
   * DELETED   — file was removed; render tombstone ("Attachment deleted")
   * PENDING   — upload not yet confirmed; render placeholder
   * FORBIDDEN — caller is not a member of this file's project
   */
  status: Scalars['String']['output'];
  /** Presigned GET URL valid for 1 hour. Null when status != ACTIVE. */
  url?: Maybe<Scalars['String']['output']>;
};

export type VaultChildrenResult = {
  __typename?: 'VaultChildrenResult';
  files: Array<VaultFile>;
  folders: Array<VaultFolder>;
  hasNextPage: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['ID']['output']>;
  totalFileCount: Scalars['Int']['output'];
};

export type VaultDownloadUrl = {
  __typename?: 'VaultDownloadUrl';
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};

export type VaultFile = {
  __typename?: 'VaultFile';
  confirmedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  folderId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  mimeType: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
  s3Key: Scalars['String']['output'];
  /** File size in bytes (Float to safely represent large files >2GB) */
  sizeBytes: Scalars['Float']['output'];
  source: VaultFileSource;
  sourceId?: Maybe<Scalars['ID']['output']>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  uploader?: Maybe<VaultUploader>;
  uploaderUserId?: Maybe<Scalars['ID']['output']>;
  workspaceId: Scalars['ID']['output'];
};

export enum VaultFileSource {
  Chat = 'CHAT',
  Page = 'PAGE',
  Task = 'TASK',
  Vault = 'VAULT',
  Whiteboard = 'WHITEBOARD'
}

export type VaultFolder = {
  __typename?: 'VaultFolder';
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  parentFolderId?: Maybe<Scalars['ID']['output']>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type VaultNode = VaultFile | VaultFolder;

export enum VaultNodeType {
  File = 'FILE',
  Folder = 'FOLDER'
}

export type VaultSidebar = {
  __typename?: 'VaultSidebar';
  pinnedFolders: Array<VaultFolder>;
  systemFolders: Array<VaultFolder>;
};

export enum VaultSortField {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME',
  Size = 'SIZE',
  Type = 'TYPE'
}

export type VaultUploader = {
  __typename?: 'VaultUploader';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type VaultUsage = {
  __typename?: 'VaultUsage';
  percentUsed: Scalars['Float']['output'];
  projectFileCount: Scalars['Int']['output'];
  projectFileCountLimit: Scalars['Int']['output'];
  projectLimitBytes: Scalars['Float']['output'];
  projectReservedBytes: Scalars['Float']['output'];
  projectUsedBytes: Scalars['Float']['output'];
  workspaceFileCount: Scalars['Int']['output'];
  workspaceFileCountLimit: Scalars['Int']['output'];
  workspaceLimitBytes: Scalars['Float']['output'];
  workspaceReservedBytes: Scalars['Float']['output'];
  workspaceUsedBytes: Scalars['Float']['output'];
};

export type Whiteboard = {
  __typename?: 'Whiteboard';
  collaborators?: Maybe<Array<BoardCollaborator>>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['ID']['output'];
  creator: UserBasic;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  elementCount: Scalars['Int']['output'];
  fileSizeBytes: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isArchived: Scalars['Boolean']['output'];
  isLocked: Scalars['Boolean']['output'];
  projectId?: Maybe<Scalars['ID']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type Workspace = {
  __typename?: 'Workspace';
  createdAt: Scalars['String']['output'];
  domainWhitelist?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type WorkspaceInvite = {
  __typename?: 'WorkspaceInvite';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
};

export type WorkspaceInviteInfo = {
  __typename?: 'WorkspaceInviteInfo';
  inviterName?: Maybe<Scalars['String']['output']>;
  workspaceLogoUrl?: Maybe<Scalars['String']['output']>;
  workspaceName: Scalars['String']['output'];
};

export type WorkspaceMember = {
  __typename?: 'WorkspaceMember';
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  role: Scalars['String']['output'];
  user: User;
};

export type WorkspaceOverview = {
  __typename?: 'WorkspaceOverview';
  activeProjects: Array<WorkspaceOverviewProject>;
  recentMembers: Array<WorkspaceOverviewMember>;
  totalChannels: Scalars['Int']['output'];
  totalIssues: Scalars['Int']['output'];
  totalMembers: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
  totalProjects: Scalars['Int']['output'];
  urgentIssues: Array<WorkspaceOverviewIssue>;
};

export type WorkspaceOverviewIssue = {
  __typename?: 'WorkspaceOverviewIssue';
  assigneeId?: Maybe<Scalars['ID']['output']>;
  assigneeName?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  priority: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
  projectKey: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type WorkspaceOverviewMember = {
  __typename?: 'WorkspaceOverviewMember';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  joinedAt: Scalars['String']['output'];
  roleName: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type WorkspaceOverviewProject = {
  __typename?: 'WorkspaceOverviewProject';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  openIssues: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
};

export type WorkspaceRole = {
  __typename?: 'WorkspaceRole';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  scopeType: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  workspaceId: Scalars['ID']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  VaultNode:
    | ( GraphQLVaultFile )
    | ( GraphQLVaultFolder )
  ;
}>;


/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AcceptInviteInput: AcceptInviteInput;
  ActiveCollaborator: ResolverTypeWrapper<ActiveCollaborator>;
  ActiveFeatureFlag: ResolverTypeWrapper<ActiveFeatureFlag>;
  ActiveUserContext: ResolverTypeWrapper<ActiveUserContext>;
  AddBoardCollaboratorsResult: ResolverTypeWrapper<AddBoardCollaboratorsResult>;
  AddChannelMembersResult: ResolverTypeWrapper<AddChannelMembersResult>;
  AddGroupMembersResult: ResolverTypeWrapper<AddGroupMembersResult>;
  AddPageCollaboratorsInput: AddPageCollaboratorsInput;
  AddPageCollaboratorsResult: ResolverTypeWrapper<AddPageCollaboratorsResult>;
  ArchiveChannelInput: ArchiveChannelInput;
  ArchivePageInput: ArchivePageInput;
  ArchivePageResult: ResolverTypeWrapper<Omit<ArchivePageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  AvailabilityResponse: ResolverTypeWrapper<AvailabilityResponse>;
  BoardCollaborator: ResolverTypeWrapper<BoardCollaborator>;
  BoardConnection: ResolverTypeWrapper<BoardConnection>;
  BoardPayload: ResolverTypeWrapper<BoardPayload>;
  BoardSnapshot: ResolverTypeWrapper<BoardSnapshot>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ChannelAvailabilityResponse: ResolverTypeWrapper<ChannelAvailabilityResponse>;
  ChannelMemberInfo: ResolverTypeWrapper<ChannelMemberInfo>;
  ChatMemberRecord: ResolverTypeWrapper<PrismaChatMember>;
  ChatMessage: ResolverTypeWrapper<PrismaChatMessage>;
  CheckChannelAvailabilityInput: CheckChannelAvailabilityInput;
  CloseThreadResult: ResolverTypeWrapper<CloseThreadResult>;
  ConfirmIssueDescriptionUploadInput: ConfirmIssueDescriptionUploadInput;
  ConfirmIssueDescriptionUploadResult: ResolverTypeWrapper<Omit<ConfirmIssueDescriptionUploadResult, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  ConfirmUploadResult: ResolverTypeWrapper<Omit<ConfirmUploadResult, 'file'> & { file: ResolversTypes['VaultFile'] }>;
  ConfirmVaultUploadInput: ConfirmVaultUploadInput;
  Conversation: ResolverTypeWrapper<Omit<Conversation, 'members'> & { members?: Maybe<Array<ResolversTypes['ConversationMember']>> }>;
  ConversationConnection: ResolverTypeWrapper<Omit<ConversationConnection, 'edges'> & { edges: Array<ResolversTypes['Conversation']> }>;
  ConversationMember: ResolverTypeWrapper<PrismaChatMember>;
  ConversationType: ConversationType;
  ConversationUnreadCount: ResolverTypeWrapper<ConversationUnreadCount>;
  CreateBoardInput: CreateBoardInput;
  CreateChannelInput: CreateChannelInput;
  CreateDmInput: CreateDmInput;
  CreateFolderResult: ResolverTypeWrapper<Omit<CreateFolderResult, 'folder'> & { folder: ResolversTypes['VaultFolder'] }>;
  CreateGroupInput: CreateGroupInput;
  CreateIssueInput: CreateIssueInput;
  CreateIssueLabelInput: CreateIssueLabelInput;
  CreateIssueLabelResult: ResolverTypeWrapper<Omit<CreateIssueLabelResult, 'label'> & { label: ResolversTypes['IssueLabel'] }>;
  CreateIssueResult: ResolverTypeWrapper<Omit<CreateIssueResult, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  CreateIssueStatusInput: CreateIssueStatusInput;
  CreateIssueStatusResult: ResolverTypeWrapper<Omit<CreateIssueStatusResult, 'status'> & { status: ResolversTypes['IssueStatus'] }>;
  CreatePageInput: CreatePageInput;
  CreatePageResult: ResolverTypeWrapper<Omit<CreatePageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  CreateProjectInput: CreateProjectInput;
  CreateProjectRoleInput: CreateProjectRoleInput;
  CreateThreadInput: CreateThreadInput;
  CreateVaultFolderInput: CreateVaultFolderInput;
  CreateWorkspaceRoleInput: CreateWorkspaceRoleInput;
  CursorPosition: ResolverTypeWrapper<CursorPosition>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteBoardResult: ResolverTypeWrapper<DeleteBoardResult>;
  DeleteChannelResult: ResolverTypeWrapper<DeleteChannelResult>;
  DeleteDmResult: ResolverTypeWrapper<DeleteDmResult>;
  DeleteGroupResult: ResolverTypeWrapper<DeleteGroupResult>;
  DeleteIssueInput: DeleteIssueInput;
  DeleteIssueLabelInput: DeleteIssueLabelInput;
  DeleteIssueStatusInput: DeleteIssueStatusInput;
  DeletePageInput: DeletePageInput;
  DeletePageResult: ResolverTypeWrapper<DeletePageResult>;
  DeleteResult: ResolverTypeWrapper<DeleteResult>;
  DeleteThreadResult: ResolverTypeWrapper<DeleteThreadResult>;
  DeleteVaultFileInput: DeleteVaultFileInput;
  DeleteVaultFolderInput: DeleteVaultFolderInput;
  DmConversation: ResolverTypeWrapper<DmConversation>;
  DmMember: ResolverTypeWrapper<DmMember>;
  DmUserProfile: ResolverTypeWrapper<DmUserProfile>;
  FeatureFlagRecord: ResolverTypeWrapper<FeatureFlagRecord>;
  FlagContextType: FlagContextType;
  FlagOverrideRecord: ResolverTypeWrapper<FlagOverrideRecord>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GetPageSnapshotResult: ResolverTypeWrapper<GetPageSnapshotResult>;
  GroupMemberInfo: ResolverTypeWrapper<GroupMemberInfo>;
  HistoryPayload: ResolverTypeWrapper<Omit<HistoryPayload, 'messages'> & { messages: Array<ResolversTypes['ChatMessage']> }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InviteResponse: ResolverTypeWrapper<InviteResponse>;
  InviteToWorkspaceInput: InviteToWorkspaceInput;
  Issue: ResolverTypeWrapper<GraphQLIssue>;
  IssueDescriptionUrl: ResolverTypeWrapper<IssueDescriptionUrl>;
  IssueLabel: ResolverTypeWrapper<GraphQLIssueLabel>;
  IssuePriority: IssuePriority;
  IssueStatus: ResolverTypeWrapper<GraphQLIssueStatus>;
  IssueStatusCount: ResolverTypeWrapper<IssueStatusCount>;
  IssueUser: ResolverTypeWrapper<IssueUser>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JoinResponse: ResolverTypeWrapper<JoinResponse>;
  LastMessagePreview: ResolverTypeWrapper<LastMessagePreview>;
  LeaveGroupResult: ResolverTypeWrapper<LeaveGroupResult>;
  LockPageInput: LockPageInput;
  LockPageResult: ResolverTypeWrapper<Omit<LockPageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  MarkFilesUnreferencedInput: MarkFilesUnreferencedInput;
  MarkFilesUnreferencedResult: ResolverTypeWrapper<MarkFilesUnreferencedResult>;
  MessageReaction: ResolverTypeWrapper<Omit<MessageReaction, 'recentUsers'> & { recentUsers: Array<ResolversTypes['User']> }>;
  MessagesDelta: ResolverTypeWrapper<Omit<MessagesDelta, 'messages'> & { messages: Array<ResolversTypes['ChatMessage']> }>;
  MoveFileResult: ResolverTypeWrapper<Omit<MoveFileResult, 'file'> & { file: ResolversTypes['VaultFile'] }>;
  MoveFolderResult: ResolverTypeWrapper<Omit<MoveFolderResult, 'folder'> & { folder: ResolversTypes['VaultFolder'] }>;
  MoveIssueStatusInput: MoveIssueStatusInput;
  MoveIssueStatusResult: ResolverTypeWrapper<Omit<MoveIssueStatusResult, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  MoveVaultFileInput: MoveVaultFileInput;
  MoveVaultFolderInput: MoveVaultFolderInput;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MuteConversationResult: ResolverTypeWrapper<MuteConversationResult>;
  Notification: ResolverTypeWrapper<PrismaNotification>;
  NotificationConnection: ResolverTypeWrapper<Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversTypes['NotificationEdge']> }>;
  NotificationEdge: ResolverTypeWrapper<Omit<NotificationEdge, 'node'> & { node: ResolversTypes['Notification'] }>;
  OnboardingStatus: ResolverTypeWrapper<OnboardingStatus>;
  OverviewIssue: ResolverTypeWrapper<OverviewIssue>;
  OverviewMember: ResolverTypeWrapper<OverviewMember>;
  Page: ResolverTypeWrapper<GraphQLPagePartial>;
  PageCollaborator: ResolverTypeWrapper<PageCollaborator>;
  PageCollaboratorInput: PageCollaboratorInput;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PageRole: PageRole;
  PageSnapshot: ResolverTypeWrapper<PageSnapshot>;
  Permission: ResolverTypeWrapper<Permission>;
  PinFolderResult: ResolverTypeWrapper<Omit<PinFolderResult, 'folder'> & { folder: ResolversTypes['VaultFolder'] }>;
  PinVaultFolderInput: PinVaultFolderInput;
  PresenceStatus: PresenceStatus;
  Project: ResolverTypeWrapper<PrismaProject>;
  ProjectDmItem: ResolverTypeWrapper<ProjectDmItem>;
  ProjectMember: ResolverTypeWrapper<PrismaProjectMember>;
  ProjectOverview: ResolverTypeWrapper<ProjectOverview>;
  ProjectRole: ResolverTypeWrapper<ProjectRole>;
  PublicUser: ResolverTypeWrapper<PublicUser>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ReactionUsersConnection: ResolverTypeWrapper<Omit<ReactionUsersConnection, 'users'> & { users: Array<ResolversTypes['User']> }>;
  ReadReceiptUser: ResolverTypeWrapper<ReadReceiptUser>;
  ReadReceiptsResponse: ResolverTypeWrapper<ReadReceiptsResponse>;
  RegisterExternalFileInput: RegisterExternalFileInput;
  RegisterExternalFileResult: ResolverTypeWrapper<RegisterExternalFileResult>;
  RemoveBoardCollaboratorResult: ResolverTypeWrapper<RemoveBoardCollaboratorResult>;
  RemoveChannelMemberResult: ResolverTypeWrapper<RemoveChannelMemberResult>;
  RemoveGroupMemberResult: ResolverTypeWrapper<RemoveGroupMemberResult>;
  RemovePageCollaboratorInput: RemovePageCollaboratorInput;
  RemovePageCollaboratorResult: ResolverTypeWrapper<RemovePageCollaboratorResult>;
  RenameChannelInput: RenameChannelInput;
  RenameFileResult: ResolverTypeWrapper<Omit<RenameFileResult, 'file'> & { file: ResolversTypes['VaultFile'] }>;
  RenameFolderResult: ResolverTypeWrapper<Omit<RenameFolderResult, 'folder'> & { folder: ResolversTypes['VaultFolder'] }>;
  RenameGroupResult: ResolverTypeWrapper<RenameGroupResult>;
  RenamePageInput: RenamePageInput;
  RenamePageResult: ResolverTypeWrapper<Omit<RenamePageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  RenameVaultFileInput: RenameVaultFileInput;
  RenameVaultFolderInput: RenameVaultFolderInput;
  ReopenThreadResult: ResolverTypeWrapper<ReopenThreadResult>;
  ReorderIssueInput: ReorderIssueInput;
  ReorderIssueResult: ResolverTypeWrapper<Omit<ReorderIssueResult, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  ReorderIssueStatusInput: ReorderIssueStatusInput;
  ReorderIssueStatusResult: ResolverTypeWrapper<Omit<ReorderIssueStatusResult, 'status'> & { status: ResolversTypes['IssueStatus'] }>;
  ReorderPageInput: ReorderPageInput;
  ReorderPageResult: ResolverTypeWrapper<Omit<ReorderPageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  RequestIssueDescriptionUploadInput: RequestIssueDescriptionUploadInput;
  RequestIssueDescriptionUploadResult: ResolverTypeWrapper<RequestIssueDescriptionUploadResult>;
  RequestUploadResult: ResolverTypeWrapper<RequestUploadResult>;
  RequestVaultUploadInput: RequestVaultUploadInput;
  RolePermission: ResolverTypeWrapper<RolePermission>;
  SortDirection: SortDirection;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubscribeThreadResult: ResolverTypeWrapper<SubscribeThreadResult>;
  Task: ResolverTypeWrapper<Task>;
  ToggleFeatureFlagInput: ToggleFeatureFlagInput;
  ToggleFlagResult: ResolverTypeWrapper<ToggleFlagResult>;
  UnarchiveChannelResult: ResolverTypeWrapper<UnarchiveChannelResult>;
  UnarchivePageInput: UnarchivePageInput;
  UnarchivePageResult: ResolverTypeWrapper<Omit<UnarchivePageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  UnlockPageInput: UnlockPageInput;
  UnlockPageResult: ResolverTypeWrapper<Omit<UnlockPageResult, 'page'> & { page: ResolversTypes['Page'] }>;
  UnpinVaultFolderInput: UnpinVaultFolderInput;
  UnreadCountsResponse: ResolverTypeWrapper<UnreadCountsResponse>;
  UnsubscribeThreadResult: ResolverTypeWrapper<UnsubscribeThreadResult>;
  UpdateChannelDescriptionResult: ResolverTypeWrapper<UpdateChannelDescriptionResult>;
  UpdateChannelVisibilityResult: ResolverTypeWrapper<UpdateChannelVisibilityResult>;
  UpdateIssueInput: UpdateIssueInput;
  UpdateIssueLabelInput: UpdateIssueLabelInput;
  UpdateIssueLabelResult: ResolverTypeWrapper<Omit<UpdateIssueLabelResult, 'label'> & { label: ResolversTypes['IssueLabel'] }>;
  UpdateIssueResult: ResolverTypeWrapper<Omit<UpdateIssueResult, 'issue'> & { issue: ResolversTypes['Issue'] }>;
  UpdateIssueStatusInput: UpdateIssueStatusInput;
  UpdateIssueStatusResult: ResolverTypeWrapper<Omit<UpdateIssueStatusResult, 'status'> & { status: ResolversTypes['IssueStatus'] }>;
  UpdateProfileInput: UpdateProfileInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateProjectRoleInput: UpdateProjectRoleInput;
  UpdateWorkspaceInput: UpdateWorkspaceInput;
  UpdateWorkspaceRoleInput: UpdateWorkspaceRoleInput;
  User: ResolverTypeWrapper<PrismaUser>;
  UserBasic: ResolverTypeWrapper<UserBasic>;
  UserPresence: ResolverTypeWrapper<UserPresence>;
  VaultBatchDownloadResult: ResolverTypeWrapper<VaultBatchDownloadResult>;
  VaultChildrenResult: ResolverTypeWrapper<Omit<VaultChildrenResult, 'files' | 'folders'> & { files: Array<ResolversTypes['VaultFile']>, folders: Array<ResolversTypes['VaultFolder']> }>;
  VaultDownloadUrl: ResolverTypeWrapper<VaultDownloadUrl>;
  VaultFile: ResolverTypeWrapper<GraphQLVaultFile>;
  VaultFileSource: VaultFileSource;
  VaultFolder: ResolverTypeWrapper<GraphQLVaultFolder>;
  VaultNode: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['VaultNode']>;
  VaultNodeType: VaultNodeType;
  VaultSidebar: ResolverTypeWrapper<Omit<VaultSidebar, 'pinnedFolders' | 'systemFolders'> & { pinnedFolders: Array<ResolversTypes['VaultFolder']>, systemFolders: Array<ResolversTypes['VaultFolder']> }>;
  VaultSortField: VaultSortField;
  VaultUploader: ResolverTypeWrapper<VaultUploader>;
  VaultUsage: ResolverTypeWrapper<VaultUsage>;
  Whiteboard: ResolverTypeWrapper<Whiteboard>;
  Workspace: ResolverTypeWrapper<PrismaWorkspace>;
  WorkspaceInvite: ResolverTypeWrapper<WorkspaceInvite>;
  WorkspaceInviteInfo: ResolverTypeWrapper<WorkspaceInviteInfo>;
  WorkspaceMember: ResolverTypeWrapper<PrismaWorkspaceMember>;
  WorkspaceOverview: ResolverTypeWrapper<WorkspaceOverview>;
  WorkspaceOverviewIssue: ResolverTypeWrapper<WorkspaceOverviewIssue>;
  WorkspaceOverviewMember: ResolverTypeWrapper<WorkspaceOverviewMember>;
  WorkspaceOverviewProject: ResolverTypeWrapper<WorkspaceOverviewProject>;
  WorkspaceRole: ResolverTypeWrapper<WorkspaceRole>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptInviteInput: AcceptInviteInput;
  ActiveCollaborator: ActiveCollaborator;
  ActiveFeatureFlag: ActiveFeatureFlag;
  ActiveUserContext: ActiveUserContext;
  AddBoardCollaboratorsResult: AddBoardCollaboratorsResult;
  AddChannelMembersResult: AddChannelMembersResult;
  AddGroupMembersResult: AddGroupMembersResult;
  AddPageCollaboratorsInput: AddPageCollaboratorsInput;
  AddPageCollaboratorsResult: AddPageCollaboratorsResult;
  ArchiveChannelInput: ArchiveChannelInput;
  ArchivePageInput: ArchivePageInput;
  ArchivePageResult: Omit<ArchivePageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  AvailabilityResponse: AvailabilityResponse;
  BoardCollaborator: BoardCollaborator;
  BoardConnection: BoardConnection;
  BoardPayload: BoardPayload;
  BoardSnapshot: BoardSnapshot;
  Boolean: Scalars['Boolean']['output'];
  ChannelAvailabilityResponse: ChannelAvailabilityResponse;
  ChannelMemberInfo: ChannelMemberInfo;
  ChatMemberRecord: PrismaChatMember;
  ChatMessage: PrismaChatMessage;
  CheckChannelAvailabilityInput: CheckChannelAvailabilityInput;
  CloseThreadResult: CloseThreadResult;
  ConfirmIssueDescriptionUploadInput: ConfirmIssueDescriptionUploadInput;
  ConfirmIssueDescriptionUploadResult: Omit<ConfirmIssueDescriptionUploadResult, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  ConfirmUploadResult: Omit<ConfirmUploadResult, 'file'> & { file: ResolversParentTypes['VaultFile'] };
  ConfirmVaultUploadInput: ConfirmVaultUploadInput;
  Conversation: Omit<Conversation, 'members'> & { members?: Maybe<Array<ResolversParentTypes['ConversationMember']>> };
  ConversationConnection: Omit<ConversationConnection, 'edges'> & { edges: Array<ResolversParentTypes['Conversation']> };
  ConversationMember: PrismaChatMember;
  ConversationUnreadCount: ConversationUnreadCount;
  CreateBoardInput: CreateBoardInput;
  CreateChannelInput: CreateChannelInput;
  CreateDmInput: CreateDmInput;
  CreateFolderResult: Omit<CreateFolderResult, 'folder'> & { folder: ResolversParentTypes['VaultFolder'] };
  CreateGroupInput: CreateGroupInput;
  CreateIssueInput: CreateIssueInput;
  CreateIssueLabelInput: CreateIssueLabelInput;
  CreateIssueLabelResult: Omit<CreateIssueLabelResult, 'label'> & { label: ResolversParentTypes['IssueLabel'] };
  CreateIssueResult: Omit<CreateIssueResult, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  CreateIssueStatusInput: CreateIssueStatusInput;
  CreateIssueStatusResult: Omit<CreateIssueStatusResult, 'status'> & { status: ResolversParentTypes['IssueStatus'] };
  CreatePageInput: CreatePageInput;
  CreatePageResult: Omit<CreatePageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  CreateProjectInput: CreateProjectInput;
  CreateProjectRoleInput: CreateProjectRoleInput;
  CreateThreadInput: CreateThreadInput;
  CreateVaultFolderInput: CreateVaultFolderInput;
  CreateWorkspaceRoleInput: CreateWorkspaceRoleInput;
  CursorPosition: CursorPosition;
  DateTime: Scalars['DateTime']['output'];
  DeleteBoardResult: DeleteBoardResult;
  DeleteChannelResult: DeleteChannelResult;
  DeleteDmResult: DeleteDmResult;
  DeleteGroupResult: DeleteGroupResult;
  DeleteIssueInput: DeleteIssueInput;
  DeleteIssueLabelInput: DeleteIssueLabelInput;
  DeleteIssueStatusInput: DeleteIssueStatusInput;
  DeletePageInput: DeletePageInput;
  DeletePageResult: DeletePageResult;
  DeleteResult: DeleteResult;
  DeleteThreadResult: DeleteThreadResult;
  DeleteVaultFileInput: DeleteVaultFileInput;
  DeleteVaultFolderInput: DeleteVaultFolderInput;
  DmConversation: DmConversation;
  DmMember: DmMember;
  DmUserProfile: DmUserProfile;
  FeatureFlagRecord: FeatureFlagRecord;
  FlagOverrideRecord: FlagOverrideRecord;
  Float: Scalars['Float']['output'];
  GetPageSnapshotResult: GetPageSnapshotResult;
  GroupMemberInfo: GroupMemberInfo;
  HistoryPayload: Omit<HistoryPayload, 'messages'> & { messages: Array<ResolversParentTypes['ChatMessage']> };
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  InviteResponse: InviteResponse;
  InviteToWorkspaceInput: InviteToWorkspaceInput;
  Issue: GraphQLIssue;
  IssueDescriptionUrl: IssueDescriptionUrl;
  IssueLabel: GraphQLIssueLabel;
  IssueStatus: GraphQLIssueStatus;
  IssueStatusCount: IssueStatusCount;
  IssueUser: IssueUser;
  JSON: Scalars['JSON']['output'];
  JoinResponse: JoinResponse;
  LastMessagePreview: LastMessagePreview;
  LeaveGroupResult: LeaveGroupResult;
  LockPageInput: LockPageInput;
  LockPageResult: Omit<LockPageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  MarkFilesUnreferencedInput: MarkFilesUnreferencedInput;
  MarkFilesUnreferencedResult: MarkFilesUnreferencedResult;
  MessageReaction: Omit<MessageReaction, 'recentUsers'> & { recentUsers: Array<ResolversParentTypes['User']> };
  MessagesDelta: Omit<MessagesDelta, 'messages'> & { messages: Array<ResolversParentTypes['ChatMessage']> };
  MoveFileResult: Omit<MoveFileResult, 'file'> & { file: ResolversParentTypes['VaultFile'] };
  MoveFolderResult: Omit<MoveFolderResult, 'folder'> & { folder: ResolversParentTypes['VaultFolder'] };
  MoveIssueStatusInput: MoveIssueStatusInput;
  MoveIssueStatusResult: Omit<MoveIssueStatusResult, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  MoveVaultFileInput: MoveVaultFileInput;
  MoveVaultFolderInput: MoveVaultFolderInput;
  Mutation: Record<PropertyKey, never>;
  MuteConversationResult: MuteConversationResult;
  Notification: PrismaNotification;
  NotificationConnection: Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversParentTypes['NotificationEdge']> };
  NotificationEdge: Omit<NotificationEdge, 'node'> & { node: ResolversParentTypes['Notification'] };
  OnboardingStatus: OnboardingStatus;
  OverviewIssue: OverviewIssue;
  OverviewMember: OverviewMember;
  Page: GraphQLPagePartial;
  PageCollaborator: PageCollaborator;
  PageCollaboratorInput: PageCollaboratorInput;
  PageInfo: PageInfo;
  PageSnapshot: PageSnapshot;
  Permission: Permission;
  PinFolderResult: Omit<PinFolderResult, 'folder'> & { folder: ResolversParentTypes['VaultFolder'] };
  PinVaultFolderInput: PinVaultFolderInput;
  Project: PrismaProject;
  ProjectDmItem: ProjectDmItem;
  ProjectMember: PrismaProjectMember;
  ProjectOverview: ProjectOverview;
  ProjectRole: ProjectRole;
  PublicUser: PublicUser;
  Query: Record<PropertyKey, never>;
  ReactionUsersConnection: Omit<ReactionUsersConnection, 'users'> & { users: Array<ResolversParentTypes['User']> };
  ReadReceiptUser: ReadReceiptUser;
  ReadReceiptsResponse: ReadReceiptsResponse;
  RegisterExternalFileInput: RegisterExternalFileInput;
  RegisterExternalFileResult: RegisterExternalFileResult;
  RemoveBoardCollaboratorResult: RemoveBoardCollaboratorResult;
  RemoveChannelMemberResult: RemoveChannelMemberResult;
  RemoveGroupMemberResult: RemoveGroupMemberResult;
  RemovePageCollaboratorInput: RemovePageCollaboratorInput;
  RemovePageCollaboratorResult: RemovePageCollaboratorResult;
  RenameChannelInput: RenameChannelInput;
  RenameFileResult: Omit<RenameFileResult, 'file'> & { file: ResolversParentTypes['VaultFile'] };
  RenameFolderResult: Omit<RenameFolderResult, 'folder'> & { folder: ResolversParentTypes['VaultFolder'] };
  RenameGroupResult: RenameGroupResult;
  RenamePageInput: RenamePageInput;
  RenamePageResult: Omit<RenamePageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  RenameVaultFileInput: RenameVaultFileInput;
  RenameVaultFolderInput: RenameVaultFolderInput;
  ReopenThreadResult: ReopenThreadResult;
  ReorderIssueInput: ReorderIssueInput;
  ReorderIssueResult: Omit<ReorderIssueResult, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  ReorderIssueStatusInput: ReorderIssueStatusInput;
  ReorderIssueStatusResult: Omit<ReorderIssueStatusResult, 'status'> & { status: ResolversParentTypes['IssueStatus'] };
  ReorderPageInput: ReorderPageInput;
  ReorderPageResult: Omit<ReorderPageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  RequestIssueDescriptionUploadInput: RequestIssueDescriptionUploadInput;
  RequestIssueDescriptionUploadResult: RequestIssueDescriptionUploadResult;
  RequestUploadResult: RequestUploadResult;
  RequestVaultUploadInput: RequestVaultUploadInput;
  RolePermission: RolePermission;
  String: Scalars['String']['output'];
  SubscribeThreadResult: SubscribeThreadResult;
  Task: Task;
  ToggleFeatureFlagInput: ToggleFeatureFlagInput;
  ToggleFlagResult: ToggleFlagResult;
  UnarchiveChannelResult: UnarchiveChannelResult;
  UnarchivePageInput: UnarchivePageInput;
  UnarchivePageResult: Omit<UnarchivePageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  UnlockPageInput: UnlockPageInput;
  UnlockPageResult: Omit<UnlockPageResult, 'page'> & { page: ResolversParentTypes['Page'] };
  UnpinVaultFolderInput: UnpinVaultFolderInput;
  UnreadCountsResponse: UnreadCountsResponse;
  UnsubscribeThreadResult: UnsubscribeThreadResult;
  UpdateChannelDescriptionResult: UpdateChannelDescriptionResult;
  UpdateChannelVisibilityResult: UpdateChannelVisibilityResult;
  UpdateIssueInput: UpdateIssueInput;
  UpdateIssueLabelInput: UpdateIssueLabelInput;
  UpdateIssueLabelResult: Omit<UpdateIssueLabelResult, 'label'> & { label: ResolversParentTypes['IssueLabel'] };
  UpdateIssueResult: Omit<UpdateIssueResult, 'issue'> & { issue: ResolversParentTypes['Issue'] };
  UpdateIssueStatusInput: UpdateIssueStatusInput;
  UpdateIssueStatusResult: Omit<UpdateIssueStatusResult, 'status'> & { status: ResolversParentTypes['IssueStatus'] };
  UpdateProfileInput: UpdateProfileInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateProjectRoleInput: UpdateProjectRoleInput;
  UpdateWorkspaceInput: UpdateWorkspaceInput;
  UpdateWorkspaceRoleInput: UpdateWorkspaceRoleInput;
  User: PrismaUser;
  UserBasic: UserBasic;
  UserPresence: UserPresence;
  VaultBatchDownloadResult: VaultBatchDownloadResult;
  VaultChildrenResult: Omit<VaultChildrenResult, 'files' | 'folders'> & { files: Array<ResolversParentTypes['VaultFile']>, folders: Array<ResolversParentTypes['VaultFolder']> };
  VaultDownloadUrl: VaultDownloadUrl;
  VaultFile: GraphQLVaultFile;
  VaultFolder: GraphQLVaultFolder;
  VaultNode: ResolversUnionTypes<ResolversParentTypes>['VaultNode'];
  VaultSidebar: Omit<VaultSidebar, 'pinnedFolders' | 'systemFolders'> & { pinnedFolders: Array<ResolversParentTypes['VaultFolder']>, systemFolders: Array<ResolversParentTypes['VaultFolder']> };
  VaultUploader: VaultUploader;
  VaultUsage: VaultUsage;
  Whiteboard: Whiteboard;
  Workspace: PrismaWorkspace;
  WorkspaceInvite: WorkspaceInvite;
  WorkspaceInviteInfo: WorkspaceInviteInfo;
  WorkspaceMember: PrismaWorkspaceMember;
  WorkspaceOverview: WorkspaceOverview;
  WorkspaceOverviewIssue: WorkspaceOverviewIssue;
  WorkspaceOverviewMember: WorkspaceOverviewMember;
  WorkspaceOverviewProject: WorkspaceOverviewProject;
  WorkspaceRole: WorkspaceRole;
}>;

export type ActiveCollaboratorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ActiveCollaborator'] = ResolversParentTypes['ActiveCollaborator']> = ResolversObject<{
  connectionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  cursorPosition?: Resolver<Maybe<ResolversTypes['CursorPosition']>, ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lastSeenAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ActiveFeatureFlagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ActiveFeatureFlag'] = ResolversParentTypes['ActiveFeatureFlag']> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ActiveUserContextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ActiveUserContext'] = ResolversParentTypes['ActiveUserContext']> = ResolversObject<{
  featureFlags?: Resolver<Array<ResolversTypes['ActiveFeatureFlag']>, ParentType, ContextType>;
  grantedPermissions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  projectRole?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  workspaceRole?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type AddBoardCollaboratorsResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AddBoardCollaboratorsResult'] = ResolversParentTypes['AddBoardCollaboratorsResult']> = ResolversObject<{
  addedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type AddChannelMembersResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AddChannelMembersResult'] = ResolversParentTypes['AddChannelMembersResult']> = ResolversObject<{
  addedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['ChannelMemberInfo']>, ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type AddGroupMembersResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AddGroupMembersResult'] = ResolversParentTypes['AddGroupMembersResult']> = ResolversObject<{
  addedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['GroupMemberInfo']>, ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type AddPageCollaboratorsResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AddPageCollaboratorsResult'] = ResolversParentTypes['AddPageCollaboratorsResult']> = ResolversObject<{
  addedCollaborators?: Resolver<Array<ResolversTypes['PageCollaborator']>, ParentType, ContextType>;
}>;

export type ArchivePageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ArchivePageResult'] = ResolversParentTypes['ArchivePageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type AvailabilityResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AvailabilityResponse'] = ResolversParentTypes['AvailabilityResponse']> = ResolversObject<{
  available?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reservationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type BoardCollaboratorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BoardCollaborator'] = ResolversParentTypes['BoardCollaborator']> = ResolversObject<{
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type BoardConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BoardConnection'] = ResolversParentTypes['BoardConnection']> = ResolversObject<{
  boards?: Resolver<Array<ResolversTypes['Whiteboard']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type BoardPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BoardPayload'] = ResolversParentTypes['BoardPayload']> = ResolversObject<{
  addedCollaborators?: Resolver<Array<ResolversTypes['BoardCollaborator']>, ParentType, ContextType>;
  board?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType>;
}>;

export type BoardSnapshotResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BoardSnapshot'] = ResolversParentTypes['BoardSnapshot']> = ResolversObject<{
  boardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastStreamId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snapshotTimestamp?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type ChannelAvailabilityResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ChannelAvailabilityResponse'] = ResolversParentTypes['ChannelAvailabilityResponse']> = ResolversObject<{
  available?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reservationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ChannelMemberInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ChannelMemberInfo'] = ResolversParentTypes['ChannelMemberInfo']> = ResolversObject<{
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ChatMemberRecordResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ChatMemberRecord'] = ResolversParentTypes['ChatMemberRecord']> = ResolversObject<{
  conversationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isMuted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lastDeliveredMsgId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  lastReadMsgId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ChatMessageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ChatMessage'] = ResolversParentTypes['ChatMessage']> = ResolversObject<{
  authorUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  conversationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  editedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isEdited?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  parentMessageId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  replyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  streamId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CloseThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CloseThreadResult'] = ResolversParentTypes['CloseThreadResult']> = ResolversObject<{
  closedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ConfirmIssueDescriptionUploadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ConfirmIssueDescriptionUploadResult'] = ResolversParentTypes['ConfirmIssueDescriptionUploadResult']> = ResolversObject<{
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
}>;

export type ConfirmUploadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ConfirmUploadResult'] = ResolversParentTypes['ConfirmUploadResult']> = ResolversObject<{
  file?: Resolver<ResolversTypes['VaultFile'], ParentType, ContextType>;
}>;

export type ConversationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Conversation'] = ResolversParentTypes['Conversation']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastMessage?: Resolver<Maybe<ResolversTypes['LastMessagePreview']>, ParentType, ContextType>;
  memberCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  members?: Resolver<Maybe<Array<ResolversTypes['ConversationMember']>>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentMessageId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  topic?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ConversationType'], ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ConversationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ConversationConnection'] = ResolversParentTypes['ConversationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['Conversation']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
}>;

export type ConversationMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ConversationMember'] = ResolversParentTypes['ConversationMember']> = ResolversObject<{
  isMuted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ConversationUnreadCountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ConversationUnreadCount'] = ResolversParentTypes['ConversationUnreadCount']> = ResolversObject<{
  conversationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastUnreadMessageId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CreateFolderResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateFolderResult'] = ResolversParentTypes['CreateFolderResult']> = ResolversObject<{
  folder?: Resolver<ResolversTypes['VaultFolder'], ParentType, ContextType>;
}>;

export type CreateIssueLabelResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateIssueLabelResult'] = ResolversParentTypes['CreateIssueLabelResult']> = ResolversObject<{
  label?: Resolver<ResolversTypes['IssueLabel'], ParentType, ContextType>;
}>;

export type CreateIssueResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateIssueResult'] = ResolversParentTypes['CreateIssueResult']> = ResolversObject<{
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
}>;

export type CreateIssueStatusResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateIssueStatusResult'] = ResolversParentTypes['CreateIssueStatusResult']> = ResolversObject<{
  status?: Resolver<ResolversTypes['IssueStatus'], ParentType, ContextType>;
}>;

export type CreatePageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreatePageResult'] = ResolversParentTypes['CreatePageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type CursorPositionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CursorPosition'] = ResolversParentTypes['CursorPosition']> = ResolversObject<{
  x?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteBoardResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteBoardResult'] = ResolversParentTypes['DeleteBoardResult']> = ResolversObject<{
  boardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteChannelResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteChannelResult'] = ResolversParentTypes['DeleteChannelResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteDmResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteDmResult'] = ResolversParentTypes['DeleteDmResult']> = ResolversObject<{
  dmId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteGroupResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteGroupResult'] = ResolversParentTypes['DeleteGroupResult']> = ResolversObject<{
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeletePageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeletePageResult'] = ResolversParentTypes['DeletePageResult']> = ResolversObject<{
  pageId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteResult'] = ResolversParentTypes['DeleteResult']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteThreadResult'] = ResolversParentTypes['DeleteThreadResult']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type DmConversationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DmConversation'] = ResolversParentTypes['DmConversation']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  memberCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['DmMember']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ConversationType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type DmMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DmMember'] = ResolversParentTypes['DmMember']> = ResolversObject<{
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type DmUserProfileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DmUserProfile'] = ResolversParentTypes['DmUserProfile']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fullName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type FeatureFlagRecordResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FeatureFlagRecord'] = ResolversParentTypes['FeatureFlagRecord']> = ResolversObject<{
  defaultEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  overrides?: Resolver<Array<ResolversTypes['FlagOverrideRecord']>, ParentType, ContextType>;
}>;

export type FlagOverrideRecordResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FlagOverrideRecord'] = ResolversParentTypes['FlagOverrideRecord']> = ResolversObject<{
  contextId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  contextType?: Resolver<ResolversTypes['FlagContextType'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GetPageSnapshotResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GetPageSnapshotResult'] = ResolversParentTypes['GetPageSnapshotResult']> = ResolversObject<{
  lastStreamId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pageId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snapshotTimestamp?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type GroupMemberInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GroupMemberInfo'] = ResolversParentTypes['GroupMemberInfo']> = ResolversObject<{
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type HistoryPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['HistoryPayload'] = ResolversParentTypes['HistoryPayload']> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  messages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType>;
  minSequence?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type InviteResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InviteResponse'] = ResolversParentTypes['InviteResponse']> = ResolversObject<{
  invitedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type IssueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Issue'] = ResolversParentTypes['Issue']> = ResolversObject<{
  assignee?: Resolver<Maybe<ResolversTypes['IssueUser']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['IssueUser'], ParentType, ContextType>;
  descriptionS3Key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  labels?: Resolver<Array<ResolversTypes['IssueLabel']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['IssuePriority'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['IssueStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IssueDescriptionUrlResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['IssueDescriptionUrl'] = ResolversParentTypes['IssueDescriptionUrl']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IssueLabelResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['IssueLabel'] = ResolversParentTypes['IssueLabel']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IssueStatusResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['IssueStatus'] = ResolversParentTypes['IssueStatus']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  icon?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  issueCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type IssueStatusCountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['IssueStatusCount'] = ResolversParentTypes['IssueStatusCount']> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  icon?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  issueCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  statusId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IssueUserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['IssueUser'] = ResolversParentTypes['IssueUser']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JoinResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['JoinResponse'] = ResolversParentTypes['JoinResponse']> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  workspaceSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type LastMessagePreviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LastMessagePreview'] = ResolversParentTypes['LastMessagePreview']> = ResolversObject<{
  authorUserId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type LeaveGroupResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LeaveGroupResult'] = ResolversParentTypes['LeaveGroupResult']> = ResolversObject<{
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type LockPageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LockPageResult'] = ResolversParentTypes['LockPageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type MarkFilesUnreferencedResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MarkFilesUnreferencedResult'] = ResolversParentTypes['MarkFilesUnreferencedResult']> = ResolversObject<{
  markedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MessageReactionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MessageReaction'] = ResolversParentTypes['MessageReaction']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  emoji?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasReacted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recentUsers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type MessagesDeltaResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MessagesDelta'] = ResolversParentTypes['MessagesDelta']> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastSequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  messages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType>;
}>;

export type MoveFileResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MoveFileResult'] = ResolversParentTypes['MoveFileResult']> = ResolversObject<{
  file?: Resolver<ResolversTypes['VaultFile'], ParentType, ContextType>;
}>;

export type MoveFolderResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MoveFolderResult'] = ResolversParentTypes['MoveFolderResult']> = ResolversObject<{
  folder?: Resolver<ResolversTypes['VaultFolder'], ParentType, ContextType>;
}>;

export type MoveIssueStatusResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MoveIssueStatusResult'] = ResolversParentTypes['MoveIssueStatusResult']> = ResolversObject<{
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _health?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  acceptWorkspaceInvite?: Resolver<ResolversTypes['JoinResponse'], ParentType, ContextType, RequireFields<MutationAcceptWorkspaceInviteArgs, 'input'>>;
  addBoardCollaborators?: Resolver<ResolversTypes['AddBoardCollaboratorsResult'], ParentType, ContextType, RequireFields<MutationAddBoardCollaboratorsArgs, 'boardId' | 'userIds'>>;
  addChannelMembers?: Resolver<ResolversTypes['AddChannelMembersResult'], ParentType, ContextType, RequireFields<MutationAddChannelMembersArgs, 'channelId' | 'userIds' | 'workspaceId'>>;
  addGroupMembers?: Resolver<ResolversTypes['AddGroupMembersResult'], ParentType, ContextType, RequireFields<MutationAddGroupMembersArgs, 'groupId' | 'userIds' | 'workspaceId'>>;
  addPageCollaborators?: Resolver<ResolversTypes['AddPageCollaboratorsResult'], ParentType, ContextType, RequireFields<MutationAddPageCollaboratorsArgs, 'input'>>;
  addProjectMember?: Resolver<ResolversTypes['ProjectMember'], ParentType, ContextType, RequireFields<MutationAddProjectMemberArgs, 'projectId' | 'roleId' | 'userId' | 'workspaceId'>>;
  archiveBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationArchiveBoardArgs, 'boardId'>>;
  archiveChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationArchiveChannelArgs, 'input'>>;
  archivePage?: Resolver<ResolversTypes['ArchivePageResult'], ParentType, ContextType, RequireFields<MutationArchivePageArgs, 'input'>>;
  archiveProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationArchiveProjectArgs, 'projectId'>>;
  assignRolePermission?: Resolver<ResolversTypes['RolePermission'], ParentType, ContextType, RequireFields<MutationAssignRolePermissionArgs, 'permissionId' | 'roleId' | 'workspaceId'>>;
  cancelWorkspaceInvite?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationCancelWorkspaceInviteArgs, 'inviteId' | 'workspaceId'>>;
  checkChannelAvailability?: Resolver<ResolversTypes['ChannelAvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckChannelAvailabilityArgs, 'input'>>;
  checkProjectSlugAvailability?: Resolver<ResolversTypes['AvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckProjectSlugAvailabilityArgs, 'slug' | 'workspaceId'>>;
  checkSlugAvailability?: Resolver<ResolversTypes['AvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckSlugAvailabilityArgs, 'slug'>>;
  closeThread?: Resolver<ResolversTypes['CloseThreadResult'], ParentType, ContextType, RequireFields<MutationCloseThreadArgs, 'threadId' | 'workspaceId'>>;
  confirmIssueDescriptionUpload?: Resolver<ResolversTypes['ConfirmIssueDescriptionUploadResult'], ParentType, ContextType, RequireFields<MutationConfirmIssueDescriptionUploadArgs, 'input'>>;
  confirmVaultUpload?: Resolver<ResolversTypes['ConfirmUploadResult'], ParentType, ContextType, RequireFields<MutationConfirmVaultUploadArgs, 'input'>>;
  createBoard?: Resolver<ResolversTypes['BoardPayload'], ParentType, ContextType, RequireFields<MutationCreateBoardArgs, 'input'>>;
  createChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateChannelArgs, 'input'>>;
  createDm?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateDmArgs, 'input'>>;
  createGroup?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateGroupArgs, 'input'>>;
  createIssue?: Resolver<ResolversTypes['CreateIssueResult'], ParentType, ContextType, RequireFields<MutationCreateIssueArgs, 'input'>>;
  createIssueLabel?: Resolver<ResolversTypes['CreateIssueLabelResult'], ParentType, ContextType, RequireFields<MutationCreateIssueLabelArgs, 'input'>>;
  createIssueStatus?: Resolver<ResolversTypes['CreateIssueStatusResult'], ParentType, ContextType, RequireFields<MutationCreateIssueStatusArgs, 'input'>>;
  createOnboardingWorkspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType>;
  createPage?: Resolver<ResolversTypes['CreatePageResult'], ParentType, ContextType, RequireFields<MutationCreatePageArgs, 'input'>>;
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input' | 'workspaceId'>>;
  createProjectRole?: Resolver<ResolversTypes['ProjectRole'], ParentType, ContextType, RequireFields<MutationCreateProjectRoleArgs, 'input' | 'projectId' | 'workspaceId'>>;
  createThread?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateThreadArgs, 'input'>>;
  createVaultFolder?: Resolver<ResolversTypes['CreateFolderResult'], ParentType, ContextType, RequireFields<MutationCreateVaultFolderArgs, 'input'>>;
  createWorkspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType, RequireFields<MutationCreateWorkspaceArgs, 'name' | 'slug'>>;
  createWorkspaceRole?: Resolver<ResolversTypes['WorkspaceRole'], ParentType, ContextType, RequireFields<MutationCreateWorkspaceRoleArgs, 'input' | 'workspaceId'>>;
  deleteAccount?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deleteBoard?: Resolver<ResolversTypes['DeleteBoardResult'], ParentType, ContextType, RequireFields<MutationDeleteBoardArgs, 'boardId'>>;
  deleteChannel?: Resolver<ResolversTypes['DeleteChannelResult'], ParentType, ContextType, RequireFields<MutationDeleteChannelArgs, 'channelId' | 'workspaceId'>>;
  deleteDm?: Resolver<ResolversTypes['DeleteDmResult'], ParentType, ContextType, RequireFields<MutationDeleteDmArgs, 'dmId' | 'workspaceId'>>;
  deleteGroup?: Resolver<ResolversTypes['DeleteGroupResult'], ParentType, ContextType, RequireFields<MutationDeleteGroupArgs, 'groupId' | 'workspaceId'>>;
  deleteIssue?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationDeleteIssueArgs, 'input'>>;
  deleteIssueLabel?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationDeleteIssueLabelArgs, 'input'>>;
  deleteIssueStatus?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationDeleteIssueStatusArgs, 'input'>>;
  deletePage?: Resolver<ResolversTypes['DeletePageResult'], ParentType, ContextType, RequireFields<MutationDeletePageArgs, 'input'>>;
  deleteProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'projectId'>>;
  deleteProjectRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProjectRoleArgs, 'projectId' | 'roleId' | 'workspaceId'>>;
  deleteThread?: Resolver<ResolversTypes['DeleteThreadResult'], ParentType, ContextType, RequireFields<MutationDeleteThreadArgs, 'threadId' | 'workspaceId'>>;
  deleteVaultFile?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationDeleteVaultFileArgs, 'input'>>;
  deleteVaultFolder?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationDeleteVaultFolderArgs, 'input'>>;
  deleteWorkspace?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteWorkspaceArgs, 'workspaceId'>>;
  deleteWorkspaceRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteWorkspaceRoleArgs, 'roleId' | 'workspaceId'>>;
  inviteToWorkspace?: Resolver<ResolversTypes['InviteResponse'], ParentType, ContextType, RequireFields<MutationInviteToWorkspaceArgs, 'input'>>;
  leaveGroup?: Resolver<ResolversTypes['LeaveGroupResult'], ParentType, ContextType, RequireFields<MutationLeaveGroupArgs, 'groupId' | 'workspaceId'>>;
  leaveProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationLeaveProjectArgs, 'projectId'>>;
  leaveWorkspace?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationLeaveWorkspaceArgs, 'workspaceId'>>;
  lockBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationLockBoardArgs, 'boardId'>>;
  lockPage?: Resolver<ResolversTypes['LockPageResult'], ParentType, ContextType, RequireFields<MutationLockPageArgs, 'input'>>;
  markAllNotificationsRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  markFilesUnreferenced?: Resolver<ResolversTypes['MarkFilesUnreferencedResult'], ParentType, ContextType, RequireFields<MutationMarkFilesUnreferencedArgs, 'input'>>;
  markNotificationRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationMarkNotificationReadArgs, 'ids'>>;
  moveIssueStatus?: Resolver<ResolversTypes['MoveIssueStatusResult'], ParentType, ContextType, RequireFields<MutationMoveIssueStatusArgs, 'input'>>;
  moveVaultFile?: Resolver<ResolversTypes['MoveFileResult'], ParentType, ContextType, RequireFields<MutationMoveVaultFileArgs, 'input'>>;
  moveVaultFolder?: Resolver<ResolversTypes['MoveFolderResult'], ParentType, ContextType, RequireFields<MutationMoveVaultFolderArgs, 'input'>>;
  muteConversation?: Resolver<ResolversTypes['MuteConversationResult'], ParentType, ContextType, RequireFields<MutationMuteConversationArgs, 'conversationId' | 'isMuted'>>;
  pinVaultFolder?: Resolver<ResolversTypes['PinFolderResult'], ParentType, ContextType, RequireFields<MutationPinVaultFolderArgs, 'input'>>;
  registerExternalFile?: Resolver<ResolversTypes['RegisterExternalFileResult'], ParentType, ContextType, RequireFields<MutationRegisterExternalFileArgs, 'input'>>;
  removeBoardCollaborator?: Resolver<ResolversTypes['RemoveBoardCollaboratorResult'], ParentType, ContextType, RequireFields<MutationRemoveBoardCollaboratorArgs, 'boardId' | 'userId'>>;
  removeChannelMember?: Resolver<ResolversTypes['RemoveChannelMemberResult'], ParentType, ContextType, RequireFields<MutationRemoveChannelMemberArgs, 'channelId' | 'userId' | 'workspaceId'>>;
  removeGroupMember?: Resolver<ResolversTypes['RemoveGroupMemberResult'], ParentType, ContextType, RequireFields<MutationRemoveGroupMemberArgs, 'groupId' | 'userId' | 'workspaceId'>>;
  removePageCollaborator?: Resolver<ResolversTypes['RemovePageCollaboratorResult'], ParentType, ContextType, RequireFields<MutationRemovePageCollaboratorArgs, 'input'>>;
  removeProjectMember?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveProjectMemberArgs, 'projectId' | 'userId' | 'workspaceId'>>;
  removeRolePermission?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveRolePermissionArgs, 'permissionId' | 'roleId' | 'workspaceId'>>;
  removeWorkspaceMember?: Resolver<ResolversTypes['InviteResponse'], ParentType, ContextType, RequireFields<MutationRemoveWorkspaceMemberArgs, 'memberId' | 'workspaceId'>>;
  renameBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationRenameBoardArgs, 'boardId' | 'title'>>;
  renameChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationRenameChannelArgs, 'input'>>;
  renameGroup?: Resolver<ResolversTypes['RenameGroupResult'], ParentType, ContextType, RequireFields<MutationRenameGroupArgs, 'groupId' | 'name' | 'workspaceId'>>;
  renamePage?: Resolver<ResolversTypes['RenamePageResult'], ParentType, ContextType, RequireFields<MutationRenamePageArgs, 'input'>>;
  renameVaultFile?: Resolver<ResolversTypes['RenameFileResult'], ParentType, ContextType, RequireFields<MutationRenameVaultFileArgs, 'input'>>;
  renameVaultFolder?: Resolver<ResolversTypes['RenameFolderResult'], ParentType, ContextType, RequireFields<MutationRenameVaultFolderArgs, 'input'>>;
  reopenThread?: Resolver<ResolversTypes['ReopenThreadResult'], ParentType, ContextType, RequireFields<MutationReopenThreadArgs, 'threadId' | 'workspaceId'>>;
  reorderIssue?: Resolver<ResolversTypes['ReorderIssueResult'], ParentType, ContextType, RequireFields<MutationReorderIssueArgs, 'input'>>;
  reorderIssueStatus?: Resolver<ResolversTypes['ReorderIssueStatusResult'], ParentType, ContextType, RequireFields<MutationReorderIssueStatusArgs, 'input'>>;
  reorderPage?: Resolver<ResolversTypes['ReorderPageResult'], ParentType, ContextType, RequireFields<MutationReorderPageArgs, 'input'>>;
  requestIssueDescriptionUpload?: Resolver<ResolversTypes['RequestIssueDescriptionUploadResult'], ParentType, ContextType, RequireFields<MutationRequestIssueDescriptionUploadArgs, 'input'>>;
  requestVaultUpload?: Resolver<ResolversTypes['RequestUploadResult'], ParentType, ContextType, RequireFields<MutationRequestVaultUploadArgs, 'input'>>;
  resendWorkspaceInvite?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationResendWorkspaceInviteArgs, 'inviteId' | 'workspaceId'>>;
  subscribeThread?: Resolver<ResolversTypes['SubscribeThreadResult'], ParentType, ContextType, RequireFields<MutationSubscribeThreadArgs, 'threadId'>>;
  syncUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationSyncUserArgs, 'clerkId' | 'email'>>;
  toggleFeatureFlag?: Resolver<ResolversTypes['ToggleFlagResult'], ParentType, ContextType, RequireFields<MutationToggleFeatureFlagArgs, 'input'>>;
  transferWorkspaceOwnership?: Resolver<ResolversTypes['WorkspaceMember'], ParentType, ContextType, RequireFields<MutationTransferWorkspaceOwnershipArgs, 'newOwnerId' | 'workspaceId'>>;
  unarchiveBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUnarchiveBoardArgs, 'boardId'>>;
  unarchiveChannel?: Resolver<ResolversTypes['UnarchiveChannelResult'], ParentType, ContextType, RequireFields<MutationUnarchiveChannelArgs, 'channelId' | 'workspaceId'>>;
  unarchivePage?: Resolver<ResolversTypes['UnarchivePageResult'], ParentType, ContextType, RequireFields<MutationUnarchivePageArgs, 'input'>>;
  unarchiveProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUnarchiveProjectArgs, 'projectId'>>;
  unlockBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUnlockBoardArgs, 'boardId'>>;
  unlockPage?: Resolver<ResolversTypes['UnlockPageResult'], ParentType, ContextType, RequireFields<MutationUnlockPageArgs, 'input'>>;
  unpinVaultFolder?: Resolver<ResolversTypes['DeleteResult'], ParentType, ContextType, RequireFields<MutationUnpinVaultFolderArgs, 'input'>>;
  unsubscribeThread?: Resolver<ResolversTypes['UnsubscribeThreadResult'], ParentType, ContextType, RequireFields<MutationUnsubscribeThreadArgs, 'threadId'>>;
  updateBoardDescription?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUpdateBoardDescriptionArgs, 'boardId'>>;
  updateChannelDescription?: Resolver<ResolversTypes['UpdateChannelDescriptionResult'], ParentType, ContextType, RequireFields<MutationUpdateChannelDescriptionArgs, 'channelId' | 'workspaceId'>>;
  updateChannelVisibility?: Resolver<ResolversTypes['UpdateChannelVisibilityResult'], ParentType, ContextType, RequireFields<MutationUpdateChannelVisibilityArgs, 'channelId' | 'isPublic' | 'workspaceId'>>;
  updateIssue?: Resolver<ResolversTypes['UpdateIssueResult'], ParentType, ContextType, RequireFields<MutationUpdateIssueArgs, 'input'>>;
  updateIssueLabel?: Resolver<ResolversTypes['UpdateIssueLabelResult'], ParentType, ContextType, RequireFields<MutationUpdateIssueLabelArgs, 'input'>>;
  updateIssueStatus?: Resolver<ResolversTypes['UpdateIssueStatusResult'], ParentType, ContextType, RequireFields<MutationUpdateIssueStatusArgs, 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'input' | 'projectId'>>;
  updateProjectMemberRole?: Resolver<ResolversTypes['ProjectMember'], ParentType, ContextType, RequireFields<MutationUpdateProjectMemberRoleArgs, 'projectId' | 'roleId' | 'userId' | 'workspaceId'>>;
  updateProjectRole?: Resolver<ResolversTypes['ProjectRole'], ParentType, ContextType, RequireFields<MutationUpdateProjectRoleArgs, 'input' | 'projectId' | 'roleId' | 'workspaceId'>>;
  updateWorkspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType, RequireFields<MutationUpdateWorkspaceArgs, 'input' | 'workspaceId'>>;
  updateWorkspaceMemberRole?: Resolver<ResolversTypes['WorkspaceMember'], ParentType, ContextType, RequireFields<MutationUpdateWorkspaceMemberRoleArgs, 'memberId' | 'role' | 'workspaceId'>>;
  updateWorkspaceRole?: Resolver<ResolversTypes['WorkspaceRole'], ParentType, ContextType, RequireFields<MutationUpdateWorkspaceRoleArgs, 'input' | 'roleId' | 'workspaceId'>>;
}>;

export type MuteConversationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MuteConversationResult'] = ResolversParentTypes['MuteConversationResult']> = ResolversObject<{
  conversationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isMuted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type NotificationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = ResolversObject<{
  actor?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chatMessage?: Resolver<Maybe<ResolversTypes['ChatMessage']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  data?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  entityId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  entityType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  page?: Resolver<Maybe<ResolversTypes['Page']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  recipientUserId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  task?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType>;
  workspace?: Resolver<Maybe<ResolversTypes['Workspace']>, ParentType, ContextType>;
}>;

export type NotificationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationConnection'] = ResolversParentTypes['NotificationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NotificationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
}>;

export type NotificationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationEdge'] = ResolversParentTypes['NotificationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Notification'], ParentType, ContextType>;
}>;

export type OnboardingStatusResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OnboardingStatus'] = ResolversParentTypes['OnboardingStatus']> = ResolversObject<{
  hasProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasWorkspace?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  workspaceSlug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type OverviewIssueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OverviewIssue'] = ResolversParentTypes['OverviewIssue']> = ResolversObject<{
  assigneeAvatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  assigneeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  assigneeName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  statusColor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  statusName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type OverviewMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OverviewMember'] = ResolversParentTypes['OverviewMember']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  roleRank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Page'] = ResolversParentTypes['Page']> = ResolversObject<{
  children?: Resolver<Array<ResolversTypes['Page']>, ParentType, ContextType>;
  collaborators?: Resolver<Array<ResolversTypes['PageCollaborator']>, ParentType, ContextType>;
  coverUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  creator?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  icon?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isLocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  parentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  s3Key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageCollaboratorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageCollaborator'] = ResolversParentTypes['PageCollaborator']> = ResolversObject<{
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['PageRole'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type PageSnapshotResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageSnapshot'] = ResolversParentTypes['PageSnapshot']> = ResolversObject<{
  lastStreamId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snapshotTimestamp?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type PermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Permission'] = ResolversParentTypes['Permission']> = ResolversObject<{
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  module?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type PinFolderResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PinFolderResult'] = ResolversParentTypes['PinFolderResult']> = ResolversObject<{
  folder?: Resolver<ResolversTypes['VaultFolder'], ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isPrivate?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['ProjectMember']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ProjectDmItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectDmItem'] = ResolversParentTypes['ProjectDmItem']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  otherUser?: Resolver<ResolversTypes['DmUserProfile'], ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type ProjectMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMember'] = ResolversParentTypes['ProjectMember']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ProjectOverviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectOverview'] = ResolversParentTypes['ProjectOverview']> = ResolversObject<{
  completedIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  issuesByStatus?: Resolver<Array<ResolversTypes['IssueStatusCount']>, ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['OverviewMember']>, ParentType, ContextType>;
  openIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  overdueIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recentIssues?: Resolver<Array<ResolversTypes['OverviewIssue']>, ParentType, ContextType>;
  totalIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ProjectRoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectRole'] = ResolversParentTypes['ProjectRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scopeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PublicUserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PublicUser'] = ResolversParentTypes['PublicUser']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  activeCollaborators?: Resolver<Array<ResolversTypes['ActiveCollaborator']>, ParentType, ContextType, RequireFields<QueryActiveCollaboratorsArgs, 'boardId'>>;
  activeContext?: Resolver<ResolversTypes['ActiveUserContext'], ParentType, ContextType, RequireFields<QueryActiveContextArgs, 'workspaceId'>>;
  allPermissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType, RequireFields<QueryAllPermissionsArgs, 'workspaceId'>>;
  boardCollaborators?: Resolver<Array<ResolversTypes['BoardCollaborator']>, ParentType, ContextType, RequireFields<QueryBoardCollaboratorsArgs, 'boardId'>>;
  featureFlags?: Resolver<Array<ResolversTypes['FeatureFlagRecord']>, ParentType, ContextType>;
  getActivePageCollaborators?: Resolver<Array<ResolversTypes['PageCollaborator']>, ParentType, ContextType, RequireFields<QueryGetActivePageCollaboratorsArgs, 'pageId'>>;
  getBatchDownloadUrls?: Resolver<Array<ResolversTypes['VaultBatchDownloadResult']>, ParentType, ContextType, RequireFields<QueryGetBatchDownloadUrlsArgs, 'fileIds'>>;
  getBoard?: Resolver<Maybe<ResolversTypes['Whiteboard']>, ParentType, ContextType, RequireFields<QueryGetBoardArgs, 'boardId'>>;
  getBoardSnapshot?: Resolver<ResolversTypes['BoardSnapshot'], ParentType, ContextType, RequireFields<QueryGetBoardSnapshotArgs, 'boardId'>>;
  getChannelMembers?: Resolver<Array<ResolversTypes['ChatMemberRecord']>, ParentType, ContextType, RequireFields<QueryGetChannelMembersArgs, 'channelId'>>;
  getConversation?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<QueryGetConversationArgs, 'conversationId'>>;
  getDmByUsers?: Resolver<Maybe<ResolversTypes['DmConversation']>, ParentType, ContextType, RequireFields<QueryGetDmByUsersArgs, 'otherUserId' | 'projectId' | 'workspaceId'>>;
  getIssue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType, RequireFields<QueryGetIssueArgs, 'issueId'>>;
  getIssueDescriptionUrl?: Resolver<ResolversTypes['IssueDescriptionUrl'], ParentType, ContextType, RequireFields<QueryGetIssueDescriptionUrlArgs, 'issueId'>>;
  getIssueLabels?: Resolver<Array<ResolversTypes['IssueLabel']>, ParentType, ContextType, RequireFields<QueryGetIssueLabelsArgs, 'projectId'>>;
  getIssueStatuses?: Resolver<Array<ResolversTypes['IssueStatus']>, ParentType, ContextType, RequireFields<QueryGetIssueStatusesArgs, 'projectId'>>;
  getLastReadMessage?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType, RequireFields<QueryGetLastReadMessageArgs, 'channelId'>>;
  getMessageById?: Resolver<Maybe<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMessageByIdArgs, 'messageId'>>;
  getMessagesAfterCursor?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMessagesAfterCursorArgs, 'afterCursor' | 'channelId'>>;
  getMissingMessages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMissingMessagesArgs, 'channelId' | 'rangeEnd' | 'rangeStart'>>;
  getPage?: Resolver<ResolversTypes['Page'], ParentType, ContextType, RequireFields<QueryGetPageArgs, 'pageId'>>;
  getPageCollaborators?: Resolver<Array<ResolversTypes['PageCollaborator']>, ParentType, ContextType, RequireFields<QueryGetPageCollaboratorsArgs, 'pageId'>>;
  getPageSnapshot?: Resolver<ResolversTypes['PageSnapshot'], ParentType, ContextType, RequireFields<QueryGetPageSnapshotArgs, 'pageId'>>;
  getProjectDms?: Resolver<Array<ResolversTypes['ProjectDmItem']>, ParentType, ContextType, RequireFields<QueryGetProjectDmsArgs, 'projectId' | 'workspaceId'>>;
  getProjectIssues?: Resolver<Array<ResolversTypes['Issue']>, ParentType, ContextType, RequireFields<QueryGetProjectIssuesArgs, 'projectId'>>;
  getProjectPages?: Resolver<Array<ResolversTypes['Page']>, ParentType, ContextType, RequireFields<QueryGetProjectPagesArgs, 'projectId'>>;
  getReadReceipts?: Resolver<ResolversTypes['ReadReceiptsResponse'], ParentType, ContextType, RequireFields<QueryGetReadReceiptsArgs, 'messageId'>>;
  getThreadMessages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetThreadMessagesArgs, 'parentMessageId'>>;
  getUnreadCounts?: Resolver<ResolversTypes['UnreadCountsResponse'], ParentType, ContextType, RequireFields<QueryGetUnreadCountsArgs, 'projectId' | 'workspaceId'>>;
  getUserConversations?: Resolver<ResolversTypes['ConversationConnection'], ParentType, ContextType, RequireFields<QueryGetUserConversationsArgs, 'projectId' | 'workspaceId'>>;
  getUsersByIds?: Resolver<Array<ResolversTypes['UserBasic']>, ParentType, ContextType, RequireFields<QueryGetUsersByIdsArgs, 'userIds'>>;
  getVaultAncestors?: Resolver<Array<ResolversTypes['VaultFolder']>, ParentType, ContextType, RequireFields<QueryGetVaultAncestorsArgs, 'folderId'>>;
  getVaultChildren?: Resolver<ResolversTypes['VaultChildrenResult'], ParentType, ContextType, RequireFields<QueryGetVaultChildrenArgs, 'projectId'>>;
  getVaultDownloadUrl?: Resolver<ResolversTypes['VaultDownloadUrl'], ParentType, ContextType, RequireFields<QueryGetVaultDownloadUrlArgs, 'fileId'>>;
  getVaultNode?: Resolver<ResolversTypes['VaultNode'], ParentType, ContextType, RequireFields<QueryGetVaultNodeArgs, 'id' | 'type'>>;
  getVaultSidebar?: Resolver<ResolversTypes['VaultSidebar'], ParentType, ContextType, RequireFields<QueryGetVaultSidebarArgs, 'projectId'>>;
  getVaultUsage?: Resolver<ResolversTypes['VaultUsage'], ParentType, ContextType, RequireFields<QueryGetVaultUsageArgs, 'projectId'>>;
  getWorkspaceInviteInfo?: Resolver<ResolversTypes['WorkspaceInviteInfo'], ParentType, ContextType, RequireFields<QueryGetWorkspaceInviteInfoArgs, 'token'>>;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  history?: Resolver<ResolversTypes['HistoryPayload'], ParentType, ContextType, RequireFields<QueryHistoryArgs, 'beforeSequence' | 'conversationId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  messageReactions?: Resolver<Array<ResolversTypes['MessageReaction']>, ParentType, ContextType, RequireFields<QueryMessageReactionsArgs, 'messageId'>>;
  messagesDelta?: Resolver<ResolversTypes['MessagesDelta'], ParentType, ContextType, RequireFields<QueryMessagesDeltaArgs, 'conversationId'>>;
  myProjects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryMyProjectsArgs, 'workspaceId'>>;
  myWorkspaces?: Resolver<Array<ResolversTypes['Workspace']>, ParentType, ContextType>;
  notifications?: Resolver<ResolversTypes['NotificationConnection'], ParentType, ContextType, Partial<QueryNotificationsArgs>>;
  onboardingStatus?: Resolver<ResolversTypes['OnboardingStatus'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectArgs, 'id'>>;
  projectBySlug?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectBySlugArgs, 'slug' | 'workspaceId'>>;
  projectMembers?: Resolver<Array<ResolversTypes['ProjectMember']>, ParentType, ContextType, RequireFields<QueryProjectMembersArgs, 'projectId'>>;
  projectOverview?: Resolver<ResolversTypes['ProjectOverview'], ParentType, ContextType, RequireFields<QueryProjectOverviewArgs, 'projectId'>>;
  projectRoles?: Resolver<Array<ResolversTypes['ProjectRole']>, ParentType, ContextType, RequireFields<QueryProjectRolesArgs, 'projectId' | 'workspaceId'>>;
  reactionUsers?: Resolver<ResolversTypes['ReactionUsersConnection'], ParentType, ContextType, RequireFields<QueryReactionUsersArgs, 'emoji' | 'messageId'>>;
  rolePermissions?: Resolver<Array<ResolversTypes['RolePermission']>, ParentType, ContextType, RequireFields<QueryRolePermissionsArgs, 'roleId' | 'workspaceId'>>;
  unreadNotificationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['PublicUser']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'userId'>>;
  userBoards?: Resolver<ResolversTypes['BoardConnection'], ParentType, ContextType, RequireFields<QueryUserBoardsArgs, 'workspaceId'>>;
  workspaceBoards?: Resolver<ResolversTypes['BoardConnection'], ParentType, ContextType, RequireFields<QueryWorkspaceBoardsArgs, 'workspaceId'>>;
  workspaceById?: Resolver<Maybe<ResolversTypes['Workspace']>, ParentType, ContextType, RequireFields<QueryWorkspaceByIdArgs, 'workspaceId'>>;
  workspaceBySlug?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType, RequireFields<QueryWorkspaceBySlugArgs, 'slug'>>;
  workspaceInvites?: Resolver<Array<ResolversTypes['WorkspaceInvite']>, ParentType, ContextType, RequireFields<QueryWorkspaceInvitesArgs, 'workspaceId'>>;
  workspaceMembers?: Resolver<Array<ResolversTypes['WorkspaceMember']>, ParentType, ContextType, RequireFields<QueryWorkspaceMembersArgs, 'workspaceId'>>;
  workspaceOverview?: Resolver<ResolversTypes['WorkspaceOverview'], ParentType, ContextType, RequireFields<QueryWorkspaceOverviewArgs, 'workspaceId'>>;
  workspaceRoles?: Resolver<Array<ResolversTypes['WorkspaceRole']>, ParentType, ContextType, RequireFields<QueryWorkspaceRolesArgs, 'workspaceId'>>;
  workspaceUser?: Resolver<Maybe<ResolversTypes['WorkspaceMember']>, ParentType, ContextType, RequireFields<QueryWorkspaceUserArgs, 'userId' | 'workspaceId'>>;
}>;

export type ReactionUsersConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReactionUsersConnection'] = ResolversParentTypes['ReactionUsersConnection']> = ResolversObject<{
  nextCursor?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type ReadReceiptUserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReadReceiptUser'] = ResolversParentTypes['ReadReceiptUser']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ReadReceiptsResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReadReceiptsResponse'] = ResolversParentTypes['ReadReceiptsResponse']> = ResolversObject<{
  readBy?: Resolver<Array<ResolversTypes['ReadReceiptUser']>, ParentType, ContextType>;
  totalMembers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalReads?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type RegisterExternalFileResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RegisterExternalFileResult'] = ResolversParentTypes['RegisterExternalFileResult']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fileId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  presignedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RemoveBoardCollaboratorResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveBoardCollaboratorResult'] = ResolversParentTypes['RemoveBoardCollaboratorResult']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RemoveChannelMemberResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveChannelMemberResult'] = ResolversParentTypes['RemoveChannelMemberResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type RemoveGroupMemberResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveGroupMemberResult'] = ResolversParentTypes['RemoveGroupMemberResult']> = ResolversObject<{
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type RemovePageCollaboratorResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemovePageCollaboratorResult'] = ResolversParentTypes['RemovePageCollaboratorResult']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RenameFileResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RenameFileResult'] = ResolversParentTypes['RenameFileResult']> = ResolversObject<{
  file?: Resolver<ResolversTypes['VaultFile'], ParentType, ContextType>;
}>;

export type RenameFolderResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RenameFolderResult'] = ResolversParentTypes['RenameFolderResult']> = ResolversObject<{
  folder?: Resolver<ResolversTypes['VaultFolder'], ParentType, ContextType>;
}>;

export type RenameGroupResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RenameGroupResult'] = ResolversParentTypes['RenameGroupResult']> = ResolversObject<{
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RenamePageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RenamePageResult'] = ResolversParentTypes['RenamePageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type ReopenThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReopenThreadResult'] = ResolversParentTypes['ReopenThreadResult']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ReorderIssueResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReorderIssueResult'] = ResolversParentTypes['ReorderIssueResult']> = ResolversObject<{
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
}>;

export type ReorderIssueStatusResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReorderIssueStatusResult'] = ResolversParentTypes['ReorderIssueStatusResult']> = ResolversObject<{
  status?: Resolver<ResolversTypes['IssueStatus'], ParentType, ContextType>;
}>;

export type ReorderPageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReorderPageResult'] = ResolversParentTypes['ReorderPageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type RequestIssueDescriptionUploadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RequestIssueDescriptionUploadResult'] = ResolversParentTypes['RequestIssueDescriptionUploadResult']> = ResolversObject<{
  descriptionFileId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  presignedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RequestUploadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RequestUploadResult'] = ResolversParentTypes['RequestUploadResult']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fileId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  presignedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RolePermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RolePermission'] = ResolversParentTypes['RolePermission']> = ResolversObject<{
  conditions?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permission?: Resolver<ResolversTypes['Permission'], ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SubscribeThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SubscribeThreadResult'] = ResolversParentTypes['SubscribeThreadResult']> = ResolversObject<{
  isSubscribed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type TaskResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Task'] = ResolversParentTypes['Task']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  statusName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ToggleFlagResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ToggleFlagResult'] = ResolversParentTypes['ToggleFlagResult']> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  flagKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UnarchiveChannelResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnarchiveChannelResult'] = ResolversParentTypes['UnarchiveChannelResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UnarchivePageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnarchivePageResult'] = ResolversParentTypes['UnarchivePageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type UnlockPageResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnlockPageResult'] = ResolversParentTypes['UnlockPageResult']> = ResolversObject<{
  page?: Resolver<ResolversTypes['Page'], ParentType, ContextType>;
}>;

export type UnreadCountsResponseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnreadCountsResponse'] = ResolversParentTypes['UnreadCountsResponse']> = ResolversObject<{
  conversations?: Resolver<Array<ResolversTypes['ConversationUnreadCount']>, ParentType, ContextType>;
}>;

export type UnsubscribeThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnsubscribeThreadResult'] = ResolversParentTypes['UnsubscribeThreadResult']> = ResolversObject<{
  isSubscribed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type UpdateChannelDescriptionResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateChannelDescriptionResult'] = ResolversParentTypes['UpdateChannelDescriptionResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UpdateChannelVisibilityResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateChannelVisibilityResult'] = ResolversParentTypes['UpdateChannelVisibilityResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UpdateIssueLabelResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateIssueLabelResult'] = ResolversParentTypes['UpdateIssueLabelResult']> = ResolversObject<{
  label?: Resolver<ResolversTypes['IssueLabel'], ParentType, ContextType>;
}>;

export type UpdateIssueResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateIssueResult'] = ResolversParentTypes['UpdateIssueResult']> = ResolversObject<{
  issue?: Resolver<ResolversTypes['Issue'], ParentType, ContextType>;
}>;

export type UpdateIssueStatusResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateIssueStatusResult'] = ResolversParentTypes['UpdateIssueStatusResult']> = ResolversObject<{
  status?: Resolver<ResolversTypes['IssueStatus'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserBasicResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserBasic'] = ResolversParentTypes['UserBasic']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type UserPresenceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserPresence'] = ResolversParentTypes['UserPresence']> = ResolversObject<{
  lastActiveAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['PresenceStatus'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type VaultBatchDownloadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultBatchDownloadResult'] = ResolversParentTypes['VaultBatchDownloadResult']> = ResolversObject<{
  fileId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sizeBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type VaultChildrenResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultChildrenResult'] = ResolversParentTypes['VaultChildrenResult']> = ResolversObject<{
  files?: Resolver<Array<ResolversTypes['VaultFile']>, ParentType, ContextType>;
  folders?: Resolver<Array<ResolversTypes['VaultFolder']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  totalFileCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type VaultDownloadUrlResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultDownloadUrl'] = ResolversParentTypes['VaultDownloadUrl']> = ResolversObject<{
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VaultFileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultFile'] = ResolversParentTypes['VaultFile']> = ResolversObject<{
  confirmedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  folderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  s3Key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sizeBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['VaultFileSource'], ParentType, ContextType>;
  sourceId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  uploader?: Resolver<Maybe<ResolversTypes['VaultUploader']>, ParentType, ContextType>;
  uploaderUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VaultFolderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultFolder'] = ResolversParentTypes['VaultFolder']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentFolderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VaultNodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultNode'] = ResolversParentTypes['VaultNode']> = ResolversObject<{
  __resolveType: TypeResolveFn<'VaultFile' | 'VaultFolder', ParentType, ContextType>;
}>;

export type VaultSidebarResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultSidebar'] = ResolversParentTypes['VaultSidebar']> = ResolversObject<{
  pinnedFolders?: Resolver<Array<ResolversTypes['VaultFolder']>, ParentType, ContextType>;
  systemFolders?: Resolver<Array<ResolversTypes['VaultFolder']>, ParentType, ContextType>;
}>;

export type VaultUploaderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultUploader'] = ResolversParentTypes['VaultUploader']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type VaultUsageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VaultUsage'] = ResolversParentTypes['VaultUsage']> = ResolversObject<{
  percentUsed?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  projectFileCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectFileCountLimit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectLimitBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  projectReservedBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  projectUsedBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  workspaceFileCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  workspaceFileCountLimit?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  workspaceLimitBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  workspaceReservedBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  workspaceUsedBytes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type WhiteboardResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Whiteboard'] = ResolversParentTypes['Whiteboard']> = ResolversObject<{
  collaborators?: Resolver<Maybe<Array<ResolversTypes['BoardCollaborator']>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  creator?: Resolver<ResolversTypes['UserBasic'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  elementCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fileSizeBytes?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isLocked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type WorkspaceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Workspace'] = ResolversParentTypes['Workspace']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domainWhitelist?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WorkspaceInviteResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceInvite'] = ResolversParentTypes['WorkspaceInvite']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WorkspaceInviteInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceInviteInfo'] = ResolversParentTypes['WorkspaceInviteInfo']> = ResolversObject<{
  inviterName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  workspaceLogoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  workspaceName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WorkspaceMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceMember'] = ResolversParentTypes['WorkspaceMember']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type WorkspaceOverviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceOverview'] = ResolversParentTypes['WorkspaceOverview']> = ResolversObject<{
  activeProjects?: Resolver<Array<ResolversTypes['WorkspaceOverviewProject']>, ParentType, ContextType>;
  recentMembers?: Resolver<Array<ResolversTypes['WorkspaceOverviewMember']>, ParentType, ContextType>;
  totalChannels?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalMembers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalPages?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalProjects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  urgentIssues?: Resolver<Array<ResolversTypes['WorkspaceOverviewIssue']>, ParentType, ContextType>;
}>;

export type WorkspaceOverviewIssueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceOverviewIssue'] = ResolversParentTypes['WorkspaceOverviewIssue']> = ResolversObject<{
  assigneeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  assigneeName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WorkspaceOverviewMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceOverviewMember'] = ResolversParentTypes['WorkspaceOverviewMember']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roleName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type WorkspaceOverviewProjectResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceOverviewProject'] = ResolversParentTypes['WorkspaceOverviewProject']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  memberCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  openIssues?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WorkspaceRoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WorkspaceRole'] = ResolversParentTypes['WorkspaceRole']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scopeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workspaceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ActiveCollaborator?: ActiveCollaboratorResolvers<ContextType>;
  ActiveFeatureFlag?: ActiveFeatureFlagResolvers<ContextType>;
  ActiveUserContext?: ActiveUserContextResolvers<ContextType>;
  AddBoardCollaboratorsResult?: AddBoardCollaboratorsResultResolvers<ContextType>;
  AddChannelMembersResult?: AddChannelMembersResultResolvers<ContextType>;
  AddGroupMembersResult?: AddGroupMembersResultResolvers<ContextType>;
  AddPageCollaboratorsResult?: AddPageCollaboratorsResultResolvers<ContextType>;
  ArchivePageResult?: ArchivePageResultResolvers<ContextType>;
  AvailabilityResponse?: AvailabilityResponseResolvers<ContextType>;
  BoardCollaborator?: BoardCollaboratorResolvers<ContextType>;
  BoardConnection?: BoardConnectionResolvers<ContextType>;
  BoardPayload?: BoardPayloadResolvers<ContextType>;
  BoardSnapshot?: BoardSnapshotResolvers<ContextType>;
  ChannelAvailabilityResponse?: ChannelAvailabilityResponseResolvers<ContextType>;
  ChannelMemberInfo?: ChannelMemberInfoResolvers<ContextType>;
  ChatMemberRecord?: ChatMemberRecordResolvers<ContextType>;
  ChatMessage?: ChatMessageResolvers<ContextType>;
  CloseThreadResult?: CloseThreadResultResolvers<ContextType>;
  ConfirmIssueDescriptionUploadResult?: ConfirmIssueDescriptionUploadResultResolvers<ContextType>;
  ConfirmUploadResult?: ConfirmUploadResultResolvers<ContextType>;
  Conversation?: ConversationResolvers<ContextType>;
  ConversationConnection?: ConversationConnectionResolvers<ContextType>;
  ConversationMember?: ConversationMemberResolvers<ContextType>;
  ConversationUnreadCount?: ConversationUnreadCountResolvers<ContextType>;
  CreateFolderResult?: CreateFolderResultResolvers<ContextType>;
  CreateIssueLabelResult?: CreateIssueLabelResultResolvers<ContextType>;
  CreateIssueResult?: CreateIssueResultResolvers<ContextType>;
  CreateIssueStatusResult?: CreateIssueStatusResultResolvers<ContextType>;
  CreatePageResult?: CreatePageResultResolvers<ContextType>;
  CursorPosition?: CursorPositionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteBoardResult?: DeleteBoardResultResolvers<ContextType>;
  DeleteChannelResult?: DeleteChannelResultResolvers<ContextType>;
  DeleteDmResult?: DeleteDmResultResolvers<ContextType>;
  DeleteGroupResult?: DeleteGroupResultResolvers<ContextType>;
  DeletePageResult?: DeletePageResultResolvers<ContextType>;
  DeleteResult?: DeleteResultResolvers<ContextType>;
  DeleteThreadResult?: DeleteThreadResultResolvers<ContextType>;
  DmConversation?: DmConversationResolvers<ContextType>;
  DmMember?: DmMemberResolvers<ContextType>;
  DmUserProfile?: DmUserProfileResolvers<ContextType>;
  FeatureFlagRecord?: FeatureFlagRecordResolvers<ContextType>;
  FlagOverrideRecord?: FlagOverrideRecordResolvers<ContextType>;
  GetPageSnapshotResult?: GetPageSnapshotResultResolvers<ContextType>;
  GroupMemberInfo?: GroupMemberInfoResolvers<ContextType>;
  HistoryPayload?: HistoryPayloadResolvers<ContextType>;
  InviteResponse?: InviteResponseResolvers<ContextType>;
  Issue?: IssueResolvers<ContextType>;
  IssueDescriptionUrl?: IssueDescriptionUrlResolvers<ContextType>;
  IssueLabel?: IssueLabelResolvers<ContextType>;
  IssueStatus?: IssueStatusResolvers<ContextType>;
  IssueStatusCount?: IssueStatusCountResolvers<ContextType>;
  IssueUser?: IssueUserResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JoinResponse?: JoinResponseResolvers<ContextType>;
  LastMessagePreview?: LastMessagePreviewResolvers<ContextType>;
  LeaveGroupResult?: LeaveGroupResultResolvers<ContextType>;
  LockPageResult?: LockPageResultResolvers<ContextType>;
  MarkFilesUnreferencedResult?: MarkFilesUnreferencedResultResolvers<ContextType>;
  MessageReaction?: MessageReactionResolvers<ContextType>;
  MessagesDelta?: MessagesDeltaResolvers<ContextType>;
  MoveFileResult?: MoveFileResultResolvers<ContextType>;
  MoveFolderResult?: MoveFolderResultResolvers<ContextType>;
  MoveIssueStatusResult?: MoveIssueStatusResultResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MuteConversationResult?: MuteConversationResultResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationConnection?: NotificationConnectionResolvers<ContextType>;
  NotificationEdge?: NotificationEdgeResolvers<ContextType>;
  OnboardingStatus?: OnboardingStatusResolvers<ContextType>;
  OverviewIssue?: OverviewIssueResolvers<ContextType>;
  OverviewMember?: OverviewMemberResolvers<ContextType>;
  Page?: PageResolvers<ContextType>;
  PageCollaborator?: PageCollaboratorResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PageSnapshot?: PageSnapshotResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PinFolderResult?: PinFolderResultResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectDmItem?: ProjectDmItemResolvers<ContextType>;
  ProjectMember?: ProjectMemberResolvers<ContextType>;
  ProjectOverview?: ProjectOverviewResolvers<ContextType>;
  ProjectRole?: ProjectRoleResolvers<ContextType>;
  PublicUser?: PublicUserResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ReactionUsersConnection?: ReactionUsersConnectionResolvers<ContextType>;
  ReadReceiptUser?: ReadReceiptUserResolvers<ContextType>;
  ReadReceiptsResponse?: ReadReceiptsResponseResolvers<ContextType>;
  RegisterExternalFileResult?: RegisterExternalFileResultResolvers<ContextType>;
  RemoveBoardCollaboratorResult?: RemoveBoardCollaboratorResultResolvers<ContextType>;
  RemoveChannelMemberResult?: RemoveChannelMemberResultResolvers<ContextType>;
  RemoveGroupMemberResult?: RemoveGroupMemberResultResolvers<ContextType>;
  RemovePageCollaboratorResult?: RemovePageCollaboratorResultResolvers<ContextType>;
  RenameFileResult?: RenameFileResultResolvers<ContextType>;
  RenameFolderResult?: RenameFolderResultResolvers<ContextType>;
  RenameGroupResult?: RenameGroupResultResolvers<ContextType>;
  RenamePageResult?: RenamePageResultResolvers<ContextType>;
  ReopenThreadResult?: ReopenThreadResultResolvers<ContextType>;
  ReorderIssueResult?: ReorderIssueResultResolvers<ContextType>;
  ReorderIssueStatusResult?: ReorderIssueStatusResultResolvers<ContextType>;
  ReorderPageResult?: ReorderPageResultResolvers<ContextType>;
  RequestIssueDescriptionUploadResult?: RequestIssueDescriptionUploadResultResolvers<ContextType>;
  RequestUploadResult?: RequestUploadResultResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  SubscribeThreadResult?: SubscribeThreadResultResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  ToggleFlagResult?: ToggleFlagResultResolvers<ContextType>;
  UnarchiveChannelResult?: UnarchiveChannelResultResolvers<ContextType>;
  UnarchivePageResult?: UnarchivePageResultResolvers<ContextType>;
  UnlockPageResult?: UnlockPageResultResolvers<ContextType>;
  UnreadCountsResponse?: UnreadCountsResponseResolvers<ContextType>;
  UnsubscribeThreadResult?: UnsubscribeThreadResultResolvers<ContextType>;
  UpdateChannelDescriptionResult?: UpdateChannelDescriptionResultResolvers<ContextType>;
  UpdateChannelVisibilityResult?: UpdateChannelVisibilityResultResolvers<ContextType>;
  UpdateIssueLabelResult?: UpdateIssueLabelResultResolvers<ContextType>;
  UpdateIssueResult?: UpdateIssueResultResolvers<ContextType>;
  UpdateIssueStatusResult?: UpdateIssueStatusResultResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserBasic?: UserBasicResolvers<ContextType>;
  UserPresence?: UserPresenceResolvers<ContextType>;
  VaultBatchDownloadResult?: VaultBatchDownloadResultResolvers<ContextType>;
  VaultChildrenResult?: VaultChildrenResultResolvers<ContextType>;
  VaultDownloadUrl?: VaultDownloadUrlResolvers<ContextType>;
  VaultFile?: VaultFileResolvers<ContextType>;
  VaultFolder?: VaultFolderResolvers<ContextType>;
  VaultNode?: VaultNodeResolvers<ContextType>;
  VaultSidebar?: VaultSidebarResolvers<ContextType>;
  VaultUploader?: VaultUploaderResolvers<ContextType>;
  VaultUsage?: VaultUsageResolvers<ContextType>;
  Whiteboard?: WhiteboardResolvers<ContextType>;
  Workspace?: WorkspaceResolvers<ContextType>;
  WorkspaceInvite?: WorkspaceInviteResolvers<ContextType>;
  WorkspaceInviteInfo?: WorkspaceInviteInfoResolvers<ContextType>;
  WorkspaceMember?: WorkspaceMemberResolvers<ContextType>;
  WorkspaceOverview?: WorkspaceOverviewResolvers<ContextType>;
  WorkspaceOverviewIssue?: WorkspaceOverviewIssueResolvers<ContextType>;
  WorkspaceOverviewMember?: WorkspaceOverviewMemberResolvers<ContextType>;
  WorkspaceOverviewProject?: WorkspaceOverviewProjectResolvers<ContextType>;
  WorkspaceRole?: WorkspaceRoleResolvers<ContextType>;
}>;

