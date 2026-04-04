import { NextRequest } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

// Broadcast function to send events to all connected clients
export function broadcastBookingEvent(event: string, data: any) {
  const message = `data: ${JSON.stringify({ event, data })}\n\n`;
  console.log(`[SSE] Broadcasting event "${event}" to ${connections.size} connections`);
  let successCount = 0;
  let failCount = 0;
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
      successCount++;
    } catch (error) {
      console.error('[SSE] Error sending message to connection:', error);
      connections.delete(controller);
      failCount++;
      try {
        controller.close();
      } catch (e) {
        // Ignore
      }
    }
  });
  
  console.log(`[SSE] Broadcast complete: ${successCount} sent, ${failCount} failed`);
}

export async function GET(request: NextRequest) {
  console.log('[SSE] Connection attempt');
  console.log('[SSE] Headers:', {
    'user-agent': request.headers.get('user-agent'),
    'cookie': request.headers.get('cookie') ? 'present' : 'missing',
    'referer': request.headers.get('referer'),
  });
  
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) {
    console.log('[SSE] Authentication failed - returning 401');
    // Return error response that EventSource can handle
    return new Response(
      `data: ${JSON.stringify({ event: 'error', data: { message: 'Authentication required' } })}\n\n`,
      {
        status: 401,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'close',
        },
      }
    );
  }

  console.log('[SSE] Authentication successful, creating stream');

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to set
      connections.add(controller);
      console.log('[SSE] New connection established, total connections:', connections.size);

      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({ event: 'connected', data: { message: 'Connected to booking events', timestamp: Date.now() } })}\n\n`;
      try {
        controller.enqueue(new TextEncoder().encode(welcomeMessage));
        console.log('[SSE] Welcome message sent');
      } catch (error) {
        console.error('[SSE] Error sending welcome message:', error);
        connections.delete(controller);
        try {
          controller.close();
        } catch (e) {
          // Ignore
        }
        return;
      }

      // Send periodic ping to keep connection alive (every 30 seconds)
      const pingInterval = setInterval(() => {
        try {
          if (connections.has(controller)) {
            const pingMessage = `data: ${JSON.stringify({ event: 'ping', data: { timestamp: Date.now() } })}\n\n`;
            controller.enqueue(new TextEncoder().encode(pingMessage));
          }
        } catch (error) {
          console.error('Error sending ping:', error);
          clearInterval(pingInterval);
          connections.delete(controller);
          try {
            controller.close();
          } catch (e) {
            // Ignore
          }
        }
      }, 30000);

      // Handle client disconnect
      const cleanup = () => {
        console.log('[SSE] Cleaning up connection');
        clearInterval(pingInterval);
        connections.delete(controller);
        console.log('[SSE] Connection closed, remaining connections:', connections.size);
        try {
          controller.close();
        } catch (error) {
          // Ignore errors on close
        }
      };

      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Request aborted');
        cleanup();
      });
      
      // Also handle stream cancellation
      return cleanup;
    },
    cancel(reason) {
      // Handle stream cancellation
      console.log('[SSE] Stream cancelled:', reason);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

