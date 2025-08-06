// Script to configure GitHub MCP server token
// This script will set up the token in a secure way

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Determine the config directory
const homeDir = process.env.HOME || process.env.USERPROFILE;
const configDir = path.join(homeDir, '.config', 'github-mcp');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log(`Created config directory: ${configDir}`);
}

const configFile = path.join(configDir, 'config.json');

// Ask for token securely
console.log('Please enter your GitHub token:');
rl.question('Token: ', (token) => {
  // Create or update config file
  const config = {
    github: {
      token: token.trim()
    }
  };

  // Write config to file
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(`Token configured successfully in ${configFile}`);
  
  // Set environment variable for current session
  process.env.GITHUB_TOKEN = token.trim();
  console.log('GITHUB_TOKEN environment variable set for current session');
  
  // Create a .env file for future use
  const envFile = path.join(process.cwd(), '.env');
  fs.writeFileSync(envFile, `GITHUB_TOKEN=${token.trim()}\n`);
  console.log(`.env file created at ${envFile}`);
  
  // Add .env to .gitignore if it doesn't already exist
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  if (!gitignoreContent.includes('.env')) {
    fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n');
    console.log('Added .env to .gitignore');
  }
  
  rl.close();
});
