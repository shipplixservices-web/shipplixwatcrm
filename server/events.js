// Server-Sent Events (SSE) manager for instant real-time synchronization

const clients = new Set();

export function registerSSEClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  clients.add(res);

  // Heartbeat ping every 25 seconds to keep connection open
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.delete(res);
  });
}

export function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (e) {
      clients.delete(client);
    }
  }
}
