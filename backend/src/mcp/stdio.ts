import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { initDatabase, db } from '../db/database.js';
import { createTaskPilotMcpServer } from './taskpilotMcpServer.js';

dotenv.config();
initDatabase();

async function main() {
  const userEmail = process.env.TASKPILOT_USER_EMAIL || 'demo@taskpilot.ai';
  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(userEmail) as any;

  if (!user) {
    console.error(`TaskPilot MCP Stdio: User '${userEmail}' not found in database.`);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  const mcpServer = createTaskPilotMcpServer(user.id);

  await mcpServer.connect(transport);
  // Log status to stderr so stdio JSON-RPC on stdout is unpolluted
  console.error(`TaskPilot MCP Server running on stdio for user ${user.email} (${user.id})`);
}

main().catch((err) => {
  console.error('Fatal MCP stdio error:', err);
  process.exit(1);
});
