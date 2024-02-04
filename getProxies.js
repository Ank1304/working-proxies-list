const axios = require('axios');
const { Pool } = require('pg');
const express = require('express');

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432, // Default PostgreSQL port
});

// Express app
const app = express();

// Function to fetch and store proxies
const fetchAndStoreProxies = async () => {
  try {
    // Fetch proxy servers from the API
    const response = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all');
    const proxyServers = response.data.split('\n'); // Split by newline to get individual IP:port pairs

    // Clear previous entries
    await pool.query('DELETE FROM proxy_servers');

    // Test and insert new proxy servers
    const insertQuery = 'INSERT INTO proxy_servers (proxy_address) VALUES ($1)';
    for (const proxy of proxyServers) {
      const [ip, port] = proxy.split(':');
      const isProxyWorking = await testProxy(ip, port);
      if (isProxyWorking) {
        await pool.query(insertQuery, [proxy]);
      }
    }

    console.log('Proxy servers updated successfully.');
  } catch (error) {
    console.error('Error updating proxy servers:', error);
  }
};

// Function to test a proxy
const testProxy = async (ip, port) => {
  try {
    const response = await axios.get('https://example.com', {
      proxy: {
        host: ip,
        port: port,
      },
      timeout: 5000, // Adjust timeout as needed
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Endpoint to trigger proxy update
app.get('/update-proxies', async (req, res) => {
  try {
    await fetchAndStoreProxies();
    res.status(200).send('Proxy servers updated successfully!');
  } catch (error) {
    console.error('Error updating proxy servers:', error);
    res.status(500).send('Error updating proxy servers.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
