-- Add reaction atomically
-- KEYS[1] = reactions:{messageId}:{emoji}
-- KEYS[2] = reaction-counts:{messageId}
-- KEYS[3] = user-reactions:{userId}
-- KEYS[4] = reaction-events:{conversationId}
-- ARGV[1] = timestamp
-- ARGV[2] = userId
-- ARGV[3] = emoji
-- ARGV[4] = messageId
-- ARGV[5] = conversationId

local added = redis.call("ZADD", KEYS[1], "NX", ARGV[1], ARGV[2])

if added == 1 then
  redis.call("HINCRBY", KEYS[2], ARGV[3], 1)
  redis.call("SADD", KEYS[3], ARGV[4] .. ":" .. ARGV[3])
  redis.call("XADD", KEYS[4], "MAXLEN", "~", "10000", "*",
    "action", "add",
    "messageId", ARGV[4],
    "userId", ARGV[2],
    "emoji", ARGV[3],
    "ts", ARGV[1]
  )
  redis.call("EXPIRE", KEYS[1], 604800)
  redis.call("EXPIRE", KEYS[2], 604800)
  return 1
else
  return 0
end
