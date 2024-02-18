"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SystemConfig = {
    //Node config
    host: process.env.host || "",
    port: Number(process.env.port) || 22555,
    password: process.env.password || "",
    user: process.env.username || "",
};
exports.default = SystemConfig;
