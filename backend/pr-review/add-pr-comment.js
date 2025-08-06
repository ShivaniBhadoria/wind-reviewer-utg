// Simple script to add a comment to a PR using GitHub MCP server tools
// This script must be run within the Windsurf IDE environment

// Configuration - update these values
const config = {
  owner: 'ShivaniBhadoria',
  repo: 'personal-finance-simulator',
  prNumber: 2, // PR number to comment on
  comment: `## PR Review Comment

I've reviewed this PR that adds a description comment to the server.js file.

### Code Analysis
✅ The added comment provides a clear description of the application purpose
✅ The change is minimal and focused on a single concern
✅ The description accurately reflects the application's functionality

### Suggestions
💡 Consider standardizing comment headers across files for consistency
💡 You might want to add similar descriptive comments to other key files

Overall, this is a simple but useful addition that improves code documentation. Approved! 👍`
};

// Function to add a comment to a PR
async function addPRComment() {
  try {
    console.log(`Adding comment to PR #${config.prNumber} in ${config.owner}/${config.repo}`);
    
    // Check if MCP tools are available
    if (!global.mcp) {
      console.error('GitHub MCP server tools are not available.');
      console.error('This script must be run within the Windsurf IDE environment.');
      return;
    }
    
    // Extract the MCP tool we need
    const { mcp0_add_issue_comment } = global.mcp;
    
    // Add comment to the PR
    const result = await mcp0_add_issue_comment({
      owner: config.owner,
      repo: config.repo,
      issue_number: config.prNumber,
      body: config.comment
    });
    
    console.log('Comment added successfully!');
    console.log(`Comment URL: ${result.html_url}`);
    
  } catch (error) {
    console.error('Error adding comment:', error.message);
    console.error(error);
    
    if (error.message.includes('Resource not accessible by personal access token')) {
      console.error('\nPermission Error: Your token does not have the necessary permissions.');
      console.error('Make sure your token has the "repo" scope or "pull_requests: write" permission.');
    }
  }
}

// Run the function
addPRComment();
