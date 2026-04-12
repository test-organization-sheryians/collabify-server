// =============================================================================
// Event Handler Auto-Loader
//
// Importing this file triggers side-effect registration of ALL event handlers
// into the global registry. Import once at engine startup (bootstrap.ts).
//
// ⚠️  ORDER MATTERS: Do not reorder. Handlers within a domain are independent
//     but the file must be imported before the engine starts processing.
// =============================================================================

// ── System ────────────────────────────────────────────────────────────────────
import "./system/user.welcome";
import "./system/system.subscription.expiring";
import "./system/system.plan.limit";

// ── Workspace ─────────────────────────────────────────────────────────────────
import "./workspace/workspace.invite.sent";
import "./workspace/workspace.invite.resent";
import "./workspace/workspace.invite.accepted";
import "./workspace/workspace.member.joined";
import "./workspace/workspace.member.removed";
import "./workspace/workspace.member.role_changed";
import "./workspace/workspace.ownership.transferred";

// ── Project ───────────────────────────────────────────────────────────────────
import "./project/project.member.added";
import "./project/project.member.removed";
import "./project/project.member.role_changed";
import "./project/project.archived";
import "./project/project.unarchived";

// ── Issues ────────────────────────────────────────────────────────────────────
import "./issues/issue.assigned";
import "./issues/issue.unassigned";
import "./issues/issue.mention";
import "./issues/issue.status.changed";
import "./issues/issue.priority.changed";
import "./issues/issue.due_date.approaching";
import "./issues/issue.overdue";
import "./issues/issue.created";
import "./issues/issue.deleted";

// ── Pages ─────────────────────────────────────────────────────────────────────
import "./pages/page.collaborator.added";
import "./pages/page.collaborator.removed";
import "./pages/page.mention";
import "./pages/page.locked";
import "./pages/page.archived";
import "./pages/page.deleted";

// ── Whiteboard ────────────────────────────────────────────────────────────────
import "./whiteboard/whiteboard.collaborator.added";
import "./whiteboard/whiteboard.collaborator.removed";
import "./whiteboard/whiteboard.locked";
import "./whiteboard/whiteboard.archived";

// ── Vault ─────────────────────────────────────────────────────────────────────
import "./vault/vault.storage.limit";

// ── Chat ──────────────────────────────────────────────────────────────────────
import "./chat/chat.message.new";
import "./chat/chat.message.mention";
import "./chat/chat.message.reply";
import "./chat/chat.thread.created";
import "./chat/chat.thread.reply";
import "./chat/chat.channel.member.added";
import "./chat/chat.channel.member.removed";
import "./chat/chat.group.member.added";
import "./chat/chat.dm.created";
import "./chat/chat.reaction.added";
