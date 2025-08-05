// PR Review Tool using GitHub MCP Server
// This tool helps review pull requests and leave comments

// Import MCP server tools directly
// These are provided by the Windsurf IDE's MCP server
const { 
    mcp0_get_pull_request, 
    mcp0_get_pull_request_files, 
    mcp0_create_pending_pull_request_review, 
    mcp0_add_comment_to_pending_review,
    mcp0_submit_pending_pull_request_review 
} = global.mcp || {};

if (!mcp0_get_pull_request) {
    throw new Error('GitHub MCP server tools are not available. Make sure the GitHub MCP server is running.');
}

/**
 * Main function to review a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - Pull request number
 * @param {Object} options - Review options
 */
async function reviewPullRequest(owner, repo, prNumber, options = {}) {
    try {
        console.log(`Starting review for PR #${prNumber} in ${owner}/${repo}`);
        
        // 1. Get PR details
        console.log('Fetching PR details...');
        const pr = await mcp0_get_pull_request({
            owner,
            repo,
            pullNumber: prNumber
        });
        
        if (!pr) {
            throw new Error('Failed to fetch PR details');
        }
        
        // 2. Get changed files
        console.log('Fetching changed files...');
        const files = await mcp0_get_pull_request_files({
            owner,
            repo,
            pullNumber: prNumber
        });
        
        if (!files || files.length === 0) {
            console.log('No files changed in this PR');
            return;
        }
        
        // 3. Create a pending review
        console.log('Creating pending review...');
        await mcp0_create_pending_pull_request_review({
            owner,
            repo,
            pullNumber: prNumber,
            commitID: pr.head.sha
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
                    subjectType: "FILE"
                });
            }
            
            // Check for large functions (simplified example)
            if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx') || 
                file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
                // In a real implementation, you would parse the file and analyze function sizes
                // This is a simplified example
                if (file.patch && file.patch.length > 1000) {
                    comments.push({
                        path: file.filename,
                        body: "🔍 This file has significant changes. Please ensure all new functions are properly documented and tested.",
                        subjectType: "FILE"
                    });
                }
            }
        }
        
        // 5. Add all comments
        if (comments.length > 0) {
            console.log(`Adding ${comments.length} review comments...`);
            for (const comment of comments) {
                await mcp0_add_comment_to_pending_review({
                    owner,
                    repo,
                    pullNumber: prNumber,
                    path: comment.path,
                    body: comment.body,
                    subjectType: comment.subjectType,
                    side: "RIGHT"
                });
            }
            
            // 6. Submit the review with comments
            await mcp0_submit_pending_pull_request_review({
                owner,
                repo,
                pullNumber: prNumber,
                event: "COMMENT", // or "REQUEST_CHANGES" if issues found
                body: `I've reviewed your PR. Found ${comments.length} items to review.`
            });
            
            console.log(`Review submitted with ${comments.length} comments.`);
        } else {
            // No comments to add, approve the PR
            await mcp0_submit_pending_pull_request_review({
                owner,
                repo,
                pullNumber: prNumber,
                event: "APPROVE",
                body: "✅ Looks good to me! No issues found in the review."
            });
            console.log('PR approved with no comments.');
        }
        
    } catch (error) {
        console.error('Error during PR review:', error);
        throw error;
    }
}

// Export the main function
module.exports = { reviewPullRequest };

// Example usage (uncomment to test):
// reviewPullRequest('owner', 'repo', 123, {})
//     .then(() => console.log('Review completed'))
//     .catch(err => console.error('Review failed:', err));
