// Enhanced HTTP server to serve our PR review tool frontend
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL to get the pathname
  let pathname = req.url;
  
  // Default to index.html for root path
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Construct the file path
  const filePath = path.join(__dirname, 'frontend', pathname);
  
  // Get the file extension
  const extname = path.extname(filePath);
  
  // Set the content type based on the file extension
  const contentType = MIME_TYPES[extname] || 'text/plain';
  
  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end(`File ${pathname} not found`);
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
      return;
    }
    
    // Success - return the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Open this URL in the Windsurf IDE browser preview to test the GitHub PR Review Tool');
});
