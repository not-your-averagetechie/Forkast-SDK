import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const bot = spawn('node', ['../dist/arbitrage-bot.js'], { cwd: process.cwd() });

    // Handle client disconnects to avoid stalled requests
    const clientDisconnected = () => {
      bot.kill();
      res.end();
    };
    req.on('close', clientDisconnected);

    const flush = () => {
      if (typeof res.flush === 'function') res.flush();
    };
    bot.stdout.on('data', (data) => {
      res.write(`data: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
      flush();
    });
    bot.stderr.on('data', (data) => {
      res.write(`data: ERROR: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
      flush();
    });
    bot.on('close', () => {
      res.write('data: BOT_FINISHED\n\n');
      flush();
      res.end();
    });
    // Safety timeout: end response after 2 minutes if not closed
    setTimeout(() => {
      if (!res.writableEnded) {
        res.write('data: BOT_TIMEOUT\n\n');
        flush();
        res.end();
        bot.kill();
      }
    }, 120000);
  } catch (err: any) {
    res.write(`data: ERROR: ${err?.message || 'Unknown error'}\n\n`);
    res.end();
  }
}
