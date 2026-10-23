import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { McpClientManager, McpAssistantEngine } from './mcpClientBridge.js';

export const mcpClientRouter = Router();

// Protect all MCP client endpoints with user JWT authentication
mcpClientRouter.use(authMiddleware);

/**
 * Helper to extract JWT token string from Authorization header
 */
function extractToken(req: AuthenticatedRequest): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return '';
}

/**
 * GET /api/v1/mcp-client/status
 * Queries the official MCP Server over Streamable HTTP SSE and lists discovered tools.
 */
mcpClientRouter.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const token = extractToken(req);

  try {
    const tools = await McpClientManager.listTools(token, userId);

    res.json({
      connected: true,
      protocol: 'Model Context Protocol (MCP)',
      specification: 'Streamable HTTP Transport Specification / SDK 1.32.1',
      transport: 'Streamable HTTP',
      serverEndpoint: '/mcp',
      toolCount: tools.length,
      tools: tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('MCP client status check failed:', err);
    res.status(502).json({
      connected: false,
      error: err.message || 'Failed to establish Streamable HTTP session with MCP server',
      transport: 'Streamable HTTP',
      serverEndpoint: '/mcp',
    });
  }
});

/**
 * POST /api/v1/mcp-client/call-tool
 * Direct tool execution over official MCP JSON-RPC protocol
 */
mcpClientRouter.post('/call-tool', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const token = extractToken(req);
  const { tool, arguments: toolArgs = {} } = req.body;

  if (!tool) {
    res.status(400).json({ error: 'Tool name is required.' });
    return;
  }

  try {
    const trace = await McpClientManager.callTool(token, userId, tool, toolArgs);
    res.json(trace);
  } catch (err: any) {
    console.error(`MCP callTool (${tool}) error:`, err);
    res.status(500).json({ error: err.message || `Failed to execute MCP tool ${tool}` });
  }
});

/**
 * POST /api/v1/mcp-client/assistant
 * Processes natural language speech/text via the official MCP client over Streamable HTTP SSE.
 */
mcpClientRouter.post('/assistant', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const token = extractToken(req);
  const { text } = req.body;

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Text or speech transcript is required.' });
    return;
  }

  try {
    const result = await McpAssistantEngine.processRequest(userId, token, text);
    res.json(result);
  } catch (err: any) {
    console.error('MCP assistant processing error:', err);
    res.status(500).json({ error: err.message || 'Failed to process assistant request via MCP client.' });
  }
});
