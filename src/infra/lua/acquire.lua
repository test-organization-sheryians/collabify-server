-- KEYS[1]=key
-- ARGV[1]=owner, ARGV[2]=hash, ARGV[3]=ttl
if redis.call("EXISTS", KEYS[1]) == 1 then
  local raw = redis.call("GET", KEYS[1])
  if not raw then return "GONE" end
  local data = cjson.decode(raw)
  if data.hash ~= ARGV[2] then return "CONFLICT" end
  if data.status == "COMPLETED" then return "COMPLETED" end
  return "LOCKED"
end
redis.call("SET", KEYS[1], cjson.encode({status="PROCESSING", owner=ARGV[1], hash=ARGV[2]}), "EX", ARGV[3])
return "ACQUIRED"
