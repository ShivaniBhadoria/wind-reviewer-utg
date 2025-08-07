/**
 * Repository Statistics Generator
 * This script uses MCP tools to generate repository-level statistics
 */

// Import required MCP tools
const {
    mcp0_search_pull_requests,
    mcp0_list_commits,
    mcp0_get_pull_request,
    mcp0_get_pull_request_files,
    mcp0_get_pull_request_comments,
    mcp0_get_pull_request_reviews
} = globalThis;

/**
 * Get repository-level statistics
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository statistics
 */
async function getRepoStats(owner, repo) {
    try {
        console.log(`Getting statistics for repository ${owner}/${repo}`);
        
        // 1. Get all PRs in the repository (limited to 100 most recent)
        const allPRs = await mcp0_search_pull_requests({
            query: `repo:${owner}/${repo} is:pr`,
            perPage: 100
        });
        
        // 2. Get all commits in the repository (limited to 100 most recent)
        const commits = await mcp0_list_commits({
            owner,
            repo,
            perPage: 100
        });
        
        // 3. Calculate statistics
        
        // 3.1 Contributor statistics
        const contributors = {};
        const prTimeOpen = {};
        const filesChanged = {};
        const defectAreas = {};
        
        // Process each PR to gather statistics
        for (const pr of allPRs.items) {
            const author = pr.user.login;
            
            // Track contributor PR count
            if (!contributors[author]) {
                contributors[author] = {
                    prCount: 0,
                    totalLinesChanged: 0,
                    avgTimeOpen: 0,
                    prs: []
                };
            }
            contributors[author].prCount++;
            
            // Get detailed PR info
            const prDetails = await mcp0_get_pull_request({
                owner,
                repo,
                pullNumber: pr.number
            });
            
            // Calculate time open
            const created = new Date(pr.created_at);
            const closed = pr.closed_at ? new Date(pr.closed_at) : new Date();
            const timeOpenHours = (closed - created) / (1000 * 60 * 60);
            
            contributors[author].avgTimeOpen = 
                (contributors[author].avgTimeOpen * (contributors[author].prCount - 1) + timeOpenHours) / 
                contributors[author].prCount;
            
            // Get PR files
            const files = await mcp0_get_pull_request_files({
                owner,
                repo,
                pullNumber: pr.number
            });
            
            let prLinesChanged = 0;
            
            // Process each file in the PR
            files.forEach(file => {
                const filePath = file.filename;
                const changes = file.additions + file.deletions;
                prLinesChanged += changes;
                
                // Track file changes
                if (!filesChanged[filePath]) {
                    filesChanged[filePath] = {
                        changes: 0,
                        prs: []
                    };
                }
                filesChanged[filePath].changes += changes;
                filesChanged[filePath].prs.push(pr.number);
                
                // Track defect areas (PRs with "fix" or "bug" in title)
                if (pr.title.toLowerCase().includes('fix') || 
                    pr.title.toLowerCase().includes('bug') || 
                    pr.title.toLowerCase().includes('defect')) {
                    
                    // Extract directory path
                    const directory = filePath.split('/').slice(0, -1).join('/') || '/';
                    
                    if (!defectAreas[directory]) {
                        defectAreas[directory] = {
                            count: 0,
                            files: new Set()
                        };
                    }
                    defectAreas[directory].count++;
                    defectAreas[directory].files.add(filePath);
                }
            });
            
            contributors[author].totalLinesChanged += prLinesChanged;
            contributors[author].prs.push({
                number: pr.number,
                title: pr.title,
                linesChanged: prLinesChanged,
                timeOpen: timeOpenHours.toFixed(1)
            });
        }
        
        // 4. Check PRs against guidelines
        let prGuidelines = {
            exceedsSizeLimit: [],
            openTooLong: [],
            slowFirstReview: [],
            unresolvedComments: []
        };
        
        for (const pr of allPRs.items) {
            // Get PR files
            const files = await mcp0_get_pull_request_files({
                owner,
                repo,
                pullNumber: pr.number
            });
            
            const totalChanges = files.reduce((sum, file) => sum + file.additions + file.deletions, 0);
            
            // Check if PR exceeds size limit (300 lines)
            if (totalChanges > 300) {
                prGuidelines.exceedsSizeLimit.push({
                    number: pr.number,
                    title: pr.title,
                    changes: totalChanges
                });
            }
            
            // Check if PR is open for more than 72 hours
            if (pr.state === 'open') {
                const created = new Date(pr.created_at);
                const now = new Date();
                const hoursOpen = (now - created) / (1000 * 60 * 60);
                
                if (hoursOpen > 72) {
                    prGuidelines.openTooLong.push({
                        number: pr.number,
                        title: pr.title,
                        hoursOpen: hoursOpen.toFixed(1)
                    });
                }
            }
            
            // Check if first review took more than 24 hours
            // Note: This is a simplified check. In a real implementation, you would need to
            // fetch the PR reviews and check their timestamps
            if (pr.review_comments > 0 && pr.created_at && pr.updated_at) {
                const created = new Date(pr.created_at);
                const firstUpdate = new Date(pr.updated_at);
                const hoursToFirstReview = (firstUpdate - created) / (1000 * 60 * 60);
                
                if (hoursToFirstReview > 24) {
                    prGuidelines.slowFirstReview.push({
                        number: pr.number,
                        title: pr.title,
                        hoursToFirstReview: hoursToFirstReview.toFixed(1)
                    });
                }
            }
            
            // Check for unresolved comments in merged PRs
            if (pr.merged && pr.review_comments > 0) {
                // Get PR review comments
                const prComments = await mcp0_get_pull_request_comments({
                    owner,
                    repo,
                    pullNumber: pr.number
                });
                
                // Get PR reviews
                const prReviews = await mcp0_get_pull_request_reviews({
                    owner,
                    repo,
                    pullNumber: pr.number
                });
                
                // Find unresolved comments
                const unresolvedCommentsList = [];
                prComments.forEach(comment => {
                    // Check if comment is unresolved
                    // GitHub marks resolved comments with a specific state or they're referenced in a review
                    if (!comment.resolved) {
                        unresolvedCommentsList.push({
                            id: comment.id,
                            body: comment.body,
                            user: comment.user.login,
                            created_at: comment.created_at,
                            path: comment.path,
                            line: comment.line || comment.original_line
                        });
                    }
                });
                
                // If there are unresolved comments, add this PR to the list
                if (unresolvedCommentsList.length > 0) {
                    prGuidelines.unresolvedComments.push({
                        number: pr.number,
                        title: pr.title,
                        comments: unresolvedCommentsList.length,
                        unresolvedCommentsList: unresolvedCommentsList
                    });
                }
            }
        }
        
        // 5. Format the statistics
        const stats = {
            contributorStats: {
                contributors: Object.entries(contributors).map(([name, stats]) => ({
                    name,
                    prCount: stats.prCount,
                    totalLinesChanged: stats.totalLinesChanged,
                    avgTimeOpen: stats.avgTimeOpen.toFixed(1),
                    prs: stats.prs
                })).sort((a, b) => b.prCount - a.prCount)
            },
            fileStats: {
                mostChangedFiles: Object.entries(filesChanged)
                    .map(([file, stats]) => ({
                        file,
                        changes: stats.changes,
                        prCount: stats.prs ? stats.prs.length : 0
                    }))
                    .sort((a, b) => b.changes - a.changes)
                    .slice(0, 10)
            },
            defectStats: {
                defectAreas: Object.entries(defectAreas)
                    .map(([area, stats]) => ({
                        area,
                        defectCount: stats.count,
                        affectedFiles: Array.from(stats.files || [])
                    }))
                    .sort((a, b) => b.defectCount - a.defectCount)
                    .slice(0, 10)
            },
            prGuidelines: {
                exceedsSizeLimit: prGuidelines.exceedsSizeLimit || [],
                openTooLong: prGuidelines.openTooLong || [],
                slowFirstReview: prGuidelines.slowFirstReview || [],
                unresolvedComments: prGuidelines.unresolvedComments || []
            },
            commitStats: {
                totalCommits: commits && commits.length ? commits.length : 0
            }
        };
        
        return stats;
        
        // Output the statistics as JSON
        console.log(JSON.stringify(stats, null, 2));
        // Don't return stats twice
        // return stats;
    } catch (error) {
        console.error('Failed to get repository stats:', error);
        throw error;
    }
}

