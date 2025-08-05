# GitHub PR Review Bot

This repository contains tools for automatically reviewing GitHub pull requests.

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
