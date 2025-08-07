# Wind Reviewer

This repository contains tools for automatically reviewing GitHub pull requests and analyzing repository statistics using the Model Context Protocol (MCP) server integration with GitHub.

## Table of Contents

- [Folder Structure](#folder-structure)
- [Setup Guide](#setup-guide)
- [Using the PR Review Tool](#using-the-pr-review-tool)
- [PR Review Format](#pr-review-format)
- [Using the Repository PR Analytics](#using-the-repository-pr-analytics)
- [Deployment Options](#deployment-options)
- [Customizing Reviews](#customizing-reviews)
- [Troubleshooting](#troubleshooting)

## Folder Structure

The repository is organized into the following folders:

* `backend/pr-review/`: Contains tools for automating PR reviews and template compliance checks
  * `direct-pr-review.js`: Main PR review tool with line-specific comments and code suggestions
  * `pr-review-tool.js`: Core functions for PR review operations
  * `mcp-pr-review.js`: MCP-specific implementation for PR reviews
* `backend/stats/`: Contains tools for generating repository statistics
* `frontend/`: Contains the UI for the repository statistics dashboard
* `utils/config/`: Contains configuration and token-related utilities
  * `check-token-permissions.js`: Utility to verify GitHub token permissions

## Setup Guide

### Prerequisites

1. Node.js (v14 or higher)
2. GitHub Personal Access Token with appropriate permissions
3. Access to the GitHub MCP server

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/github-mcp.git
   cd github-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure GitHub token:
   ```bash
   # Create a .env file with your GitHub token
   echo "GITHUB_TOKEN=your_token_here" > .env
   ```

4. Verify token permissions:
   ```bash
   node utils/config/check-token-permissions.js
   ```

5. Start the MCP server (required for PR reviews):
   ```bash
   # This step depends on your specific MCP server setup
   # Typically, the MCP server should be running before using the PR review tools
   ```

## Using the PR Review Tool

The PR review tool uses MCP integration with GitHub to automatically review pull requests and provide structured feedback with actionable code suggestions.

### Basic Usage

```bash
# Run the PR review tool
node run-pr-review.js <owner> <repo> <pr-number>

# Example
node run-pr-review.js ShivaniBhadoria personal-finance-simulator 7
```

### Review Process Flow

1. **Fetch PR Details**: The tool retrieves the PR information, including title, description, and changed files.

2. **Analyze Code Changes**: It examines the diff for each file to identify potential issues.

3. **Generate Comments**: For each issue found, it creates a structured comment with:
   - Clear issue description
   - Context explaining why it matters
   - Suggestion with reasoning
   - GitHub suggestion blocks with directly committable code
   - Next steps for further improvements

4. **Submit Review**: Finally, it submits a comprehensive review with a summary of findings and recommendations.

## PR Review Format

The PR review tool generates comments following a clean, consistent template:

### Inline Comments

Each inline comment follows this structure:

```markdown
**Issue:** Clear statement of the code improvement opportunity

**Context:** Concise explanation of why this matters

**Suggestion:** Focused on the "why" not just the "what"

```suggestion
Actual code that can be committed with the suggestion button
```

*You can commit this suggestion directly by clicking the commit button above.*

**Next Steps:**
- Actionable and specific follow-up items
```

### Summary Review

The overall PR review includes:

1. Acknowledgment of the PR's value
2. Summary of key findings
3. Recommendations with references to inline comments
4. Suggested next steps for future enhancements

## Using the Repository PR Analytics

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

## Deployment Options

### Option 1: GitHub Actions (Repository-specific)

The `.github/workflows/pr-review.yml` file sets up an automated PR review workflow that runs whenever a pull request is opened or updated in the repository.

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

## Customizing Reviews

To customize the review criteria, edit the `direct-pr-review.js` file to add your own checks. Some ideas:

- Check for test coverage
- Enforce coding standards
- Look for security issues
- Ensure documentation is updated

### Adding Custom Review Rules

Custom review rules can be added in the `addDirectPRComments` function in `direct-pr-review.js`. Each rule should:

1. Analyze specific aspects of the code
2. Generate comments using the `formatComment` function
3. Follow the established template format

## Troubleshooting

### Common Issues

1. **MCP Server Connection Issues**
   - Ensure the MCP server is running
   - Verify that global.mcp0_* functions are available
   - Check network connectivity to the MCP server

2. **GitHub API Rate Limiting**
   - Use a token with appropriate permissions
   - Implement request throttling for large repositories
   - Consider using a GitHub App for higher rate limits

3. **Review Comments Not Appearing**
   - Verify token has write access to pull requests
   - Check for errors in the console output
   - Ensure the PR number and repository information are correct
