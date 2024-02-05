const axios = require('axios');
const { Pool } = require('pg');
const express = require('express');

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
(async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS proxy_servers (
        id SERIAL PRIMARY KEY,
        proxy_address TEXT
      )
    `;
    await pool.query(createTableQuery);
    console.log('Proxy servers table created or exists.');
  } catch (error) {
    console.error('Error creating proxy servers table:', error);
  }
})();

// Express app
const app = express();

// Function to test a proxy
const testProxy = async (proxy) => {
  try {
    const response = await axios.get('https://example.com', {
      proxy: {
        host: proxy.split(':')[0],
        port: parseInt(proxy.split(':')[1]),
      },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.log(error, 'error');
    return false;
  }
};

// Function to fetch and store proxies
const fetchAndStoreProxies = async () => {
  try {
    const response = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all');
    const proxyServers = response.data.split('\n').map(proxy => proxy.trim());

    const validProxies = [];
    for (const proxy of proxyServers) {
      console.log(await testProxy(proxy), 'prd')
      if (await testProxy(proxy)) {
        validProxies.push(proxy);
        if (validProxies.length === 20) {
          break;
        }
      }
    }

    const deleteResult = await pool.query('DELETE FROM proxy_servers');
    console.log('Deleted old entries:', deleteResult.rowCount);

      const insertResult = await pool.query('INSERT INTO proxy_servers (proxy_addresses) VALUES ($1)', [validProxies]);
      console.log('Inserted new entry:', insertResult.rowCount);
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
