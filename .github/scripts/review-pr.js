// Automated PR Review Script
// Using dynamic import for ES Module

// We'll use an async IIFE to handle the dynamic import
(async () => {
  // Import Octokit using dynamic import
  const { Octokit } = await import('@octokit/rest');

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
    
    // 4. Analyze files and add comments
    console.log('Analyzing changes...');
    const comments = [];
    
    // Check PR description for template compliance
    const prBody = pr.body || '';
    const templateChecks = [
      { pattern: /@dev\/vault-dev/, message: "Please tag the reviewers with @dev/vault-dev" },
      { pattern: /\[STRY\d+\]/, message: "Please include the STRY number in the format [STRY12345]" },
      { pattern: /## Overview/, message: "Please include an Overview section in your PR description" },
      { pattern: /## What has changed/, message: "Please include a 'What has changed' section in your PR description" },
      { pattern: /### Change Type/, message: "Please specify the Change Type (Frontend/Backend/Both) in your PR description" },
      { pattern: /## Tests/, message: "Please include a Tests section in your PR description" }
    ];
    
    const missingTemplateItems = templateChecks.filter(check => !check.pattern.test(prBody));
    
    if (missingTemplateItems.length > 0) {
      // Add a comment about missing template items
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `### PR Template Compliance Check\n\nPlease update your PR description to include the following missing items:\n\n${missingTemplateItems.map(item => `- ${item.message}`).join('\n')}`
      });
      console.log('Added comment about missing template items');
    }
    
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
    
    // Try to create a review with comments if we have any
    if (comments.length > 0) {
      try {
        console.log('Creating pending review...');
        const { data: review } = await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber
        });
        
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
      } catch (reviewError) {
        console.log('Could not create a review with comments. Adding comments individually...');
        
        // Fallback: Add individual comments if review creation fails
        for (const comment of comments) {
          try {
            await octokit.issues.createComment({
              owner,
              repo,
              issue_number: prNumber,
              body: `**File: ${comment.path}, Line: ${comment.line}**\n\n${comment.body}`
            });
          } catch (commentError) {
            console.error('Error adding individual comment:', commentError.message);
          }
        }
      }
    } else {
      // No code issues found
      try {
        console.log('Creating pending review for approval...');
        const { data: review } = await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber
        });
        
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
      } catch (approveError) {
        console.log('Could not create a review for approval. Adding a comment instead...');
        
        // Fallback: Add a comment if review creation fails
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: "✅ Code review complete. No issues found in the review."
        });
      }
    }
    
  } catch (error) {
    console.error('Error during PR review:', error.message);
    
    // Try to add a comment about the error
    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `⚠️ The automated review encountered an error: ${error.message}`
      });
    } catch (commentError) {
      console.error('Could not add error comment:', commentError.message);
    }
    
    process.exit(1);
  }
}

  // Run the review
  await reviewPullRequest();
})().catch(error => {
  console.error('Error during initialization:', error.message);
  process.exit(1);
});
