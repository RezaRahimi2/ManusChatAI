import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agents
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // orchestrator, research, code, writer, etc.
  systemPrompt: text("system_prompt"),
  model: text("model").notNull(), // gpt-4, claude-3-sonnet, ollama/llama2, etc.
  provider: text("provider").notNull(), // openai, anthropic, ollama, lmstudio
  temperature: integer("temperature").default(70), // scaled by 100 (0.7 = 70)
  maxTokens: integer("max_tokens").default(4000),
  isActive: boolean("is_active").default(true),
  tools: text("tools").array(), // tool IDs that this agent can use
  createdAt: integer("created_at").notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true, 
  createdAt: true
}).extend({
  temperature: z.number().min(0).max(2),
  tools: z.array(z.string()).optional()
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// Workspaces
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  role: text("role").notNull(), // user, assistant, system, agent:{id}
  content: text("content").notNull(),
  agentId: integer("agent_id"), // optional - which agent sent this message
  metadata: jsonb("metadata"), // any additional metadata
  createdAt: integer("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Tools
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // web_browser, file_system, code_execution, api_connector
  isEnabled: boolean("is_enabled").default(true),
  config: jsonb("config"), // tool-specific configuration
});

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true
});

export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;

// Memory
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // short_term, vector, etc.
  key: text("key").notNull(),
  value: text("value").notNull(),
  metadata: jsonb("metadata"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  createdAt: true
});

export type Memory = typeof memories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
