import fs from "fs";
import path from "path";

// Load Lua scripts at startup for performance
const addReactionScript = fs.readFileSync(
  path.join(__dirname, "add-reaction.lua"),
  "utf-8"
);

const removeReactionScript = fs.readFileSync(
  path.join(__dirname, "remove-reaction.lua"),
  "utf-8"
);

export { addReactionScript, removeReactionScript };
