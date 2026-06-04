import { getState, subscribe, unsubscribe, type WallState } from '@/server/wallState';

export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function encodeState(state: WallState): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(state)}\n\n`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') ?? 'anonymous';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: Uint8Array) => {
        if (!closed) {
          controller.enqueue(chunk);
        }
      };

      const onState = (state: WallState) => send(encodeState(state));

      send(encoder.encode(`: connected ${clientId}\n\n`));
      send(encodeState(getState()));
      subscribe(onState);

      const keepAlive = setInterval(() => {
        send(encoder.encode(`: keep-alive ${new Date().toISOString()}\n\n`));
      }, 20_000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        unsubscribe(onState);
        controller.close();
      };

      request.signal.addEventListener('abort', close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
