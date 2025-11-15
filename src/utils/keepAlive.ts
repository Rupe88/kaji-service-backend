import * as cron from 'node-cron';
import { serverConfig } from '../config/env';
import http from 'http';
import https from 'https';

type ScheduledTask = ReturnType<typeof cron.schedule>;

/**
 * Keep-alive service to prevent server from freezing on free-tier hosting (Render, Railway, etc.)
 * Pings the health endpoint every 14 minutes to keep the server active
 */
export const startKeepAlive = (port: number): ScheduledTask | undefined => {
  // Only run in production or if explicitly enabled
  if (serverConfig.nodeEnv !== 'production' && !process.env.ENABLE_KEEP_ALIVE) {
    console.log('ℹ️  Keep-alive service disabled (not in production)');
    return undefined;
  }

  const keepAliveUrl =
    process.env.KEEP_ALIVE_URL || `http://localhost:${port}/health`;
  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL || '14', 10);

  // Schedule cron job to ping health endpoint every N minutes
  // Using 14 minutes to stay under Render's 15-minute inactivity threshold
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(`🔄 Keep-alive service starting...`);
  console.log(`   URL: ${keepAliveUrl}`);
  console.log(`   Interval: Every ${intervalMinutes} minutes`);
  console.log(`   Cron: ${cronExpression}`);

  // Function to ping health endpoint
  const pingHealthEndpoint = async () => {
    try {
      const startTime = Date.now();

      // Make HTTP/HTTPS request to health endpoint
      const url = new URL(keepAliveUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'HR-Platform-KeepAlive/1.0',
          Accept: 'application/json',
        },
        // For HTTPS, reject unauthorized certificates (set to false in production if needed)
        rejectUnauthorized: true,
      };

      const req = client.request(options, (res: http.IncomingMessage) => {
        const duration = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(
              `✅ Keep-alive ping successful (${duration}ms) - Server is active`
            );
          } else {
            console.warn(
              `⚠️  Keep-alive ping returned status ${res.statusCode} (${duration}ms)`
            );
            if (res.statusCode === 400) {
              console.warn(`   Response: ${data.substring(0, 200)}`);
            }
          }
        });
      });

      req.on('error', (error: any) => {
        const duration = Date.now() - startTime;
        console.error(
          `❌ Keep-alive ping failed (${duration}ms):`,
          error.message
        );
      });

      req.on('timeout', () => {
        req.destroy();
        const duration = Date.now() - startTime;
        console.error(`❌ Keep-alive ping timeout (${duration}ms)`);
      });

      req.setTimeout(10000); // Set timeout
      req.end();
    } catch (error: any) {
      console.error('❌ Keep-alive ping error:', error.message);
    }
  };

  // Schedule cron job
  const task = cron.schedule(cronExpression, pingHealthEndpoint);

  // Send first ping immediately (after 30 seconds to let server fully start)
  setTimeout(() => {
    console.log('🔄 Sending initial keep-alive ping...');
    pingHealthEndpoint();
  }, 30000);

  console.log('✅ Keep-alive service started');

  return task;
};

/**
 * Stop keep-alive service
 */
export const stopKeepAlive = (task: ScheduledTask | undefined): void => {
  if (task) {
    task.stop();
    console.log('🛑 Keep-alive service stopped');
  }
};
