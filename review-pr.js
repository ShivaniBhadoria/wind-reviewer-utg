#!/usr/bin/env node

// Import the review function from the tool
const { reviewPullRequest } = require('./pr-review-tool');

// Initialize MCP tools if not already available
if (!global.mcp) {
    console.error('Error: MCP server tools are not available. Make sure the GitHub MCP server is running.');
    process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: node review-pr.js <owner> <repo> <pr-number>');
    console.log('Example: node review-pr.js octocat hello-world 123');
    process.exit(1);
}

const [owner, repo, prNumber] = args;

// Run the PR review
reviewPullRequest(owner, repo, parseInt(prNumber))
    .then(() => console.log('PR review completed successfully!'))
    .catch(error => {
        console.error('PR review failed:', error);
        process.exit(1);
    });
