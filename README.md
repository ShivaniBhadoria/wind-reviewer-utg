# WindLens AI

A powerful GitHub repository analysis and PR review tool leveraging the Model Context Protocol (MCP) server for direct GitHub API integration.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Setup Guide](#setup-guide)
- [Using the PR Review Tool](#using-the-pr-review-tool)
- [PR Review Format](#pr-review-format)
- [Using the Repository Analytics](#using-the-repository-analytics)
- [Customizing Reviews](#customizing-reviews)
- [Troubleshooting](#troubleshooting)

## Overview

WindLens AI provides comprehensive GitHub repository analysis and automated PR reviews through direct integration with GitHub's API via the Model Context Protocol (MCP) server. The tool offers:

- Automated PR reviews with structured, actionable feedback
- Repository statistics and analytics dashboard
- Template compliance checking for PRs
- Code quality insights and improvement suggestions

## Folder Structure

The repository is organized into the following structure:

* `backend/`: Server-side code
  * `pr-review/`: PR review automation tools
    * `direct-pr-review.js`: Main PR review tool with line-specific comments
    * `pr-review-tool.js`: Core PR review functions
  * `stats/`: Repository statistics tools
    * `github-stats.js`: GitHub API integration for statistics
    * `pr-stats.js`: Pull request analytics
    * `repo-stats.js`: Repository metrics calculation
    * `repo-stats-server.js`: Server for statistics API
* `frontend/`: Client-side code
  * `css/`: Styling for the web interface
  * `github-api.js`: Frontend GitHub API integration
  * `index.html`: Main dashboard page
  * `repo-stats-ui.js`: UI components for repository statistics
* `utils/`: Utility functions and configuration
* `.github/`: GitHub-specific files including PR templates

## Setup Guide

### Prerequisites

1. Node.js (v14 or higher)
2. Access to the GitHub MCP server

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/windlens-ai.git
   cd windlens-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the application:
   ```bash
   # Create a configuration file if needed
   cp config.example.js config.js
   # Edit the config.js file with your settings
   ```

4. Start the application:
   ```bash
   # Start the main server
   node server.js
   ```

## Using the PR Review Tool

WindLens AI uses the GitHub MCP server to automatically review pull requests and provide structured feedback with actionable code suggestions.

### Basic Usage

```bash
# Run the PR review tool
node run-pr-review.js <owner> <repo> <pr-number>

# Example
node run-pr-review.js ShivaniBhadoria windlens-ai 7
```

### Review Process Flow

1. **Fetch PR Details**: WindLens AI retrieves the PR information, including title, description, and changed files directly through the MCP server.

2. **Analyze Code Changes**: It examines the diff for each file to identify potential issues, code quality concerns, and template compliance.

3. **Generate Comments**: For each issue found, it creates a structured comment with:
   - Clear issue description
   - Context explaining why this matters
   - Suggestion focused on the "why" not just the "what"
   - GitHub suggestion blocks with directly committable code
   - Next steps for further improvements

4. **Submit Review**: Finally, it submits a comprehensive review with a summary of findings and recommendations.

## PR Review Format

WindLens AI generates PR reviews following a clean, consistent template that prioritizes clarity and actionability:

### Inline Comments

Each inline comment follows this structured format:

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

This format ensures reviews are consistent, helpful, and focused on improving code quality while providing directly actionable suggestions.

## Using the Repository Analytics

WindLens AI provides comprehensive repository analytics through its dashboard interface:

1. Start the main server:
   ```bash
   node server.js
   ```

2. Start the stats server (in a separate terminal):
   ```bash
   node backend/stats/repo-stats-server.js
   ```

3. Open http://localhost:3001 in your browser to access the dashboard

4. Enter a GitHub repository owner and name to generate statistics

### Analytics Features

The WindLens AI dashboard provides several key insights:

* **Pull Request Metrics**: Review time, acceptance rate, and common feedback areas
* **Code Quality Trends**: Identify patterns in code quality over time
* **Contributor Analysis**: Understand team contribution patterns and expertise areas
* **Defect Area Identification**: Highlight parts of the codebase that frequently need attention
* **PR Guidelines Compliance**: Track adherence to PR templates and guidelines

All analytics are generated through direct GitHub API integration via the MCP server, eliminating the need for separate API tokens or complex authentication workflows.

## Customizing Reviews

WindLens AI is designed to be highly customizable. You can tailor the review criteria to match your team's specific needs:

### Adding Custom Review Rules

To customize the review criteria, edit the `direct-pr-review.js` file in the `backend/pr-review` directory. You can add checks for:

- Test coverage requirements
- Coding standards compliance
- Security vulnerability detection
- Documentation completeness
- Performance considerations
- Accessibility standards

Custom review rules can be added in the `addDirectPRComments` function. Each rule should:

1. Analyze specific aspects of the code
2. Generate comments using the `formatComment` function
3. Follow the established template format for consistency

## Troubleshooting

### Common Issues

1. **MCP Server Connection Issues**
   - Ensure the GitHub MCP server is properly configured and running
   - Check that your application has the necessary permissions

2. **Dashboard Loading Problems**
   - Verify both the main server and stats server are running
   - Check browser console for any JavaScript errors
   - Ensure your network can access the GitHub API through the MCP server

3. **PR Review Tool Errors**
   - Confirm you have the correct repository owner and name
   - Verify the PR number exists and is accessible
   - Check the console output for detailed error messages

### Getting Help

If you encounter issues not covered here, please:

1. Check the logs for detailed error messages
2. Review the MCP server documentation for GitHub API integration
3. Open an issue in the WindLens AI repository with detailed steps to reproduce
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
