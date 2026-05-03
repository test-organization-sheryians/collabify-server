import { redis } from "@/infra/redis";
import { AppError } from "@/shared/errors";

const SCRIPTS = {
  // KEYS[1]: lockKey, ARGV[1]: ownerId, ARGV[2]: ttlSeconds
  ACQUIRE: `
    local lockKey = KEYS[1]
    local ownerId = ARGV[1]
    local ttl = ARGV[2]
    return redis.call("SET", lockKey, ownerId, "NX", "EX", ttl)
  `,

  // KEYS[1]: lockKey, ARGV[1]: ownerId
  RELEASE: `
    local lockKey = KEYS[1]
    local ownerId = ARGV[1]
    if redis.call("GET", lockKey) == ownerId then
        return redis.call("DEL", lockKey)
    else
        return 0
    end
  `,

  // KEYS[1]: oldLockKey, KEYS[2]: newLockKey, KEYS[3]: userReservationKey
  // ARGV[1]: ownerId, ARGV[2]: ttlSeconds, ARGV[3]: newSlug

  SWITCH: `
    local oldKey = KEYS[1]
    local newKey = KEYS[2]
    local resKey = KEYS[3]
    local owner = ARGV[1]
    local ttl = ARGV[2]
    local slug = ARGV[3]

    -- 1. Integrity Check: Is Target already taken by SOMEONE ELSE?
    local currentTargetOwner = redis.call("GET", newKey)
    if currentTargetOwner and currentTargetOwner ~= owner then
        return 0 -- Fail: Target is busy
    end

    -- 2. Acquire Target
    local acquired = redis.call("SET", newKey, owner, "NX", "EX", ttl)

    if not acquired then
        if currentTargetOwner == owner then
            redis.call("EXPIRE", newKey, ttl)
        else
            return 0 -- Fail: Lost race
        end
    end

    -- 3. Release Source (Cleanup)
    if oldKey ~= newKey then
        local oldOwner = redis.call("GET", oldKey)
        if oldOwner == owner then
            redis.call("DEL", oldKey)
        end
    end

    -- 4. Update Reservation Pointer (Atomic)
    if resKey and resKey ~= "" then
        redis.call("SET", resKey, slug, "EX", ttl)
    end

    return 1 -- Success
  `,

  // KEYS[1]: lockKey, KEYS[2]: persistenceKey, KEYS[3]: userReservationKey, ARGV[1]: ownerId, ARGV[2]: cacheValue, ARGV[3]: cacheTTL
  FINALIZE: `
    local lockKey = KEYS[1]
    local persistenceKey = KEYS[2]
    local resKey = KEYS[3]
    local owner = ARGV[1]
    local val = ARGV[2]
    local ttl = ARGV[3]

    -- 1. Validate Ownership
    local lockOwner = redis.call("GET", lockKey)
    if lockOwner and lockOwner ~= owner then
        return 0 -- Fail: Lock stolen or not owned
    end

    -- 2. Clean up Lock
    redis.call("DEL", lockKey)

    -- 3. Clean up User Reservation (if passed)
    if resKey and resKey ~= "" then
        redis.call("DEL", resKey)
    end

    -- 4. Set Persistence Key
    redis.call("SET", persistenceKey, val, "EX", ttl)

    return 1
  `,
};

/**
 * Functional Core: Locking Primitives
 */

const acquire = async (
  key: string,
  owner: string,
  ttl: number
): Promise<boolean> => {
  try {
    const res = await redis.eval(
      SCRIPTS.ACQUIRE,
      1,
      key,
      owner,
      ttl.toString()
    );
    return res === "OK";
  } catch (error) {
    throw new AppError("Lock acquire failed", "LOCK_ERROR", 500);
  }
};

const release = async (key: string, owner: string): Promise<boolean> => {
  try {
    const res = await redis.eval(SCRIPTS.RELEASE, 1, key, owner);
    return res === 1;
  } catch (error) {
    throw new AppError("Lock release failed", "LOCK_ERROR", 500);
  }
};

const switchLock = async (
  oldKey: string,
  newKey: string,
  owner: string,
  ttl: number,
  userResKey: string,
  newSlug: string
): Promise<boolean> => {
  try {
    const res = await redis.eval(
      SCRIPTS.SWITCH,
      3,
      oldKey,
      newKey,
      userResKey,
      owner,
      ttl.toString(),
      newSlug
    );
    return res === 1;
  } catch (error) {
    throw new AppError("Lock switch failed", "LOCK_ERROR", 500);
  }
};

const finalize = async (
  lockKey: string,
  persistenceKey: string,
  val: string,
  ttl: number,
  owner: string,
  userReservationKey?: string
): Promise<void> => {
  try {
    const res = await redis.eval(
      SCRIPTS.FINALIZE,
      3,
      lockKey,
      persistenceKey,
      userReservationKey || "",
      owner,
      val,
      ttl.toString()
    );
    if (res === 0) {
      throw new AppError(
        "Failed to finalize lock: ownership mismatch or lock lost",
        "LOCK_FINALIZE_FAILED"
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Lock finalize failed", "LOCK_ERROR", 500);
  }
};

const verify = async (lockKey: string, owner: string): Promise<boolean> => {
  const current = await redis.get(lockKey);
  return current === owner;
};

export const LockingService = {
  acquire,
  release,
  switch: switchLock,
  finalize,
  verify,
};
