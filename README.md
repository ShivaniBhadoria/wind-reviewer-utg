# GitHub MCP Tools

This repository contains tools for automatically reviewing GitHub pull requests and analyzing repository statistics using the Model Context Protocol (MCP) server integration with GitHub.

## Folder Structure

The repository is organized into the following folders:

* `backend/pr-review/`: Contains tools for automating PR reviews and template compliance checks
* `backend/stats/`: Contains tools for generating repository statistics
* `frontend/`: Contains the UI for the repository statistics dashboard
* `utils/config/`: Contains configuration and token-related utilities

## Helper Scripts

* `server.js`: Main server that serves the frontend files
* `start-stats-server.js`: Script to start the repository statistics server
* `run-pr-review.js`: Script to run the PR review tool

## Using the PR Review Tool

The PR review tool uses MCP integration with GitHub to automatically review pull requests and check for template compliance. It can add comments to PRs when issues are found.

```bash
# Run the PR review tool
node run-pr-review.js <owner> <repo> <pr-number>

# Example
node run-pr-review.js octocat hello-world 123
```

## Using the Repository Statistics Dashboard

1. Start the main server:
   ```bash
   node server.js
   ```

2. Start the stats server (in a separate terminal):
   ```bash
   node start-stats-server.js
   ```

3. Open http://localhost:3001 in your browser to access the dashboard

4. Enter a GitHub repository owner and name to generate statistics

## Setup Options

### Option 1: GitHub Actions (Repository-specific)

The `.github/workflows/pr-review.yml` file sets up an automated PR review workflow that runs whenever a pull request is opened or updated in the repository. This approach is simple to set up and requires no external services.

1. Add the workflow file to your repository
2. The workflow will automatically run on new PRs
3. No additional configuration needed - uses the built-in `GITHUB_TOKEN`

### Option 2: GitHub App (Works across all repositories)

For a more powerful solution that works across all your repositories, you can create a GitHub App:

1. Go to your GitHub Settings > Developer settings > GitHub Apps > New GitHub App
2. Configure the app with these settings:
   - Name: PR Review Bot
   - Homepage URL: Your GitHub profile URL
   - Webhook URL: (Leave blank for now if you don't have a server)
   - Permissions:
     - Pull requests: Read & Write
     - Contents: Read
   - Subscribe to events:
     - Pull request
     - Pull request review

3. After creating the app, you'll need to:
   - Generate a private key
   - Install the app on your repositories
   - Set up a server to handle webhook events (or use a serverless function)

4. Deploy the bot code to your server or serverless function

## How It Works

The PR review bot analyzes pull requests for:
- Large file changes
- Potentially complex code
- Missing documentation
- Other customizable checks

It then adds comments directly to the PR with suggestions for improvement.

## Customizing Reviews

To customize the review criteria, edit the review script to add your own checks. Some ideas:
- Check for test coverage
- Enforce coding standards
- Look for security issues
- Ensure documentation is updated
