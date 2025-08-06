/**
 * PR Statistics Generator
 * This script uses MCP tools to generate statistics for a GitHub PR
 */

// Import required MCP tools
const {
    mcp0_get_pull_request,
    mcp0_get_pull_request_files,
    mcp0_search_pull_requests
} = globalThis;

/**
 * Get PR statistics including author contributions, code changes, and timing information
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Object>} - PR statistics
 */
async function getPRStats(owner, repo, prNumber) {
    try {
        console.log(`Getting statistics for PR #${prNumber} in ${owner}/${repo}`);
        
        // 1. Get PR details
        console.log('Getting PR details...');
        const pr = await mcp0_get_pull_request({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        
        if (!pr) {
            throw new Error(`Failed to get PR #${prNumber}`);
        }
        
        // 2. Get PR files
        console.log('Getting PR files...');
        const files = await mcp0_get_pull_request_files({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        
        // 3. Get author's PRs in this repo
        const author = pr.user.login;
        console.log(`Getting PRs by author: ${author}`);
        const query = `repo:${owner}/${repo} author:${author} is:pr`;
        const authorPRs = await mcp0_search_pull_requests({
            query,
            perPage: 100
        });
        
        // 4. Calculate statistics
        
        // Format dates to IST
        const formatDateToIST = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Kolkata'
            }) + ' IST';
        };
        
        // Calculate time to merge
        const calculateTimeToMerge = (createdAt, mergedAt) => {
            if (!mergedAt) return 'Not merged';
            
            const created = new Date(createdAt);
            const merged = new Date(mergedAt);
            const diffMs = merged - created;
            const diffHrs = diffMs / (1000 * 60 * 60);
            
            if (diffHrs < 1) {
                return `~${Math.round(diffMs / (1000 * 60))} minutes`;
            } else {
                return `~${diffHrs.toFixed(1)} hours`;
            }
        };
        
        // Count PRs by status
        let openPRs = 0;
        let mergedPRs = 0;
        let closedPRs = 0;
        
        const prList = authorPRs.items.map(item => {
            const status = item.merged_at ? 'Merged' : (item.state === 'open' ? 'Open' : 'Closed');
            
            if (status === 'Open') openPRs++;
            else if (status === 'Merged') mergedPRs++;
            else closedPRs++;
            
            return {
                number: item.number,
                title: item.title,
                status
            };
        });
        
        // Calculate total additions and deletions
        const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
        const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
        const totalChanges = totalAdditions + totalDeletions;
        
        // 5. Format the statistics
        const stats = {
            basicInfo: {
                prNumber: pr.number,
                title: pr.title,
                author: author,
                status: pr.merged_at ? 'Closed and Merged' : pr.state,
                created: formatDateToIST(pr.created_at),
                merged: pr.merged_at ? formatDateToIST(pr.merged_at) : 'Not merged',
                timeToMerge: calculateTimeToMerge(pr.created_at, pr.merged_at)
            },
            codeChanges: {
                filesChanged: files.length,
                filesList: files.map(file => file.filename),
                totalChanges: totalChanges,
                additions: totalAdditions,
                deletions: totalDeletions
            },
            authorStats: {
                totalPRs: authorPRs.items.length,
                prList: prList,
                openPRs: openPRs,
                mergedPRs: mergedPRs,
                closedPRs: closedPRs
            }
        };
        
        return stats;
    } catch (error) {
        console.error('Failed to get PR stats:', error);
        throw error;
    }
}

/**
 * Format PR statistics into a readable string
 * @param {Object} stats - PR statistics object
 * @returns {string} - Formatted PR statistics
 */
function formatPRStats(stats) {
    const { basicInfo, codeChanges, authorStats } = stats;
    
    let output = `## PR Statistics\n\n`;
    
    // Basic Information
    output += `### Basic Information\n`;
    output += `- **PR Number:** ${basicInfo.prNumber}\n`;
    output += `- **Title:** ${basicInfo.title}\n`;
    output += `- **Author:** ${basicInfo.author}\n`;
    output += `- **Status:** ${basicInfo.status}\n`;
    output += `- **Created:** ${basicInfo.created}\n`;
    output += `- **Merged:** ${basicInfo.merged}\n`;
    output += `- **Time to merge:** ${basicInfo.timeToMerge}\n\n`;
    
    // Code Changes
    output += `### Code Changes\n`;
    output += `- **Files changed:** ${codeChanges.filesChanged} files\n`;
    codeChanges.filesList.forEach(file => {
        output += `  - ${file}\n`;
    });
    output += `- **Total lines changed:** ${codeChanges.totalChanges}\n`;
    output += `- **Additions:** ${codeChanges.additions} lines\n`;
    output += `- **Deletions:** ${codeChanges.deletions} lines\n\n`;
    
    // Author Contribution Statistics
    output += `### Author Contribution Statistics\n`;
    output += `- **Total PRs by author in this repo:** ${authorStats.totalPRs}\n`;
    authorStats.prList.forEach(pr => {
        output += `  - PR #${pr.number}: ${pr.title} (${pr.status})\n`;
    });
    output += `- **PRs merged:** ${authorStats.mergedPRs}\n`;
    output += `- **PRs open:** ${authorStats.openPRs}\n`;
    
    return output;
}

// Main function to run the script
async function main() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        if (args.length < 3) {
            console.error('Usage: node pr-stats.js <owner> <repo> <pr-number>');
            process.exit(1);
        }
        
        const [owner, repo, prNumber] = args;
        
        // Get and format PR stats
        const stats = await getPRStats(owner, repo, parseInt(prNumber));
        const formattedStats = formatPRStats(stats);
        
        // Output the formatted stats
        console.log(formattedStats);
        console.log('PR stats retrieved successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Check if we're in a Node.js environment or a browser environment
if (typeof process !== 'undefined' && process.argv) {
    main();
}

// Export functions for use in other scripts
module.exports = {
    getPRStats,
    formatPRStats
};
