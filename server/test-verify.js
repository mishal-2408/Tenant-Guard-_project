import app from './src/app.js';

const PORT = 5099;

const runVerification = async () => {
  console.log('[Verification] Starting in-memory Express listener on test port', PORT);
  const server = app.listen(PORT, async () => {
    try {
      console.log('[Verification] Testing GET /api/health...');
      const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
      const healthData = await healthRes.json();
      
      console.log('[Verification] Health Check HTTP Status:', healthRes.status);
      console.log('[Verification] Health Check Response Body:', JSON.stringify(healthData, null, 2));

      if (healthRes.status !== 200 || healthData.data?.status !== 'healthy') {
        throw new Error('Health check verification failed');
      }

      console.log('[Verification] Testing GET /api/unregistered-route (404 Not Found)...');
      const notFoundRes = await fetch(`http://localhost:${PORT}/api/unregistered-route`);
      const notFoundData = await notFoundRes.json();

      console.log('[Verification] 404 Route HTTP Status:', notFoundRes.status);
      console.log('[Verification] 404 Route Response Body:', JSON.stringify(notFoundData, null, 2));

      if (notFoundRes.status !== 404 || notFoundData.error?.code !== 'ROUTE_NOT_FOUND') {
        throw new Error('404 Not Found verification failed');
      }

      console.log('[Verification] Testing Root GET / ...');
      const rootRes = await fetch(`http://localhost:${PORT}/`);
      const rootData = await rootRes.json();
      console.log('[Verification] Root HTTP Status:', rootRes.status);

      console.log('\n>>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
    } catch (err) {
      console.error('[Verification Failed]:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('[Verification] Test server closed cleanly.');
      });
    }
  });
};

runVerification();
