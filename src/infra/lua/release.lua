-- KEYS[1]=key
-- ARGV[1]=owner
local raw = redis.call("GET", KEYS[1])
if not raw then return "GONE" end
local data = cjson.decode(raw)
if data.owner == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return "STOLEN"
