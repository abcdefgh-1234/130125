const express = require('express');
const cors = require('cors');
const db = require('./db'); // MySQL connection

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json()); // Parse JSON bodies



// Route to handle client data
app.post('/api/client-info', (req, res) => {
  const { systemData, networkInterfaces } = req.body;

  // Check if the required data exists
  if (!systemData || !networkInterfaces || networkInterfaces.length === 0) {
      return res.status(400).json({ error: 'Missing system or network data' });
  }

  // Sanitize system data
  const sanitizedSystemData = {
      hostname: systemData.hostname || null,
  };

  // Loop through network interfaces and insert each one
  const values = networkInterfaces.map((network) => {
      return [
          sanitizedSystemData.hostname,
          network.ipAddress || null,
          network.macAddress || null,
      ];
  });


  const checkDuplicateQuery = `
  SELECT hostname, ip_address, mac_address
  FROM client
  WHERE hostname = ? AND ip_address = ? AND mac_address = ?`


  const uniqueValues = [];
  const checkDuplicates = values.map((value) => {
      return new Promise((resolve, reject) => {
          db.query(checkDuplicateQuery, value, (err, results) => {
              if (err) return reject(err);
              if (results.length === 0) {
                  // No duplicate found, add to uniqueValues
                  uniqueValues.push(value);
              }
              resolve();
          });
      });
  });

  // Once all duplicates are checked, insert unique values
  Promise.all(checkDuplicates)
      .then(() => {
          if (uniqueValues.length === 0) {
              return res.status(200).json({ message: 'No new data to insert, duplicates found' });
          }

          // Insert only unique values
          const insertQuery = `
              INSERT INTO client (hostname, ip_address, mac_address) VALUES ?
          `;
          db.query(insertQuery, [uniqueValues], (err, result) => {
              if (err) {
                  console.error('Error inserting into client table:', err);
                  return res.status(500).json({ error: 'Failed to insert data into client table' });
              }
              const clientId = result.insertId;
              res.status(200).json({ client_id: clientId, message: 'Client info inserted successfully' });
          });
      })
      .catch((err) => {
          console.error('Error checking for duplicates:', err);
          res.status(500).json({ error: 'Failed to check for duplicates' });
      });




//   const query = `INSERT INTO client (hostname, ip_address, mac_address) VALUES ?`;

//   db.query(query, [values], (err, result) => {
//       if (err) {
//           console.error('Error inserting in client table:', err);
//           return res.status(500).json({ error: 'Failed to insert data into client table' });
//       }
//       const clientId = result.insertId;
//       res.status(200).json({ client_id: clientId }); // Send client_id back to renderer
//   });
});

// Endpoint to insert system info
app.post('/api/system-info', (req, res) => {
  const { clientId, systemData } = req.body;

  if (!clientId || !systemData) {
      return res.status(400).json({ error: 'Missing client ID or system data' });
  }

  const values = [
      clientId,
      systemData.hostname || null,
      systemData.totalMemory || null,
      systemData.freeMemory || null,
      systemData.release || null,
      systemData.type || null,
      systemData.arch || null,
  ];

  const query = `INSERT INTO sys_info (client_id, hostname, tmemory, fmemory, sys_release, sys_type, sys_arch) VALUES (?)`;

  db.query(query, [values], (err, result) => {
      if (err) {
          console.error('Error inserting in sys_info table:', err);
          return res.status(500).json({ error: 'Failed to insert data into sys_info table' });
      }
      res.status(200).json({ message: 'System info inserted successfully' });
  });
});




// To handle network data
app.post('/api/network-info', (req, res) => {
  const { clientId, networkData } = req.body;
  if (!clientId || !networkData || networkData.length === 0) {
      return res.status(400).json({ error: 'Missing client ID or network data' });
  }
  const values = networkData.map((network) => [
      clientId,
      network.interfaceName || null,
      network.ipAddress || null,
      network.macAddress || null,
  ]);
  const query = `INSERT INTO network_info (client_id, interface, ip_address, mac_address) VALUES ?`;
  db.query(query, [values], (err, result) => {
      if (err) {
          console.error('Error inserting in network_info table:', err);
          return res.status(500).json({ error: 'Failed to insert data into network_info table' });
      }
      res.status(200).json({ message: 'Network info inserted successfully' });
  });
});

// To post the patch updates
app.post('/api/patch-info', (req, res) => {
    const { clientId, patchData } = req.body;

    const query = `INSERT INTO patch_updates (client_id, hotfix_id, description, installed_on, installed_by) VALUES ?`;
    const values = patchData.map(patch => [
        clientId,
        patch.hotFixID || null,
        patch.description || null,
        patch.installedOn || null,
        patch.installedBy || null,
    ]);

    db.query(query, [values], err => {
        if (err) {
            console.error('Error inserting in patch_info table:', err);
            return res.status(500).json({ error: 'Failed to insert data into network_info table' });
        }
        res.status(200).json({ message: 'Patch info inserted successfully' });
    });
});



// To post Installed software data

app.post('/api/software-info', (req, res) => {
    const { clientId, softwareData } = req.body;

    if (!clientId || !Array.isArray(softwareData)) {
        return res.status(400).send('Invalid data');
    }

    softwareData.forEach(software => {
        const { Name, InstallLocation, InstallDate, Version } = software;

        const query = `
            INSERT INTO active_process (client_id, name, install_loc, install_date, version)
            VALUES (?, ?, ?, ?, ?)
        `;

        connection.execute(query, [clientId, Name, InstallLocation, InstallDate, Version], (err, results) => {
            if (err) {
                console.error('Error inserting software data:', err);
            } else {
                console.log('Software data inserted successfully');
            }
        });
    });

    res.status(200).send('Software data inserted');
});


// //Route to handle the client data
// app.post('/api/client-info', (req, res) => {
    
// });


// Route to handle network data
// app.post('/api/network-info', (req, res) => {
//     const networkData = req.body.networkData;
    
//     // Insert network data into MySQL (network table)
//     const query = 'INSERT INTO network (interface, ip_address, mac_address) VALUES (?, ?, ?)';
//     const promises = networkData.map(interface => {
//         return db.execute(query, [interface.interfaceName, interface.ipAddress, interface.macAddress,]);
//     });

//     Promise.all(promises)
//         .then(() => res.send('Network data inserted successfully!'))
//         .catch(err => res.status(500).send(err));
// });



//to handle unique data
app.post('/api/unique_info', (req, res) => {
    // Get the data from the request body
    const ud = req.body;
  
    // SQL query to insert the data into the table
    const query = `
      INSERT INTO unique_info (CPUid, MBid, MACAddr, hash)
      VALUES (?, ?, ?, ?)
    `;
  
    // Execute the query
    connection.execute(query, [ud.CPUid, ud.MBid, ud.MACAddr, ud.Hash], (err, results) => {
      if (err) {
        console.error('Error inserting data into the database:', err);
        res.status(500).json({ message: 'Error inserting data into the database' });
      } else {
        console.log('Data inserted successfully:', results);
        res.status(200).json({ message: 'Data inserted successfully', results });
      }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
