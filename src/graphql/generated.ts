import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Project as PrismaProject, ProjectMember as PrismaProjectMember, User as PrismaUser, Workspace as PrismaWorkspace, WorkspaceMember as PrismaWorkspaceMember, Notification as PrismaNotification, ChatMember as PrismaChatMember, ChatMessage as PrismaChatMessage } from '@prisma/client';
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

export type ArchiveChannelInput = {
  channelId: Scalars['ID']['input'];
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

export type CreateGroupInput = {
  memberUserIds: Array<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type CreateThreadInput = {
  conversationId: Scalars['ID']['input'];
  messageId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
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

export type DeleteThreadResult = {
  __typename?: 'DeleteThreadResult';
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
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
  workspaceId: Scalars['ID']['input'];
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

export type Mutation = {
  __typename?: 'Mutation';
  _health?: Maybe<Scalars['String']['output']>;
  acceptWorkspaceInvite: JoinResponse;
  addBoardCollaborators: AddBoardCollaboratorsResult;
  addChannelMembers: AddChannelMembersResult;
  addGroupMembers: AddGroupMembersResult;
  archiveBoard: Whiteboard;
  archiveChannel: Conversation;
  checkChannelAvailability: ChannelAvailabilityResponse;
  checkProjectSlugAvailability: AvailabilityResponse;
  checkSlugAvailability: AvailabilityResponse;
  closeThread: CloseThreadResult;
  createBoard: BoardPayload;
  createChannel: Conversation;
  createDm: Conversation;
  createGroup: Conversation;
  createOnboardingWorkspace: Workspace;
  createProject: Project;
  createThread: Conversation;
  createWorkspace: Workspace;
  deleteBoard: DeleteBoardResult;
  deleteChannel: DeleteChannelResult;
  deleteDm: DeleteDmResult;
  deleteGroup: DeleteGroupResult;
  deleteThread: DeleteThreadResult;
  inviteToWorkspace: InviteResponse;
  leaveGroup: LeaveGroupResult;
  lockBoard: Whiteboard;
  /** Mark all notifications as read. */
  markAllNotificationsRead: Scalars['Boolean']['output'];
  /** Mark specific notifications as read. */
  markNotificationRead: Scalars['Boolean']['output'];
  muteConversation: MuteConversationResult;
  removeBoardCollaborator: RemoveBoardCollaboratorResult;
  removeChannelMember: RemoveChannelMemberResult;
  removeGroupMember: RemoveGroupMemberResult;
  removeWorkspaceMember: InviteResponse;
  renameBoard: Whiteboard;
  renameChannel: Conversation;
  renameGroup: RenameGroupResult;
  reopenThread: ReopenThreadResult;
  subscribeThread: SubscribeThreadResult;
  syncUser: User;
  unarchiveBoard: Whiteboard;
  unarchiveChannel: UnarchiveChannelResult;
  unlockBoard: Whiteboard;
  unsubscribeThread: UnsubscribeThreadResult;
  updateBoardDescription: Whiteboard;
  updateChannelDescription: UpdateChannelDescriptionResult;
  updateChannelVisibility: UpdateChannelVisibilityResult;
  updateWorkspaceMemberRole: WorkspaceMember;
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


export type MutationArchiveBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationArchiveChannelArgs = {
  input: ArchiveChannelInput;
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


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
  workspaceId: Scalars['ID']['input'];
};


export type MutationCreateThreadArgs = {
  input: CreateThreadInput;
};


export type MutationCreateWorkspaceArgs = {
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
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


export type MutationDeleteThreadArgs = {
  threadId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationInviteToWorkspaceArgs = {
  input: InviteToWorkspaceInput;
};


export type MutationLeaveGroupArgs = {
  groupId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationLockBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationMuteConversationArgs = {
  conversationId: Scalars['ID']['input'];
  isMuted: Scalars['Boolean']['input'];
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


export type MutationReopenThreadArgs = {
  threadId: Scalars['ID']['input'];
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


export type MutationUnarchiveBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type MutationUnarchiveChannelArgs = {
  channelId: Scalars['ID']['input'];
  workspaceId: Scalars['ID']['input'];
};


export type MutationUnlockBoardArgs = {
  boardId: Scalars['ID']['input'];
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


export type MutationUpdateWorkspaceMemberRoleArgs = {
  memberId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
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

export type Page = {
  __typename?: 'Page';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
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

export type ProjectMember = {
  __typename?: 'ProjectMember';
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  role?: Maybe<Scalars['String']['output']>;
  user: User;
  userId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  activeCollaborators: Array<ActiveCollaborator>;
  boardCollaborators: Array<BoardCollaborator>;
  getBoard?: Maybe<Whiteboard>;
  getBoardSnapshot: BoardSnapshot;
  getChannelMembers: Array<ChatMemberRecord>;
  getConversation: Conversation;
  getDmByUsers?: Maybe<DmConversation>;
  getLastReadMessage?: Maybe<Scalars['ID']['output']>;
  getMessageById?: Maybe<ChatMessage>;
  getMessagesAfterCursor: Array<ChatMessage>;
  getMissingMessages: Array<ChatMessage>;
  getReadReceipts: ReadReceiptsResponse;
  getThreadMessages: Array<ChatMessage>;
  getUnreadCounts: UnreadCountsResponse;
  getUserConversations: ConversationConnection;
  getUsersByIds: Array<UserBasic>;
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
  reactionUsers: ReactionUsersConnection;
  /** Get count of unread notifications. */
  unreadNotificationCount: Scalars['Int']['output'];
  userBoards: BoardConnection;
  workspaceBoards: BoardConnection;
  workspaceBySlug: Workspace;
  workspaceMembers: Array<WorkspaceMember>;
};


export type QueryActiveCollaboratorsArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryBoardCollaboratorsArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryGetBoardArgs = {
  boardId: Scalars['ID']['input'];
};


export type QueryGetBoardSnapshotArgs = {
  boardId: Scalars['ID']['input'];
  stateVector?: InputMaybe<Scalars['String']['input']>;
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


export type QueryReactionUsersArgs = {
  cursor?: InputMaybe<Scalars['Int']['input']>;
  emoji: Scalars['String']['input'];
  messageId: Scalars['ID']['input'];
};


export type QueryUserBoardsArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceBoardsArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['ID']['input'];
};


export type QueryWorkspaceBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryWorkspaceMembersArgs = {
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

export type RenameChannelInput = {
  channelId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type RenameGroupResult = {
  __typename?: 'RenameGroupResult';
  groupId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ReopenThreadResult = {
  __typename?: 'ReopenThreadResult';
  success: Scalars['Boolean']['output'];
  threadId: Scalars['ID']['output'];
};

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

export type UnarchiveChannelResult = {
  __typename?: 'UnarchiveChannelResult';
  channelId: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
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





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AcceptInviteInput: AcceptInviteInput;
  ActiveCollaborator: ResolverTypeWrapper<ActiveCollaborator>;
  AddBoardCollaboratorsResult: ResolverTypeWrapper<AddBoardCollaboratorsResult>;
  AddChannelMembersResult: ResolverTypeWrapper<AddChannelMembersResult>;
  AddGroupMembersResult: ResolverTypeWrapper<AddGroupMembersResult>;
  ArchiveChannelInput: ArchiveChannelInput;
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
  Conversation: ResolverTypeWrapper<Omit<Conversation, 'members'> & { members?: Maybe<Array<ResolversTypes['ConversationMember']>> }>;
  ConversationConnection: ResolverTypeWrapper<Omit<ConversationConnection, 'edges'> & { edges: Array<ResolversTypes['Conversation']> }>;
  ConversationMember: ResolverTypeWrapper<PrismaChatMember>;
  ConversationType: ConversationType;
  ConversationUnreadCount: ResolverTypeWrapper<ConversationUnreadCount>;
  CreateBoardInput: CreateBoardInput;
  CreateChannelInput: CreateChannelInput;
  CreateDmInput: CreateDmInput;
  CreateGroupInput: CreateGroupInput;
  CreateProjectInput: CreateProjectInput;
  CreateThreadInput: CreateThreadInput;
  CursorPosition: ResolverTypeWrapper<CursorPosition>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteBoardResult: ResolverTypeWrapper<DeleteBoardResult>;
  DeleteChannelResult: ResolverTypeWrapper<DeleteChannelResult>;
  DeleteDmResult: ResolverTypeWrapper<DeleteDmResult>;
  DeleteGroupResult: ResolverTypeWrapper<DeleteGroupResult>;
  DeleteThreadResult: ResolverTypeWrapper<DeleteThreadResult>;
  DmConversation: ResolverTypeWrapper<DmConversation>;
  DmMember: ResolverTypeWrapper<DmMember>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GroupMemberInfo: ResolverTypeWrapper<GroupMemberInfo>;
  HistoryPayload: ResolverTypeWrapper<Omit<HistoryPayload, 'messages'> & { messages: Array<ResolversTypes['ChatMessage']> }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InviteResponse: ResolverTypeWrapper<InviteResponse>;
  InviteToWorkspaceInput: InviteToWorkspaceInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JoinResponse: ResolverTypeWrapper<JoinResponse>;
  LastMessagePreview: ResolverTypeWrapper<LastMessagePreview>;
  LeaveGroupResult: ResolverTypeWrapper<LeaveGroupResult>;
  MessageReaction: ResolverTypeWrapper<Omit<MessageReaction, 'recentUsers'> & { recentUsers: Array<ResolversTypes['User']> }>;
  MessagesDelta: ResolverTypeWrapper<Omit<MessagesDelta, 'messages'> & { messages: Array<ResolversTypes['ChatMessage']> }>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MuteConversationResult: ResolverTypeWrapper<MuteConversationResult>;
  Notification: ResolverTypeWrapper<PrismaNotification>;
  NotificationConnection: ResolverTypeWrapper<Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversTypes['NotificationEdge']> }>;
  NotificationEdge: ResolverTypeWrapper<Omit<NotificationEdge, 'node'> & { node: ResolversTypes['Notification'] }>;
  OnboardingStatus: ResolverTypeWrapper<OnboardingStatus>;
  Page: ResolverTypeWrapper<Page>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PresenceStatus: PresenceStatus;
  Project: ResolverTypeWrapper<PrismaProject>;
  ProjectMember: ResolverTypeWrapper<PrismaProjectMember>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ReactionUsersConnection: ResolverTypeWrapper<Omit<ReactionUsersConnection, 'users'> & { users: Array<ResolversTypes['User']> }>;
  ReadReceiptUser: ResolverTypeWrapper<ReadReceiptUser>;
  ReadReceiptsResponse: ResolverTypeWrapper<ReadReceiptsResponse>;
  RemoveBoardCollaboratorResult: ResolverTypeWrapper<RemoveBoardCollaboratorResult>;
  RemoveChannelMemberResult: ResolverTypeWrapper<RemoveChannelMemberResult>;
  RemoveGroupMemberResult: ResolverTypeWrapper<RemoveGroupMemberResult>;
  RenameChannelInput: RenameChannelInput;
  RenameGroupResult: ResolverTypeWrapper<RenameGroupResult>;
  ReopenThreadResult: ResolverTypeWrapper<ReopenThreadResult>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubscribeThreadResult: ResolverTypeWrapper<SubscribeThreadResult>;
  Task: ResolverTypeWrapper<Task>;
  UnarchiveChannelResult: ResolverTypeWrapper<UnarchiveChannelResult>;
  UnreadCountsResponse: ResolverTypeWrapper<UnreadCountsResponse>;
  UnsubscribeThreadResult: ResolverTypeWrapper<UnsubscribeThreadResult>;
  UpdateChannelDescriptionResult: ResolverTypeWrapper<UpdateChannelDescriptionResult>;
  UpdateChannelVisibilityResult: ResolverTypeWrapper<UpdateChannelVisibilityResult>;
  User: ResolverTypeWrapper<PrismaUser>;
  UserBasic: ResolverTypeWrapper<UserBasic>;
  UserPresence: ResolverTypeWrapper<UserPresence>;
  Whiteboard: ResolverTypeWrapper<Whiteboard>;
  Workspace: ResolverTypeWrapper<PrismaWorkspace>;
  WorkspaceInviteInfo: ResolverTypeWrapper<WorkspaceInviteInfo>;
  WorkspaceMember: ResolverTypeWrapper<PrismaWorkspaceMember>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptInviteInput: AcceptInviteInput;
  ActiveCollaborator: ActiveCollaborator;
  AddBoardCollaboratorsResult: AddBoardCollaboratorsResult;
  AddChannelMembersResult: AddChannelMembersResult;
  AddGroupMembersResult: AddGroupMembersResult;
  ArchiveChannelInput: ArchiveChannelInput;
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
  Conversation: Omit<Conversation, 'members'> & { members?: Maybe<Array<ResolversParentTypes['ConversationMember']>> };
  ConversationConnection: Omit<ConversationConnection, 'edges'> & { edges: Array<ResolversParentTypes['Conversation']> };
  ConversationMember: PrismaChatMember;
  ConversationUnreadCount: ConversationUnreadCount;
  CreateBoardInput: CreateBoardInput;
  CreateChannelInput: CreateChannelInput;
  CreateDmInput: CreateDmInput;
  CreateGroupInput: CreateGroupInput;
  CreateProjectInput: CreateProjectInput;
  CreateThreadInput: CreateThreadInput;
  CursorPosition: CursorPosition;
  DateTime: Scalars['DateTime']['output'];
  DeleteBoardResult: DeleteBoardResult;
  DeleteChannelResult: DeleteChannelResult;
  DeleteDmResult: DeleteDmResult;
  DeleteGroupResult: DeleteGroupResult;
  DeleteThreadResult: DeleteThreadResult;
  DmConversation: DmConversation;
  DmMember: DmMember;
  Float: Scalars['Float']['output'];
  GroupMemberInfo: GroupMemberInfo;
  HistoryPayload: Omit<HistoryPayload, 'messages'> & { messages: Array<ResolversParentTypes['ChatMessage']> };
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  InviteResponse: InviteResponse;
  InviteToWorkspaceInput: InviteToWorkspaceInput;
  JSON: Scalars['JSON']['output'];
  JoinResponse: JoinResponse;
  LastMessagePreview: LastMessagePreview;
  LeaveGroupResult: LeaveGroupResult;
  MessageReaction: Omit<MessageReaction, 'recentUsers'> & { recentUsers: Array<ResolversParentTypes['User']> };
  MessagesDelta: Omit<MessagesDelta, 'messages'> & { messages: Array<ResolversParentTypes['ChatMessage']> };
  Mutation: Record<PropertyKey, never>;
  MuteConversationResult: MuteConversationResult;
  Notification: PrismaNotification;
  NotificationConnection: Omit<NotificationConnection, 'edges'> & { edges: Array<ResolversParentTypes['NotificationEdge']> };
  NotificationEdge: Omit<NotificationEdge, 'node'> & { node: ResolversParentTypes['Notification'] };
  OnboardingStatus: OnboardingStatus;
  Page: Page;
  PageInfo: PageInfo;
  Project: PrismaProject;
  ProjectMember: PrismaProjectMember;
  Query: Record<PropertyKey, never>;
  ReactionUsersConnection: Omit<ReactionUsersConnection, 'users'> & { users: Array<ResolversParentTypes['User']> };
  ReadReceiptUser: ReadReceiptUser;
  ReadReceiptsResponse: ReadReceiptsResponse;
  RemoveBoardCollaboratorResult: RemoveBoardCollaboratorResult;
  RemoveChannelMemberResult: RemoveChannelMemberResult;
  RemoveGroupMemberResult: RemoveGroupMemberResult;
  RenameChannelInput: RenameChannelInput;
  RenameGroupResult: RenameGroupResult;
  ReopenThreadResult: ReopenThreadResult;
  String: Scalars['String']['output'];
  SubscribeThreadResult: SubscribeThreadResult;
  Task: Task;
  UnarchiveChannelResult: UnarchiveChannelResult;
  UnreadCountsResponse: UnreadCountsResponse;
  UnsubscribeThreadResult: UnsubscribeThreadResult;
  UpdateChannelDescriptionResult: UpdateChannelDescriptionResult;
  UpdateChannelVisibilityResult: UpdateChannelVisibilityResult;
  User: PrismaUser;
  UserBasic: UserBasic;
  UserPresence: UserPresence;
  Whiteboard: Whiteboard;
  Workspace: PrismaWorkspace;
  WorkspaceInviteInfo: WorkspaceInviteInfo;
  WorkspaceMember: PrismaWorkspaceMember;
}>;

export type ActiveCollaboratorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ActiveCollaborator'] = ResolversParentTypes['ActiveCollaborator']> = ResolversObject<{
  connectionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  cursorPosition?: Resolver<Maybe<ResolversTypes['CursorPosition']>, ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lastSeenAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _health?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  acceptWorkspaceInvite?: Resolver<ResolversTypes['JoinResponse'], ParentType, ContextType, RequireFields<MutationAcceptWorkspaceInviteArgs, 'input'>>;
  addBoardCollaborators?: Resolver<ResolversTypes['AddBoardCollaboratorsResult'], ParentType, ContextType, RequireFields<MutationAddBoardCollaboratorsArgs, 'boardId' | 'userIds'>>;
  addChannelMembers?: Resolver<ResolversTypes['AddChannelMembersResult'], ParentType, ContextType, RequireFields<MutationAddChannelMembersArgs, 'channelId' | 'userIds' | 'workspaceId'>>;
  addGroupMembers?: Resolver<ResolversTypes['AddGroupMembersResult'], ParentType, ContextType, RequireFields<MutationAddGroupMembersArgs, 'groupId' | 'userIds' | 'workspaceId'>>;
  archiveBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationArchiveBoardArgs, 'boardId'>>;
  archiveChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationArchiveChannelArgs, 'input'>>;
  checkChannelAvailability?: Resolver<ResolversTypes['ChannelAvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckChannelAvailabilityArgs, 'input'>>;
  checkProjectSlugAvailability?: Resolver<ResolversTypes['AvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckProjectSlugAvailabilityArgs, 'slug' | 'workspaceId'>>;
  checkSlugAvailability?: Resolver<ResolversTypes['AvailabilityResponse'], ParentType, ContextType, RequireFields<MutationCheckSlugAvailabilityArgs, 'slug'>>;
  closeThread?: Resolver<ResolversTypes['CloseThreadResult'], ParentType, ContextType, RequireFields<MutationCloseThreadArgs, 'threadId' | 'workspaceId'>>;
  createBoard?: Resolver<ResolversTypes['BoardPayload'], ParentType, ContextType, RequireFields<MutationCreateBoardArgs, 'input'>>;
  createChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateChannelArgs, 'input'>>;
  createDm?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateDmArgs, 'input'>>;
  createGroup?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateGroupArgs, 'input'>>;
  createOnboardingWorkspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType>;
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input' | 'workspaceId'>>;
  createThread?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationCreateThreadArgs, 'input'>>;
  createWorkspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType, RequireFields<MutationCreateWorkspaceArgs, 'name' | 'slug'>>;
  deleteBoard?: Resolver<ResolversTypes['DeleteBoardResult'], ParentType, ContextType, RequireFields<MutationDeleteBoardArgs, 'boardId'>>;
  deleteChannel?: Resolver<ResolversTypes['DeleteChannelResult'], ParentType, ContextType, RequireFields<MutationDeleteChannelArgs, 'channelId' | 'workspaceId'>>;
  deleteDm?: Resolver<ResolversTypes['DeleteDmResult'], ParentType, ContextType, RequireFields<MutationDeleteDmArgs, 'dmId' | 'workspaceId'>>;
  deleteGroup?: Resolver<ResolversTypes['DeleteGroupResult'], ParentType, ContextType, RequireFields<MutationDeleteGroupArgs, 'groupId' | 'workspaceId'>>;
  deleteThread?: Resolver<ResolversTypes['DeleteThreadResult'], ParentType, ContextType, RequireFields<MutationDeleteThreadArgs, 'threadId' | 'workspaceId'>>;
  inviteToWorkspace?: Resolver<ResolversTypes['InviteResponse'], ParentType, ContextType, RequireFields<MutationInviteToWorkspaceArgs, 'input'>>;
  leaveGroup?: Resolver<ResolversTypes['LeaveGroupResult'], ParentType, ContextType, RequireFields<MutationLeaveGroupArgs, 'groupId' | 'workspaceId'>>;
  lockBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationLockBoardArgs, 'boardId'>>;
  markAllNotificationsRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  markNotificationRead?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationMarkNotificationReadArgs, 'ids'>>;
  muteConversation?: Resolver<ResolversTypes['MuteConversationResult'], ParentType, ContextType, RequireFields<MutationMuteConversationArgs, 'conversationId' | 'isMuted'>>;
  removeBoardCollaborator?: Resolver<ResolversTypes['RemoveBoardCollaboratorResult'], ParentType, ContextType, RequireFields<MutationRemoveBoardCollaboratorArgs, 'boardId' | 'userId'>>;
  removeChannelMember?: Resolver<ResolversTypes['RemoveChannelMemberResult'], ParentType, ContextType, RequireFields<MutationRemoveChannelMemberArgs, 'channelId' | 'userId' | 'workspaceId'>>;
  removeGroupMember?: Resolver<ResolversTypes['RemoveGroupMemberResult'], ParentType, ContextType, RequireFields<MutationRemoveGroupMemberArgs, 'groupId' | 'userId' | 'workspaceId'>>;
  removeWorkspaceMember?: Resolver<ResolversTypes['InviteResponse'], ParentType, ContextType, RequireFields<MutationRemoveWorkspaceMemberArgs, 'memberId' | 'workspaceId'>>;
  renameBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationRenameBoardArgs, 'boardId' | 'title'>>;
  renameChannel?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<MutationRenameChannelArgs, 'input'>>;
  renameGroup?: Resolver<ResolversTypes['RenameGroupResult'], ParentType, ContextType, RequireFields<MutationRenameGroupArgs, 'groupId' | 'name' | 'workspaceId'>>;
  reopenThread?: Resolver<ResolversTypes['ReopenThreadResult'], ParentType, ContextType, RequireFields<MutationReopenThreadArgs, 'threadId' | 'workspaceId'>>;
  subscribeThread?: Resolver<ResolversTypes['SubscribeThreadResult'], ParentType, ContextType, RequireFields<MutationSubscribeThreadArgs, 'threadId'>>;
  syncUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationSyncUserArgs, 'clerkId' | 'email'>>;
  unarchiveBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUnarchiveBoardArgs, 'boardId'>>;
  unarchiveChannel?: Resolver<ResolversTypes['UnarchiveChannelResult'], ParentType, ContextType, RequireFields<MutationUnarchiveChannelArgs, 'channelId' | 'workspaceId'>>;
  unlockBoard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUnlockBoardArgs, 'boardId'>>;
  unsubscribeThread?: Resolver<ResolversTypes['UnsubscribeThreadResult'], ParentType, ContextType, RequireFields<MutationUnsubscribeThreadArgs, 'threadId'>>;
  updateBoardDescription?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType, RequireFields<MutationUpdateBoardDescriptionArgs, 'boardId'>>;
  updateChannelDescription?: Resolver<ResolversTypes['UpdateChannelDescriptionResult'], ParentType, ContextType, RequireFields<MutationUpdateChannelDescriptionArgs, 'channelId' | 'workspaceId'>>;
  updateChannelVisibility?: Resolver<ResolversTypes['UpdateChannelVisibilityResult'], ParentType, ContextType, RequireFields<MutationUpdateChannelVisibilityArgs, 'channelId' | 'isPublic' | 'workspaceId'>>;
  updateWorkspaceMemberRole?: Resolver<ResolversTypes['WorkspaceMember'], ParentType, ContextType, RequireFields<MutationUpdateWorkspaceMemberRoleArgs, 'memberId' | 'role' | 'workspaceId'>>;
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

export type PageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Page'] = ResolversParentTypes['Page']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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

export type ProjectMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMember'] = ResolversParentTypes['ProjectMember']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  activeCollaborators?: Resolver<Array<ResolversTypes['ActiveCollaborator']>, ParentType, ContextType, RequireFields<QueryActiveCollaboratorsArgs, 'boardId'>>;
  boardCollaborators?: Resolver<Array<ResolversTypes['BoardCollaborator']>, ParentType, ContextType, RequireFields<QueryBoardCollaboratorsArgs, 'boardId'>>;
  getBoard?: Resolver<Maybe<ResolversTypes['Whiteboard']>, ParentType, ContextType, RequireFields<QueryGetBoardArgs, 'boardId'>>;
  getBoardSnapshot?: Resolver<ResolversTypes['BoardSnapshot'], ParentType, ContextType, RequireFields<QueryGetBoardSnapshotArgs, 'boardId'>>;
  getChannelMembers?: Resolver<Array<ResolversTypes['ChatMemberRecord']>, ParentType, ContextType, RequireFields<QueryGetChannelMembersArgs, 'channelId'>>;
  getConversation?: Resolver<ResolversTypes['Conversation'], ParentType, ContextType, RequireFields<QueryGetConversationArgs, 'conversationId'>>;
  getDmByUsers?: Resolver<Maybe<ResolversTypes['DmConversation']>, ParentType, ContextType, RequireFields<QueryGetDmByUsersArgs, 'otherUserId' | 'projectId' | 'workspaceId'>>;
  getLastReadMessage?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType, RequireFields<QueryGetLastReadMessageArgs, 'channelId'>>;
  getMessageById?: Resolver<Maybe<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMessageByIdArgs, 'messageId'>>;
  getMessagesAfterCursor?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMessagesAfterCursorArgs, 'afterCursor' | 'channelId'>>;
  getMissingMessages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetMissingMessagesArgs, 'channelId' | 'rangeEnd' | 'rangeStart'>>;
  getReadReceipts?: Resolver<ResolversTypes['ReadReceiptsResponse'], ParentType, ContextType, RequireFields<QueryGetReadReceiptsArgs, 'messageId'>>;
  getThreadMessages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetThreadMessagesArgs, 'parentMessageId'>>;
  getUnreadCounts?: Resolver<ResolversTypes['UnreadCountsResponse'], ParentType, ContextType, RequireFields<QueryGetUnreadCountsArgs, 'projectId' | 'workspaceId'>>;
  getUserConversations?: Resolver<ResolversTypes['ConversationConnection'], ParentType, ContextType, RequireFields<QueryGetUserConversationsArgs, 'projectId' | 'workspaceId'>>;
  getUsersByIds?: Resolver<Array<ResolversTypes['UserBasic']>, ParentType, ContextType, RequireFields<QueryGetUsersByIdsArgs, 'userIds'>>;
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
  reactionUsers?: Resolver<ResolversTypes['ReactionUsersConnection'], ParentType, ContextType, RequireFields<QueryReactionUsersArgs, 'emoji' | 'messageId'>>;
  unreadNotificationCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userBoards?: Resolver<ResolversTypes['BoardConnection'], ParentType, ContextType, RequireFields<QueryUserBoardsArgs, 'workspaceId'>>;
  workspaceBoards?: Resolver<ResolversTypes['BoardConnection'], ParentType, ContextType, RequireFields<QueryWorkspaceBoardsArgs, 'workspaceId'>>;
  workspaceBySlug?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType, RequireFields<QueryWorkspaceBySlugArgs, 'slug'>>;
  workspaceMembers?: Resolver<Array<ResolversTypes['WorkspaceMember']>, ParentType, ContextType, RequireFields<QueryWorkspaceMembersArgs, 'workspaceId'>>;
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

export type RenameGroupResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RenameGroupResult'] = ResolversParentTypes['RenameGroupResult']> = ResolversObject<{
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ReopenThreadResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReopenThreadResult'] = ResolversParentTypes['ReopenThreadResult']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  threadId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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

export type UnarchiveChannelResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UnarchiveChannelResult'] = ResolversParentTypes['UnarchiveChannelResult']> = ResolversObject<{
  channelId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ActiveCollaborator?: ActiveCollaboratorResolvers<ContextType>;
  AddBoardCollaboratorsResult?: AddBoardCollaboratorsResultResolvers<ContextType>;
  AddChannelMembersResult?: AddChannelMembersResultResolvers<ContextType>;
  AddGroupMembersResult?: AddGroupMembersResultResolvers<ContextType>;
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
  Conversation?: ConversationResolvers<ContextType>;
  ConversationConnection?: ConversationConnectionResolvers<ContextType>;
  ConversationMember?: ConversationMemberResolvers<ContextType>;
  ConversationUnreadCount?: ConversationUnreadCountResolvers<ContextType>;
  CursorPosition?: CursorPositionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteBoardResult?: DeleteBoardResultResolvers<ContextType>;
  DeleteChannelResult?: DeleteChannelResultResolvers<ContextType>;
  DeleteDmResult?: DeleteDmResultResolvers<ContextType>;
  DeleteGroupResult?: DeleteGroupResultResolvers<ContextType>;
  DeleteThreadResult?: DeleteThreadResultResolvers<ContextType>;
  DmConversation?: DmConversationResolvers<ContextType>;
  DmMember?: DmMemberResolvers<ContextType>;
  GroupMemberInfo?: GroupMemberInfoResolvers<ContextType>;
  HistoryPayload?: HistoryPayloadResolvers<ContextType>;
  InviteResponse?: InviteResponseResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JoinResponse?: JoinResponseResolvers<ContextType>;
  LastMessagePreview?: LastMessagePreviewResolvers<ContextType>;
  LeaveGroupResult?: LeaveGroupResultResolvers<ContextType>;
  MessageReaction?: MessageReactionResolvers<ContextType>;
  MessagesDelta?: MessagesDeltaResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MuteConversationResult?: MuteConversationResultResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationConnection?: NotificationConnectionResolvers<ContextType>;
  NotificationEdge?: NotificationEdgeResolvers<ContextType>;
  OnboardingStatus?: OnboardingStatusResolvers<ContextType>;
  Page?: PageResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectMember?: ProjectMemberResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ReactionUsersConnection?: ReactionUsersConnectionResolvers<ContextType>;
  ReadReceiptUser?: ReadReceiptUserResolvers<ContextType>;
  ReadReceiptsResponse?: ReadReceiptsResponseResolvers<ContextType>;
  RemoveBoardCollaboratorResult?: RemoveBoardCollaboratorResultResolvers<ContextType>;
  RemoveChannelMemberResult?: RemoveChannelMemberResultResolvers<ContextType>;
  RemoveGroupMemberResult?: RemoveGroupMemberResultResolvers<ContextType>;
  RenameGroupResult?: RenameGroupResultResolvers<ContextType>;
  ReopenThreadResult?: ReopenThreadResultResolvers<ContextType>;
  SubscribeThreadResult?: SubscribeThreadResultResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  UnarchiveChannelResult?: UnarchiveChannelResultResolvers<ContextType>;
  UnreadCountsResponse?: UnreadCountsResponseResolvers<ContextType>;
  UnsubscribeThreadResult?: UnsubscribeThreadResultResolvers<ContextType>;
  UpdateChannelDescriptionResult?: UpdateChannelDescriptionResultResolvers<ContextType>;
  UpdateChannelVisibilityResult?: UpdateChannelVisibilityResultResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserBasic?: UserBasicResolvers<ContextType>;
  UserPresence?: UserPresenceResolvers<ContextType>;
  Whiteboard?: WhiteboardResolvers<ContextType>;
  Workspace?: WorkspaceResolvers<ContextType>;
  WorkspaceInviteInfo?: WorkspaceInviteInfoResolvers<ContextType>;
  WorkspaceMember?: WorkspaceMemberResolvers<ContextType>;
}>;

