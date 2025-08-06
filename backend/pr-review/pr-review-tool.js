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

/**
 * Update comments on a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - Pull request number
 * @param {Array} updatedComments - Array of comment objects with updated content
 */
async function updatePRComments(owner, repo, prNumber, updatedComments) {
    try {
        console.log(`Updating comments for PR #${prNumber} in ${owner}/${repo}`);
        
        // Get PR details for the commit SHA
        const pr = await mcp0_get_pull_request({
            owner,
            repo,
            pullNumber: prNumber
        });
        
        // Create a new pending review
        await mcp0_create_pending_pull_request_review({
            owner,
            repo,
            pullNumber: prNumber,
            commitID: pr.head.sha
        });
        
        // Add all updated comments
        console.log(`Adding ${updatedComments.length} updated comments...`);
        for (const comment of updatedComments) {
            await mcp0_add_comment_to_pending_review({
                owner,
                repo,
                pullNumber: prNumber,
                path: comment.path,
                body: comment.body,
                subjectType: comment.subjectType || "FILE",
                line: comment.line,
                side: comment.side || "RIGHT"
            });
        }
        
        // Submit the review with updated comments
        await mcp0_submit_pending_pull_request_review({
            owner,
            repo,
            pullNumber: prNumber,
            event: "COMMENT",
            body: `I've updated my review with ${updatedComments.length} comments.`
        });
        
        console.log(`Review updated with ${updatedComments.length} comments.`);
    } catch (error) {
        console.error('Error updating PR comments:', error);
        throw error;
    }
}

/**
 * Update a specific PR comment by ID
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - Pull request number
 * @param {number} commentId - ID of the comment to update
 * @param {string} newBody - New content for the comment
 */
async function updatePRComment(owner, repo, prNumber, commentId, newBody) {
    try {
        console.log(`Updating comment ${commentId} for PR #${prNumber} in ${owner}/${repo}`);
        
        // First, get all PR comments to find the one to update
        const comments = await mcp0_get_pull_request_comments({
            owner,
            repo,
            pullNumber: prNumber
        });
        
        // Find the specific comment
        const commentToUpdate = comments.find(comment => comment.id === commentId);
        
        if (!commentToUpdate) {
            throw new Error(`Comment with ID ${commentId} not found`);
        }
        
        // Create a pending review
        await mcp0_create_pending_pull_request_review({
            owner,
            repo,
            pullNumber: prNumber,
            commitID: commentToUpdate.commit_id
        });
        
        // Add the updated comment
        await mcp0_add_comment_to_pending_review({
            owner,
            repo,
            pullNumber: prNumber,
            path: commentToUpdate.path,
            body: newBody,
            subjectType: commentToUpdate.position ? "LINE" : "FILE",
            line: commentToUpdate.position,
            side: commentToUpdate.side || "RIGHT"
        });
        
        // Submit the review with the updated comment
        await mcp0_submit_pending_pull_request_review({
            owner,
            repo,
            pullNumber: prNumber,
            event: "COMMENT",
            body: "Updated review comment"
        });
        
        console.log(`Comment ${commentId} updated successfully.`);
    } catch (error) {
        console.error('Error updating PR comment:', error);
        throw error;
    }
}

// Export the functions
module.exports = { reviewPullRequest, updatePRComments, updatePRComment };

// Example usage (uncomment to test):
// reviewPullRequest('owner', 'repo', 123, {})
//     .then(() => console.log('Review completed'))
//     .catch(err => console.error('Review failed:', err));
//
// Example for updating comments:
// updatePRComments('owner', 'repo', 123, [
//     { path: 'file.js', body: 'Updated comment', subjectType: 'FILE' }
// ])
//     .then(() => console.log('Comments updated'))
//     .catch(err => console.error('Update failed:', err));
