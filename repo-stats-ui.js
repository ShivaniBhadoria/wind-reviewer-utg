/**
 * Repository Statistics UI
 * This script powers the repository statistics dashboard UI
 */

// Global chart objects for later updates
const charts = {
    contributor: null,
    timeOpen: null,
    files: null,
    fileDistribution: null,
    defects: null,
    defectDistribution: null,
    sizeGuideline: null
};

// Chart colors
const chartColors = [
    'rgba(74, 111, 165, 0.7)',
    'rgba(129, 178, 154, 0.7)',
    'rgba(242, 204, 143, 0.7)',
    'rgba(224, 122, 95, 0.7)',
    'rgba(61, 64, 91, 0.7)',
    'rgba(129, 143, 180, 0.7)',
    'rgba(118, 200, 147, 0.7)',
    'rgba(232, 168, 56, 0.7)',
    'rgba(235, 94, 40, 0.7)',
    'rgba(87, 75, 144, 0.7)'
];

// Initialize the UI
document.addEventListener('DOMContentLoaded', () => {
    // Set up form submission
    const form = document.getElementById('repo-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const owner = document.getElementById('owner').value.trim();
        const repo = document.getElementById('repo').value.trim();
        
        if (owner && repo) {
            await generateStats(owner, repo);
        }
    });
});

/**
 * Generate repository statistics and update the UI
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
async function generateStats(owner, repo) {
    // Show loading indicator
    document.getElementById('loading').classList.remove('d-none');
    document.getElementById('stats-content').classList.add('d-none');
    
    try {
        // Call the repo-stats.js function to get statistics
        const stats = await fetchRepoStats(owner, repo);
        
        // Update UI with statistics
        updateUI(stats);
        
        // Show statistics content
        document.getElementById('loading').classList.add('d-none');
        document.getElementById('stats-content').classList.remove('d-none');
    } catch (error) {
        console.error('Error generating statistics:', error);
        alert(`Error: ${error.message || 'Failed to generate repository statistics'}`);
        document.getElementById('loading').classList.add('d-none');
    }
}

/**
 * Fetch real repository statistics using GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository statistics
 */
async function fetchRepoStats(owner, repo) {
    try {
        // Use the getRepositoryStatistics function from github-stats.js
        return await window.getRepositoryStatistics(owner, repo);
    } catch (error) {
        console.error('Error fetching repository statistics:', error);
        throw error;
    }
}

/**
 * Update the UI with repository statistics
 * @param {Object} stats - Repository statistics
 */
function updateUI(stats) {
    const { contributorStats, fileStats, defectStats, prGuidelines, commitStats } = stats;
    
    // Update contributor charts and tables
    updateContributorStats(contributorStats);
    
    // Update file stats charts and tables
    updateFileStats(fileStats);
    
    // Update defect areas charts and tables
    updateDefectStats(defectStats);
    
    // Update PR guidelines charts and tables
    updateGuidelinesStats(prGuidelines);
    
    // Update summary stats
    updateSummaryStats({
        contributorStats,
        fileStats,
        defectStats,
        prGuidelines,
        commitStats
    });
}

/**
 * Update contributor statistics in the UI
 * @param {Object} contributorStats - Contributor statistics
 */
function updateContributorStats(contributorStats) {
    const { contributors } = contributorStats;
    
    // Update contributor table
    const tbody = document.querySelector('#contributorTable tbody');
    tbody.innerHTML = '';
    
    contributors.forEach(contributor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contributor.name}</td>
            <td>${contributor.prCount}</td>
            <td>${contributor.totalLinesChanged}</td>
            <td>${contributor.avgTimeOpen}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Prepare data for charts
    const labels = contributors.map(c => c.name);
    const prCounts = contributors.map(c => c.prCount);
    const avgTimeOpen = contributors.map(c => parseFloat(c.avgTimeOpen));
    
    // Update contributor PR count chart
    const contributorCtx = document.getElementById('contributorChart').getContext('2d');
    if (charts.contributor) {
        charts.contributor.destroy();
    }
    
    charts.contributor = new Chart(contributorCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of PRs',
                data: prCounts,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'PRs by Contributor'
                }
            }
        }
    });
    
    // Update average time open chart
    const timeOpenCtx = document.getElementById('timeOpenChart').getContext('2d');
    if (charts.timeOpen) {
        charts.timeOpen.destroy();
    }
    
    charts.timeOpen = new Chart(timeOpenCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Hours',
                data: avgTimeOpen,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Average PR Open Time (hours)'
                }
            }
        }
    });
}