/**
 * Format repository statistics into a readable string
 * @param {Object} stats - Repository statistics object
 * @returns {string} - Formatted repository statistics
 */
function formatRepoStats(stats) {
    const { contributorStats, fileStats, defectStats, prGuidelines, commitStats } = stats;
    
    let output = `# Repository Statistics\n\n`;
    
    // Contributor Statistics
    output += `## Contributor Statistics\n\n`;
    output += `| Contributor | PRs | Lines Changed | Avg Time Open (hours) |\n`;
    output += `|-------------|-----|---------------|------------------------|\n`;
    
    contributorStats.contributors.forEach(contributor => {
        output += `| ${contributor.name} | ${contributor.prCount} | ${contributor.totalLinesChanged} | ${contributor.avgTimeOpen} |\n`;
    });
    
    output += `\n### PR Details by Contributor\n\n`;
    contributorStats.contributors.forEach(contributor => {
        output += `#### ${contributor.name} (${contributor.prCount} PRs)\n\n`;
        output += `| PR | Title | Lines Changed | Time Open (hours) |\n`;
        output += `|----|-------|---------------|-------------------|\n`;
        
        contributor.prs.forEach(pr => {
            output += `| #${pr.number} | ${pr.title} | ${pr.linesChanged} | ${pr.timeOpen} |\n`;
        });
        
        output += `\n`;
    });
    
    // Most Changed Files
    output += `## Most Changed Files\n\n`;
    output += `| File | Changes | PRs |\n`;
    output += `|------|---------|-----|\n`;
    
    fileStats.mostChangedFiles.forEach(file => {
        output += `| ${file.file} | ${file.changes} | ${file.prCount} |\n`;
    });
    
    // Defect Areas
    output += `\n## Areas with Most Defects\n\n`;
    output += `| Area | Defect Count | Affected Files |\n`;
    output += `|------|--------------|----------------|\n`;
    
    defectStats.defectAreas.forEach(area => {
        output += `| ${area.area} | ${area.defectCount} | ${area.affectedFiles ? area.affectedFiles.length : 0} |\n`;
    });
    
    // PR Guidelines
    output += `\n## PR Guidelines Violations\n\n`;
    output += `### PRs Exceeding Size Limit (300 lines)\n\n`;
    
    if (!prGuidelines.exceedsSizeLimit || prGuidelines.exceedsSizeLimit.length === 0) {
        output += `No PRs exceed the size limit.\n\n`;
    } else {
        output += `| PR | Title | Changes |\n`;
        output += `|----|-------|--------|\n`;
        
        (prGuidelines.exceedsSizeLimit || []).forEach(pr => {
            output += `| #${pr.number} | ${pr.title} | ${pr.changes} |\n`;
        });
    }
    
    output += `\n### PRs Open for More Than 72 Hours\n\n`;
    
    if (!prGuidelines.openTooLong || prGuidelines.openTooLong.length === 0) {
        output += `No PRs open for more than 72 hours.\n\n`;
    } else {
        output += `| PR | Title | Hours Open |\n`;
        output += `|----|-------|------------|\n`;
        
        (prGuidelines.openTooLong || []).forEach(pr => {
            output += `| #${pr.number} | ${pr.title} | ${pr.hoursOpen} |\n`;
        });
    }
    
    output += `\n### PRs with First Review Taking More Than 24 Hours\n\n`;
    
    if (!prGuidelines.slowFirstReview || prGuidelines.slowFirstReview.length === 0) {
        output += `No PRs with slow first review.\n\n`;
    } else {
        output += `| PR | Title | Hours to First Review |\n`;
        output += `|----|-------|---------------------|\n`;
        
        (prGuidelines.slowFirstReview || []).forEach(pr => {
            output += `| #${pr.number} | ${pr.title} | ${pr.hoursToFirstReview} |\n`;
        });
    }
    
    output += `\n### PRs Merged with Unresolved Comments\n\n`;
    
    if (!prGuidelines.unresolvedComments || prGuidelines.unresolvedComments.length === 0) {
        output += `No PRs merged with unresolved comments.\n\n`;
    } else {
        output += `| PR | Title | Comment Count |\n`;
        output += `|----|-------|--------------|\n`;
        
        (prGuidelines.unresolvedComments || []).forEach(pr => {
            output += `| #${pr.number} | ${pr.title} | ${pr.comments} |\n`;
        });
    }
    
    // Commit Statistics
    output += `\n## Commit Statistics\n\n`;
    output += `- **Total Commits:** ${commitStats.totalCommits}\n`;
    
    return output;
}


/**
 * Main function to run the script
 */
async function main() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Usage: node repo-stats.js <owner> <repo>');
            process.exit(1);
        }
        
        const [owner, repo] = args;
        
        // Get repository stats
        await getRepoStats(owner, repo);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = {
    getRepoStats,
    formatRepoStats
};
