/**
 * Repository Statistics Server
 * This script serves the repo-stats UI and provides API endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

// Import the repo-stats module
const { getRepoStats } = require('./repo-stats');

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle API requests
    if (pathname === '/api/repo-stats') {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
        }
        
        if (req.method === 'POST') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { owner, repo } = JSON.parse(body);
                    
                    if (!owner || !repo) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Missing owner or repo parameter' }));
                        return;
                    }
                    
                    console.log(`Generating stats for ${owner}/${repo}...`);
                    
                    try {
                        // Run the repo-stats.js script as a child process
                        const command = `node ${path.join(__dirname, 'repo-stats.js')} ${owner} ${repo}`;
                        
                        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error executing repo-stats.js: ${error.message}`);
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: `Failed to generate repository statistics: ${error.message}` }));
                                return;
                            }
                            
                            if (stderr) {
                                console.error(`stderr: ${stderr}`);
                            }
                            
                            // Parse the output as JSON
                            try {
                                // Extract JSON from the output (it might contain other log messages)
                                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                                const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
                                const stats = JSON.parse(jsonStr);
                                
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(stats));
                            } catch (parseError) {
                                console.error(`Error parsing JSON output: ${parseError.message}`);
                                console.error(`Output was: ${stdout}`);
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: `Failed to parse repository statistics: ${parseError.message}` }));
                            }
                        });
                    } catch (statsError) {
                        console.error(`Error generating stats: ${statsError.message}`);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: `Failed to generate repository statistics: ${statsError.message}` }));
                    }
                } catch (parseError) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: `Invalid JSON: ${parseError.message}` }));
                }
            });
        } else {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }
    // Serve static files
    else {
        let filePath = pathname === '/' ? '/index.html' : pathname;
        // Adjust path to point to frontend directory
        filePath = path.join(__dirname, '../../frontend', pathname === '/' ? 'index.html' : pathname.substring(1));
        
        // Check if file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/plain');
                res.end('File not found');
                return;
            }
            
            // Determine content type
            const extname = path.extname(filePath);
            let contentType = 'text/html';
            
            switch (extname) {
                case '.js':
                    contentType = 'text/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.json':
                    contentType = 'application/json';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.jpg':
                    contentType = 'image/jpg';
                    break;
            }
            
            // Read and serve the file
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Internal server error');
                    return;
                }
                
                res.statusCode = 200;
                res.setHeader('Content-Type', contentType);
                res.end(data);
            });
        });
    }
});

// Start the server
const PORT = process.env.PORT || 3003; // Using a different port than the main server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Access the repository statistics dashboard at http://localhost:${PORT}/`);
});