/**
 * Update file statistics in the UI
 * @param {Object} fileStats - File statistics
 */
function updateFileStats(fileStats) {
    const { mostChangedFiles } = fileStats;
    
    // Update files table
    const tbody = document.querySelector('#filesTable tbody');
    tbody.innerHTML = '';
    
    mostChangedFiles.forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${file.file}</td>
            <td>${file.changes}</td>
            <td>${file.prCount}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Prepare data for charts
    const labels = mostChangedFiles.map(f => {
        // Truncate long file paths
        const path = f.file;
        return path.length > 30 ? '...' + path.substring(path.length - 30) : path;
    });
    const changes = mostChangedFiles.map(f => f.changes);
    
    // Update most changed files chart
    const filesCtx = document.getElementById('filesChart').getContext('2d');
    if (charts.files) {
        charts.files.destroy();
    }
    
    charts.files = new Chart(filesCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Changes',
                data: changes,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Most Changed Files'
                }
            }
        }
    });
    
    // Group files by directory for distribution chart
    const filesByDir = {};
    mostChangedFiles.forEach(file => {
        const dir = file.file.split('/').slice(0, -1).join('/') || '/';
        if (!filesByDir[dir]) {
            filesByDir[dir] = 0;
        }
        filesByDir[dir] += file.changes;
    });
    
    const dirLabels = Object.keys(filesByDir);
    const dirChanges = Object.values(filesByDir);
    
    // Update file distribution chart
    const fileDistCtx = document.getElementById('fileDistributionChart').getContext('2d');
    if (charts.fileDistribution) {
        charts.fileDistribution.destroy();
    }
    
    charts.fileDistribution = new Chart(fileDistCtx, {
        type: 'pie',
        data: {
            labels: dirLabels,
            datasets: [{
                data: dirChanges,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                },
                title: {
                    display: true,
                    text: 'Changes by Directory'
                }
            }
        }
    });
}

/**
 * Update defect statistics in the UI
 * @param {Object} defectStats - Defect statistics
 */
function updateDefectStats(defectStats) {
    const { defectAreas } = defectStats;
    
    // Update defects table
    const tbody = document.querySelector('#defectsTable tbody');
    tbody.innerHTML = '';
    
    defectAreas.forEach(area => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${area.area}</td>
            <td>${area.defectCount}</td>
            <td>${area.affectedFiles.length}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Prepare data for charts
    const labels = defectAreas.map(a => {
        // Truncate long area paths
        const path = a.area;
        return path.length > 30 ? '...' + path.substring(path.length - 30) : path;
    });
    const counts = defectAreas.map(a => a.defectCount);
    
    // Update defects chart
    const defectsCtx = document.getElementById('defectsChart').getContext('2d');
    if (charts.defects) {
        charts.defects.destroy();
    }
    
    charts.defects = new Chart(defectsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Defect Count',
                data: counts,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Areas with Most Defects'
                }
            }
        }
    });
    
    // Update defect distribution chart
    const defectDistCtx = document.getElementById('defectDistributionChart').getContext('2d');
    if (charts.defectDistribution) {
        charts.defectDistribution.destroy();
    }
    
    charts.defectDistribution = new Chart(defectDistCtx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                },
                title: {
                    display: true,
                    text: 'Defect Distribution by Area'
                }
            }
        }
    });
}

