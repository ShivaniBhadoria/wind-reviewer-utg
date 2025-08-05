// Automated PR Review Script
const { Octokit } = require('@octokit/rest');

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Get environment variables
const prNumber = parseInt(process.env.PR_NUMBER);
const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;

async function reviewPullRequest() {
  try {
    console.log(`Starting review for PR #${prNumber} in ${owner}/${repo}`);
    
    // 1. Get PR details
    console.log('Fetching PR details...');
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    
    // 2. Get changed files
    console.log('Fetching changed files...');
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });
    
    if (!files || files.length === 0) {
      console.log('No files changed in this PR');
      return;
    }
    
    // 3. Create a pending review
    console.log('Creating pending review...');
    const { data: review } = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber
    });
    
    // 4. Analyze files and add comments
    console.log('Analyzing changes...');
    const comments = [];
    
    for (const file of files) {
      // Example: Check for large files
      if (file.additions + file.deletions > 300) {
        comments.push({
          path: file.filename,
          body: "⚠️ This file has many changes (" + (file.additions + file.deletions) + " lines). Consider breaking it into smaller, more focused files for better maintainability.",
          line: file.patch ? file.patch.split('\n').length : 1,
          side: "RIGHT"
        });
      }
      
      // Check for large functions (simplified example)
      if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx') || 
          file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
        // In a real implementation, you would parse the file and analyze function sizes
        if (file.patch && file.patch.length > 1000) {
          comments.push({
            path: file.filename,
            body: "🔍 This file has significant changes. Please ensure all new functions are properly documented and tested.",
            line: file.patch ? file.patch.split('\n').length : 1,
            side: "RIGHT"
          });
        }
      }
    }
    
    // 5. Submit the review with comments
    if (comments.length > 0) {
      console.log(`Submitting review with ${comments.length} comments...`);
      await octokit.pulls.submitReview({
        owner,
        repo,
        pull_number: prNumber,
        review_id: review.id,
        event: "COMMENT",
        body: `I've reviewed your PR. Found ${comments.length} items to review.`,
        comments: comments
      });
      console.log(`Review submitted with ${comments.length} comments.`);
    } else {
      // No comments to add, approve the PR
      await octokit.pulls.submitReview({
        owner,
        repo,
        pull_number: prNumber,
        review_id: review.id,
        event: "APPROVE",
        body: "✅ Looks good to me! No issues found in the review."
      });
      console.log('PR approved with no comments.');
    }
    
  } catch (error) {
    console.error('Error during PR review:', error);
    process.exit(1);
  }
}

// Run the review
reviewPullRequest();
