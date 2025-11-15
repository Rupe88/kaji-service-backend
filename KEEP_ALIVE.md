# Keep-Alive Service Configuration

## Overview

The keep-alive service prevents the server from freezing on free-tier hosting platforms like Render, Railway, Vercel, etc. These platforms spin down inactive applications after a period of inactivity (typically 15 minutes).

## How It Works

The service uses `node-cron` to automatically ping the `/health` endpoint every 14 minutes, keeping the server active and preventing it from going to sleep.

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Keep-Alive Configuration (Optional)
# Enable keep-alive in non-production environments (default: only in production)
ENABLE_KEEP_ALIVE=true

# Custom keep-alive URL (default: http://localhost:PORT/health)
KEEP_ALIVE_URL=https://your-app.onrender.com/health

# Keep-alive interval in minutes (default: 14 minutes)
# Render spins down after 15 minutes, so 14 is safe
KEEP_ALIVE_INTERVAL=14
```

### Default Behavior

- **Production**: Keep-alive is **enabled by default**
- **Development/Test**: Keep-alive is **disabled by default**
- **Interval**: 14 minutes (safe for Render's 15-minute threshold)
- **URL**: Automatically uses `http://localhost:PORT/health`

## Platform-Specific Setup

### Render

1. **Set Environment Variables** in Render dashboard:
   ```env
   NODE_ENV=production
   KEEP_ALIVE_URL=https://your-app.onrender.com/health
   KEEP_ALIVE_INTERVAL=14
   ```

2. **No additional setup needed** - keep-alive starts automatically in production

### Railway

1. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   KEEP_ALIVE_URL=https://your-app.railway.app/health
   KEEP_ALIVE_INTERVAL=14
   ```

### Vercel

Vercel doesn't spin down serverless functions, but if using Vercel Pro with always-on:
```env
NODE_ENV=production
KEEP_ALIVE_URL=https://your-app.vercel.app/health
```

### Heroku

Heroku free tier is discontinued, but for paid tiers:
```env
NODE_ENV=production
KEEP_ALIVE_URL=https://your-app.herokuapp.com/health
```

## Testing

### Enable in Development

To test keep-alive in development:

```env
ENABLE_KEEP_ALIVE=true
KEEP_ALIVE_URL=http://localhost:5000/health
KEEP_ALIVE_INTERVAL=1  # Test with 1 minute interval
```

### Verify It's Working

1. **Check logs** - You should see:
   ```
   🔄 Keep-alive service starting...
      URL: http://localhost:5000/health
      Interval: Every 14 minutes
      Cron: */14 * * * *
   ✅ Keep-alive service started
   ```

2. **Wait for ping** - After the interval, you'll see:
   ```
   ✅ Keep-alive ping successful (45ms) - Server is active
   ```

3. **Check health endpoint** - The ping hits `/health`, so you'll see request logs:
   ```
   [timestamp] GET /health - 200 - 45ms
   ```

## Troubleshooting

### Keep-Alive Not Starting

**Issue**: No keep-alive logs on startup

**Solution**: 
- Check `NODE_ENV` is set to `production`
- Or set `ENABLE_KEEP_ALIVE=true`

### Ping Failing

**Issue**: `❌ Keep-alive ping failed`

**Possible Causes**:
1. **Wrong URL**: Check `KEEP_ALIVE_URL` matches your actual deployment URL
2. **Server not ready**: First ping happens after 30 seconds - this is normal
3. **Network issues**: Check if the URL is accessible

**Solution**:
- Verify `KEEP_ALIVE_URL` is correct
- Check server logs for errors
- Test the health endpoint manually: `curl https://your-app.onrender.com/health`

### Server Still Freezing

**Issue**: Server still goes to sleep despite keep-alive

**Possible Causes**:
1. **Interval too long**: Render spins down after 15 minutes
2. **URL incorrect**: Ping might be failing silently
3. **Cron not running**: Check if cron is supported on your platform

**Solution**:
- Reduce `KEEP_ALIVE_INTERVAL` to 10-12 minutes
- Verify ping logs show successful pings
- Check platform documentation for cron support

## Best Practices

1. **Use 14-minute interval** for Render (15-minute threshold)
2. **Set correct URL** in production (use your actual deployment URL)
3. **Monitor logs** to ensure pings are successful
4. **Test locally** before deploying

## Cost Considerations

- **Free tier**: Keep-alive helps prevent spin-down delays
- **Paid tier**: Usually not needed (always-on servers)
- **Resource usage**: Minimal - just a simple HTTP request every 14 minutes

## Alternative Solutions

If cron doesn't work on your platform, consider:

1. **External Cron Service**: Use services like cron-job.org to ping your health endpoint
2. **Uptime Monitoring**: Services like UptimeRobot can ping your endpoint
3. **Platform-specific**: Some platforms have built-in keep-alive options

## Summary

✅ **Automatic**: Starts automatically in production  
✅ **Configurable**: Customize URL and interval via env vars  
✅ **Safe**: 14-minute interval prevents Render spin-down  
✅ **Logged**: All pings are logged for monitoring  
✅ **Graceful**: Stops cleanly on server shutdown  

The keep-alive service ensures your server stays active on free-tier hosting platforms! 🚀