/**
 * Update PR guidelines statistics in the UI
 * @param {Object} prGuidelines - PR guidelines statistics
 */
function updateGuidelinesStats(prGuidelines) {
    const { exceedsSizeLimit, potentialSplits } = prGuidelines;
    
    // Update size limit table
    const sizeTbody = document.querySelector('#sizeLimitTable tbody');
    sizeTbody.innerHTML = '';
    
    if (exceedsSizeLimit.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" class="text-center">No PRs exceed the size limit</td>`;
        sizeTbody.appendChild(row);
    } else {
        exceedsSizeLimit.forEach(pr => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${pr.number}</td>
                <td>${pr.title}</td>
                <td class="guideline-violation">${pr.changes}</td>
            `;
            sizeTbody.appendChild(row);
        });
    }
    
    // Update potential splits table
    const splitsTbody = document.querySelector('#potentialSplitsTable tbody');
    splitsTbody.innerHTML = '';
    
    if (potentialSplits.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="2" class="text-center">No potential splits found</td>`;
        splitsTbody.appendChild(row);
    } else {
        potentialSplits.forEach(pr => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${pr.number}</td>
                <td>${pr.title}</td>
            `;
            splitsTbody.appendChild(row);
        });
    }
    
    // Update guidelines summary
    const guidelinesSummary = document.getElementById('guidelinesSummary');
    guidelinesSummary.innerHTML = '';
    
    const sizeItem = document.createElement('li');
    sizeItem.className = `list-group-item d-flex justify-content-between align-items-center ${exceedsSizeLimit.length > 0 ? 'list-group-item-danger' : 'list-group-item-success'}`;
    sizeItem.innerHTML = `
        PRs exceeding size limit (300 lines)
        <span class="badge bg-${exceedsSizeLimit.length > 0 ? 'danger' : 'success'} rounded-pill">${exceedsSizeLimit.length}</span>
    `;
    guidelinesSummary.appendChild(sizeItem);
    
    const splitsItem = document.createElement('li');
    splitsItem.className = `list-group-item d-flex justify-content-between align-items-center ${potentialSplits.length > 0 ? 'list-group-item-warning' : 'list-group-item-success'}`;
    splitsItem.innerHTML = `
        Potential IT and Story PRs that should be clubbed
        <span class="badge bg-${potentialSplits.length > 0 ? 'warning' : 'success'} rounded-pill">${potentialSplits.length}</span>
    `;
    guidelinesSummary.appendChild(splitsItem);
    
    // Update PR size guideline chart
    const sizeGuidelineCtx = document.getElementById('sizeGuidelineChart').getContext('2d');
    if (charts.sizeGuideline) {
        charts.sizeGuideline.destroy();
    }
    
    const compliantCount = exceedsSizeLimit.length;
    const nonCompliantCount = exceedsSizeLimit.length;
    
    charts.sizeGuideline = new Chart(sizeGuidelineCtx, {
        type: 'doughnut',
        data: {
            labels: ['Compliant PRs', 'Non-compliant PRs'],
            datasets: [{
                data: [compliantCount, nonCompliantCount],
                backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)'],
                borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'PR Size Compliance'
                }
            }
        }
    });
}

/**
 * Update summary statistics in the UI
 * @param {Object} stats - All repository statistics
 */
function updateSummaryStats(stats) {
    const { contributorStats, commitStats, prGuidelines } = stats;
    
    // Update summary cards
    document.getElementById('totalCommits').textContent = commitStats.totalCommits;
    document.getElementById('totalPRs').textContent = contributorStats.contributors.reduce((sum, c) => sum + c.prCount, 0);
    document.getElementById('totalContributors').textContent = contributorStats.contributors.length;
    
    // Generate health summary
    const healthSummary = document.getElementById('healthSummary');
    healthSummary.innerHTML = '';
    
    // Calculate health metrics
    const exceedsSizeCount = prGuidelines.exceedsSizeLimit.length;
    const totalPRs = contributorStats.contributors.reduce((sum, c) => sum + c.prCount, 0);
    const sizeComplianceRate = totalPRs > 0 ? ((totalPRs - exceedsSizeCount) / totalPRs * 100).toFixed(1) : 100;
    
    // Add health metrics
    const metrics = [
        {
            name: 'PR Size Compliance',
            value: `${sizeComplianceRate}%`,
            status: sizeComplianceRate >= 80 ? 'success' : (sizeComplianceRate >= 60 ? 'warning' : 'danger')
        },
        {
            name: 'PR Guidelines Adherence',
            value: prGuidelines.potentialSplits.length === 0 ? 'Good' : 'Needs Improvement',
            status: prGuidelines.potentialSplits.length === 0 ? 'success' : 'warning'
        }
    ];
    
    metrics.forEach(metric => {
        const item = document.createElement('div');
        item.className = 'mb-3';
        item.innerHTML = `
            <h5>${metric.name}</h5>
            <div class="progress">
                <div class="progress-bar bg-${metric.status}" role="progressbar" 
                     style="width: ${metric.name.includes('Compliance') ? metric.value : (metric.status === 'success' ? '100%' : '50%')}" 
                     aria-valuenow="${metric.name.includes('Compliance') ? metric.value.replace('%', '') : (metric.status === 'success' ? 100 : 50)}" 
                     aria-valuemin="0" aria-valuemax="100">
                    ${metric.value}
                </div>
            </div>
        `;
        healthSummary.appendChild(item);
    });
    
    // Add recommendations
    const recommendations = document.createElement('div');
    recommendations.className = 'mt-4';
    recommendations.innerHTML = '<h5>Recommendations</h5><ul class="list-group">';
    
    if (exceedsSizeCount > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                ${exceedsSizeCount} PRs exceed the size limit. Consider breaking them down into smaller, focused changes.
            </li>
        `;
    }
    
    if (prGuidelines.potentialSplits.length > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                ${prGuidelines.potentialSplits.length} potential IT and story PRs should be clubbed together.
            </li>
        `;
    }
    
    if (exceedsSizeCount === 0 && prGuidelines.potentialSplits.length === 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-success">
                <i class="bi bi-check-circle"></i> 
                All PRs follow the guidelines. Great job!
            </li>
        `;
    }
    
    recommendations.innerHTML += '</ul>';
    healthSummary.appendChild(recommendations);
}

// Expose the getRepoStats function for the UI to use
window.getRepoStats = async function(owner, repo) {
    // Use the GitHub MCP API to get real repository statistics
    try {
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
        const prGuidelines = {
            exceedsSizeLimit: [],
            potentialSplits: []
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
            
            // Check for potential IT and story PRs that should be clubbed
            if ((pr.title.toLowerCase().includes('it') || pr.title.toLowerCase().includes('test')) && 
                pr.title.toLowerCase().includes('story')) {
                prGuidelines.potentialSplits.push({
                    number: pr.number,
                    title: pr.title
                });
            }
        }
        
        // 5. Format the statistics
        return {
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
                        prCount: stats.prs.length
                    }))
                    .sort((a, b) => b.changes - a.changes)
                    .slice(0, 10)
            },
            defectStats: {
                defectAreas: Object.entries(defectAreas)
                    .map(([area, stats]) => ({
                        area,
                        defectCount: stats.count,
                        affectedFiles: Array.from(stats.files)
                    }))
                    .sort((a, b) => b.defectCount - a.defectCount)
                    .slice(0, 10)
            },
            prGuidelines: prGuidelines,
            commitStats: {
                totalCommits: commits.length
            }
        };
    } catch (error) {
        console.error('Error fetching repository statistics:', error);
        throw new Error(`Failed to get repository statistics: ${error.message}`);
    }
};
