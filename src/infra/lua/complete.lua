-- KEYS[1]=key
-- ARGV[1]=owner, ARGV[2]=ttl
local raw = redis.call("GET", KEYS[1])
if not raw then return "STOLEN" end
local data = cjson.decode(raw)
if data.owner == ARGV[1] then
  data.status = "COMPLETED"
  redis.call("SET", KEYS[1], cjson.encode(data), "EX", ARGV[2])
  return "OK"
end
return "STOLEN"
