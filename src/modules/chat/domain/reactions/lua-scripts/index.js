"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeReactionScript = exports.addReactionScript = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load Lua scripts at startup for performance
const addReactionScript = fs_1.default.readFileSync(path_1.default.join(__dirname, "add-reaction.lua"), "utf-8");
exports.addReactionScript = addReactionScript;
const removeReactionScript = fs_1.default.readFileSync(path_1.default.join(__dirname, "remove-reaction.lua"), "utf-8");
exports.removeReactionScript = removeReactionScript;
