// This script demonstrates how to use the GitHub MCP server tools
// to review pull requests directly from the Windsurf IDE

// Import the necessary tools from global.mcp
// Note: This script is designed to be run within the Windsurf IDE environment
// where global.mcp is available

// Configuration
const config = {
  owner: 'ShivaniBhadoria',
  repo: 'personal-finance-simulator',
  prNumber: 2 // Using PR #2 for testing
};

// Main function to review a PR using MCP tools
async function reviewPRWithMCP() {
  try {
    console.log(`Starting review for PR #${config.prNumber} in ${config.owner}/${config.repo}`);
    
    // Check if MCP tools are available
    if (!global.mcp) {
      console.error('GitHub MCP server tools are not available.');
      console.error('This script must be run within the Windsurf IDE environment.');
      return;
    }
    
    // Extract the MCP tools we need
    const {
      mcp0_get_pull_request,
      mcp0_get_pull_request_files,
      mcp0_create_pending_pull_request_review,
      mcp0_add_comment_to_pending_review,
      mcp0_submit_pending_pull_request_review
    } = global.mcp;
    
    // 1. Get PR details
    console.log('Fetching PR details...');
    const pr = await mcp0_get_pull_request({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber
    });
    
    console.log(`PR Title: ${pr.title}`);
    
    // 2. Get changed files
    console.log('Fetching changed files...');
    const files = await mcp0_get_pull_request_files({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber
    });
    
    if (!files || files.length === 0) {
      console.log('No files changed in this PR');
      return;
    }
    
    console.log(`Files changed: ${files.length}`);
    files.forEach(file => {
      console.log(`- ${file.filename} (${file.additions} additions, ${file.deletions} deletions)`);
    });
    
    // 3. Try to create a pending review
    console.log('Attempting to create pending review...');
    try {
      await mcp0_create_pending_pull_request_review({
        owner: config.owner,
        repo: config.repo,
        pullNumber: config.prNumber,
        commitID: pr.head.sha
      });
      console.log('Pending review created successfully');
      
      // 4. Analyze files and prepare comments
      console.log('Analyzing changes...');
      const comments = [];
      
      for (const file of files) {
        // Example: Check for large files
        if (file.additions + file.deletions > 300) {
          comments.push({
            path: file.filename,
            body: "⚠️ This file has many changes (" + (file.additions + file.deletions) + " lines). Consider breaking it into smaller, more focused files for better maintainability.",
            subjectType: "FILE"
          });
        }
        
        // Check for large functions (simplified example)
        if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx') || 
            file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
          if (file.patch && file.patch.length > 1000) {
            comments.push({
              path: file.filename,
              body: "🔍 This file has significant changes. Please ensure all new functions are properly documented and tested.",
              subjectType: "FILE"
            });
          }
        }
      }
      
      // 5. Add comments to the review
      if (comments.length > 0) {
        console.log(`Adding ${comments.length} comments to review...`);
        for (const comment of comments) {
          await mcp0_add_comment_to_pending_review({
            owner: config.owner,
            repo: config.repo,
            pullNumber: config.prNumber,
            path: comment.path,
            body: comment.body,
            subjectType: comment.subjectType,
            side: "RIGHT"
          });
        }
        
        // 6. Submit the review with comments
        await mcp0_submit_pending_pull_request_review({
          owner: config.owner,
          repo: config.repo,
          pullNumber: config.prNumber,
          event: "COMMENT",
          body: `I've reviewed your PR. Found ${comments.length} items to review.`
        });
        console.log('Review submitted with comments.');
      } else {
        // No comments to add, approve the PR
        await mcp0_submit_pending_pull_request_review({
          owner: config.owner,
          repo: config.repo,
          pullNumber: config.prNumber,
          event: "APPROVE",
          body: "✅ Looks good to me! No issues found in the review."
        });
        console.log('PR approved with no comments.');
      }
    } catch (error) {
      console.error('Error during PR review:', error.message);
      
      // Even if we can't create a review, we can still analyze the PR
      console.log('\nPR Analysis (read-only mode):');
      console.log('----------------------------');
      
      // Analyze files without creating comments
      for (const file of files) {
        console.log(`\nFile: ${file.filename}`);
        console.log(`Changes: +${file.additions} -${file.deletions}`);
        
        if (file.additions + file.deletions > 300) {
          console.log('⚠️ This file has many changes. Consider breaking it into smaller, more focused files.');
        }
        
        if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx') || 
            file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
          if (file.patch && file.patch.length > 1000) {
            console.log('🔍 This file has significant changes. Ensure all new functions are properly documented.');
          }
        }
      }
      
      console.log('\nOverall Assessment:');
      if (files.some(file => file.additions + file.deletions > 300 || 
                    (file.patch && file.patch.length > 1000))) {
        console.log('⚠️ Some files have significant changes that should be reviewed carefully.');
      } else {
        console.log('✅ Changes look reasonable in size and scope.');
      }
    }
    
  } catch (error) {
    console.error('Error during PR review:', error.message);
    console.error(error);
  }
}

// This function will be called when the script is executed in the Windsurf IDE
reviewPRWithMCP();
