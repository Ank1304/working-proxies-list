const axios = require('axios');
const { Pool } = require('pg');
const express = require('express');
const ProxyChecker = require('proxy-checker-advanced');

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'anki1304',
  host: 'dpg-cmrhrhug1b2c73dbf74g-a.oregon-postgres.render.com',
  database: 'tradevibes',
  password: 'NJai9wwNo6x3pWJK3cVrtFhdMlYJ8VVM',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  }
});

// Create proxy_servers table if it does not exist
pool.query(`
  CREATE TABLE IF NOT EXISTS proxy_servers (
    id SERIAL PRIMARY KEY,
    proxy_address TEXT
  )
`);

// Express app
const app = express();

// Function to fetch and store proxies
const fetchAndStoreProxies = async () => {
  try {
    // Fetch proxy servers from the API
    const response = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all');
    const proxyServers = response.data.split('\n'); // Split by newline to get individual IP:port pairs

    // Test and prepare proxy servers
    const proxyAddresses = proxyServers.map(proxy => proxy.trim()); // Remove leading/trailing whitespace and carriage return characters
    console.log(proxyAddresses, 'address')
    const proxycheck = new ProxyChecker(proxyAddresses);
    console.log(proxycheck, "proxycheck");
    // Check all proxies
    const result = await proxycheck.checkAllProxies();
    const validProxies = result.filter(proxy => proxy.status === 'success').map(proxy => `${proxy.protocol}://${proxy.host}:${proxy.port}`);

    console.log('Valid proxy addresses:', validProxies); // Log the valid proxy addresses

    // Clear previous entries
    const deleteResult = await pool.query('DELETE FROM proxy_servers');
    console.log('Deleted old entries:', deleteResult.rowCount); // Log the number of deleted entries

    // Insert valid proxy addresses into the table
    for (const proxy of validProxies) {
      const insertResult = await pool.query('INSERT INTO proxy_servers (proxy_address) VALUES ($1)', [proxy]);
      console.log('Inserted new entry:', insertResult.rowCount); // Log the number of inserted entries
    }

    console.log('Proxy servers updated successfully.');
  } catch (error) {
    console.error('Error updating proxy servers:', error);
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
