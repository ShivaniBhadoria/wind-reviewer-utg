#!/usr/bin/env node

/**
 * Helper script to run the PR review tool from its new location
 */

const path = require('path');
const { spawn } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: node run-pr-review.js <owner> <repo> <pr-number>');
    console.log('Example: node run-pr-review.js octocat hello-world 123');
    process.exit(1);
}

const [owner, repo, prNumber] = args;

// Path to the review-pr.js file
const reviewToolPath = path.join(__dirname, 'backend', 'pr-review', 'review-pr.js');

console.log(`Running PR review for ${owner}/${repo}#${prNumber}...`);

// Spawn the PR review process
const reviewProcess = spawn('node', [reviewToolPath, owner, repo, prNumber], {
    stdio: 'inherit'
});

reviewProcess.on('close', (code) => {
    console.log(`PR review process exited with code ${code}`);
});
