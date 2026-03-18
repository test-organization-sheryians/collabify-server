-- Remove reaction atomically
-- KEYS[1] = reactions:{messageId}:{emoji}
-- KEYS[2] = reaction-counts:{messageId}
-- KEYS[3] = user-reactions:{userId}
-- KEYS[4] = reaction-events:{conversationId}
-- ARGV[1] = userId
-- ARGV[2] = emoji
-- ARGV[3] = messageId
-- ARGV[4] = conversationId
-- ARGV[5] = timestamp

local removed = redis.call("ZREM", KEYS[1], ARGV[1])

if removed == 1 then
  local newCount = redis.call("HINCRBY", KEYS[2], ARGV[2], -1)
  if newCount == 0 then
    redis.call("HDEL", KEYS[2], ARGV[2])
  end
  redis.call("SREM", KEYS[3], ARGV[3] .. ":" .. ARGV[2])
  redis.call("XADD", KEYS[4], "MAXLEN", "~", "10000", "*",
    "action", "remove",
    "messageId", ARGV[3],
    "userId", ARGV[1],
    "emoji", ARGV[2],
    "ts", ARGV[5]
  )
  return 1
else
  return 0
end
