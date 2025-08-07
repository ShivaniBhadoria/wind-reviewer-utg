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
    
    // First update summary stats to ensure total PR count is available
    updateSummaryStats({
        contributorStats,
        fileStats,
        defectStats,
        prGuidelines,
        commitStats
    });
    
    // Update contributor charts and tables
    updateContributorStats(contributorStats);
    
    // Update file stats charts and tables
    updateFileStats(fileStats);
    
    // Update defect areas charts and tables
    updateDefectStats(defectStats);
    
    // Update PR guidelines charts and tables after summary stats are updated
    updateGuidelinesStats(prGuidelines);
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
    // Ensure all properties exist with default empty arrays
    const exceedsSizeLimit = prGuidelines?.exceedsSizeLimit || [];
    const openTooLong = prGuidelines?.openTooLong || [];
    const slowFirstReview = prGuidelines?.slowFirstReview || [];
    const unresolvedComments = prGuidelines?.unresolvedComments || [];
    
    // Update PR Guidelines Summary
    const guidelinesSummary = document.getElementById('guidelinesSummary');
    guidelinesSummary.innerHTML = '';
    
    // Add summary items
    if (exceedsSizeLimit.length > 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-warning';
        item.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${exceedsSizeLimit.length} PRs exceed size limit`;
        guidelinesSummary.appendChild(item);
    }
    
    if (openTooLong.length > 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-warning';
        item.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${openTooLong.length} PRs open too long`;
        guidelinesSummary.appendChild(item);
    }
    
    if (slowFirstReview.length > 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-warning';
        item.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${slowFirstReview.length} PRs with slow first review`;
        guidelinesSummary.appendChild(item);
    }
    
    if (unresolvedComments.length > 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-warning';
        item.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${unresolvedComments.length} PRs with unresolved comments`;
        guidelinesSummary.appendChild(item);
    }
    
    if (exceedsSizeLimit.length === 0 && openTooLong.length === 0 && 
        slowFirstReview.length === 0 && unresolvedComments.length === 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item list-group-item-success';
        item.innerHTML = `<i class="bi bi-check-circle"></i> All PRs follow guidelines`;
        guidelinesSummary.appendChild(item);
    }
    
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
                <td><a href="https://github.com/${document.getElementById('owner').value}/${document.getElementById('repo').value}/pull/${pr.number}" target="_blank">#${pr.number}</a></td>
                <td>${pr.title}</td>
                <td>${pr.changes}</td>
            `;
            sizeTbody.appendChild(row);
        });
    }
    
    // Update PRs open too long table
    const openTooLongTbody = document.querySelector('#openTooLongTable tbody');
    openTooLongTbody.innerHTML = '';
    
    if (openTooLong.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" class="text-center">No PRs open for more than 72 hours</td>`;
        openTooLongTbody.appendChild(row);
    } else {
        openTooLong.forEach(pr => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://github.com/${document.getElementById('owner').value}/${document.getElementById('repo').value}/pull/${pr.number}" target="_blank">#${pr.number}</a></td>
                <td>${pr.title}</td>
                <td>${pr.hoursOpen}</td>
            `;
            openTooLongTbody.appendChild(row);
        });
    }
    
    // Update slow first review table
    const slowFirstReviewTbody = document.querySelector('#slowFirstReviewTable tbody');
    slowFirstReviewTbody.innerHTML = '';
    
    if (slowFirstReview.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" class="text-center">No PRs with first review taking more than 24 hours</td>`;
        slowFirstReviewTbody.appendChild(row);
    } else {
        slowFirstReview.forEach(pr => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="https://github.com/${document.getElementById('owner').value}/${document.getElementById('repo').value}/pull/${pr.number}" target="_blank">#${pr.number}</a></td>
                <td>${pr.title}</td>
                <td>${pr.hoursToFirstReview}</td>
            `;
            slowFirstReviewTbody.appendChild(row);
        });
    }
    
    // Update unresolved comments table
    const unresolvedCommentsTbody = document.querySelector('#unresolvedCommentsTable tbody');
    unresolvedCommentsTbody.innerHTML = '';
    
    if (unresolvedComments.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" class="text-center">No PRs merged with unresolved comments</td>`;
        unresolvedCommentsTbody.appendChild(row);
    } else {
        unresolvedComments.forEach(pr => {
            // Create expandable row for PR with unresolved comments
            const row = document.createElement('tr');
            row.className = 'pr-row';
            row.dataset.prNumber = pr.number;
            row.innerHTML = `
                <td><a href="https://github.com/${document.getElementById('owner').value}/${document.getElementById('repo').value}/pull/${pr.number}" target="_blank">#${pr.number}</a></td>
                <td>${pr.title}</td>
                <td>
                    ${pr.comments || pr.commentCount}
                    <button class="btn btn-sm btn-outline-info ms-2 toggle-comments" data-pr-number="${pr.number}">
                        <i class="bi bi-chevron-down"></i> Details
                    </button>
                </td>
            `;
            unresolvedCommentsTbody.appendChild(row);
            
            // Create hidden detail row for comments
            if (pr.unresolvedCommentsList && pr.unresolvedCommentsList.length > 0) {
                const detailRow = document.createElement('tr');
                detailRow.className = 'comment-details d-none';
                detailRow.dataset.prNumber = pr.number;
                
                let commentsHtml = '<td colspan="3"><div class="p-2 bg-light rounded">';
                commentsHtml += '<h6 class="mb-3">Unresolved Comments:</h6>';
                commentsHtml += '<ul class="list-group">';
                
                pr.unresolvedCommentsList.forEach(comment => {
                    const date = new Date(comment.created_at).toLocaleDateString();
                    commentsHtml += `
                        <li class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-secondary">${comment.user}</span>
                                <small>${date}</small>
                            </div>
                            <div class="mt-2">${comment.body}</div>
                            <div class="mt-1 text-muted small">
                                <code>${comment.path}:${comment.line || 'N/A'}</code>
                            </div>
                        </li>
                    `;
                });
                
                commentsHtml += '</ul></div></td>';
                detailRow.innerHTML = commentsHtml;
                unresolvedCommentsTbody.appendChild(detailRow);
            }
        });
        
        // Add event listeners for toggle buttons
        document.querySelectorAll('.toggle-comments').forEach(button => {
            button.addEventListener('click', (e) => {
                const prNumber = e.target.closest('button').dataset.prNumber;
                const detailRow = document.querySelector(`.comment-details[data-pr-number="${prNumber}"]`);
                detailRow.classList.toggle('d-none');
                
                // Toggle icon
                const icon = e.target.closest('button').querySelector('i');
                if (icon.classList.contains('bi-chevron-down')) {
                    icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
                } else {
                    icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
                }
            });
        });
    }
    
    // Update PR guidelines chart - account for all guideline metrics
    // Create a Set of non-compliant PR numbers to avoid counting PRs multiple times
    const nonCompliantPRs = new Set();
    
    // Add all PRs that violate any guideline to the set
    exceedsSizeLimit.forEach(pr => nonCompliantPRs.add(pr.number));
    openTooLong.forEach(pr => nonCompliantPRs.add(pr.number));
    slowFirstReview.forEach(pr => nonCompliantPRs.add(pr.number));
    unresolvedComments.forEach(pr => nonCompliantPRs.add(pr.number));
    
    // Get total PR count from the stats data
    const totalPRs = parseInt(document.getElementById('totalPRs').textContent) || 0;
    const nonCompliantCount = nonCompliantPRs.size;
    const compliantCount = totalPRs - nonCompliantCount;
    
    if (charts.sizeGuideline) {
        charts.sizeGuideline.destroy();
    }
    
    const sizeGuidelineCtx = document.getElementById('sizeGuidelineChart').getContext('2d');
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
                    text: 'PR Guidelines Compliance'
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
    
    // Update size guideline summary
    const exceedsSizeCount = prGuidelines?.exceedsSizeLimit?.length || 0;
    const totalPRs = contributorStats.contributors.reduce((sum, c) => sum + c.prCount, 0);
    const complianceRate = totalPRs > 0 ? ((totalPRs - exceedsSizeCount) / totalPRs * 100).toFixed(1) : 100;
    
    const sizeItem = document.createElement('div');
    sizeItem.className = 'mb-3';
    sizeItem.innerHTML = `
        <h6>PR Size Compliance</h6>
        <div class="progress">
            <div class="progress-bar ${exceedsSizeCount > 0 ? 'bg-warning' : 'bg-success'}" role="progressbar" style="width: ${complianceRate}%">
                ${complianceRate}%
            </div>
        </div>
        <small class="text-muted">${totalPRs - exceedsSizeCount} out of ${totalPRs} PRs comply with size guidelines</small>
    `;
    healthSummary.appendChild(sizeItem);
    
    // Calculate health metrics
    // Get counts for all PR guideline metrics
    const openTooLongCount = prGuidelines?.openTooLong?.length || 0;
    const slowFirstReviewCount = prGuidelines?.slowFirstReview?.length || 0;
    const unresolvedCommentsCount = prGuidelines?.unresolvedComments?.length || 0;
    
    const metrics = [
        {
            name: 'PR Guidelines Adherence',
            value: openTooLongCount === 0 && slowFirstReviewCount === 0 && unresolvedCommentsCount === 0 ? 'Good' : 'Needs Improvement',
            status: openTooLongCount === 0 && slowFirstReviewCount === 0 && unresolvedCommentsCount === 0 ? 'success' : 'warning'
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
    
    // Generate recommendations
    const recommendations = document.createElement('div');
    recommendations.innerHTML = '<h5>Recommendations</h5><ul class="list-group">';
    
    // We already have these variables defined above, so we'll reuse them
    // const exceedsSizeCount = prGuidelines?.exceedsSizeLimit?.length || 0;
    if (exceedsSizeCount > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                ${exceedsSizeCount} PRs exceed the recommended size limit of 300 lines.
            </li>
        `;
    }
    
    // We already have this variable defined above
    if (openTooLongCount > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                ${openTooLongCount} PRs have been open for more than 72 hours.
            </li>
        `;
    }
    
    // We already have this variable defined above
    if (slowFirstReviewCount > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-warning">
                <i class="bi bi-exclamation-circle"></i> 
                ${slowFirstReviewCount} PRs had first review taking more than 24 hours.
            </li>
        `;
    }
    
    // We already have this variable defined above
    if (unresolvedCommentsCount > 0) {
        recommendations.innerHTML += `
            <li class="list-group-item list-group-item-danger">
                <i class="bi bi-exclamation-triangle"></i> 
                ${unresolvedCommentsCount} PRs were merged with unresolved comments.
            </li>
        `;
    }
    
    if (exceedsSizeCount === 0 && openTooLongCount === 0 && slowFirstReviewCount === 0 && unresolvedCommentsCount === 0) {
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
        // Initialize PR guidelines data
        const prGuidelines = {
            exceedsSizeLimit: [],
            openTooLong: [],
            slowFirstReview: [],
            unresolvedComments: [],
            potentialSplits: [] // Adding this for backward compatibility
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
            
            // Get PR details for time-based checks
            const prDetails = await mcp0_get_pull_request({
                owner,
                repo,
                pullNumber: pr.number
            });
            
            // Check if PR is open for more than 72 hours
            if (prDetails.state === 'open') {
                const createdAt = new Date(prDetails.created_at);
                const now = new Date();
                const hoursOpen = (now - createdAt) / (1000 * 60 * 60);
                
                if (hoursOpen > 72) {
                    prGuidelines.openTooLong.push({
                        number: pr.number,
                        title: pr.title,
                        hoursOpen: hoursOpen.toFixed(1)
                    });
                }
            }
            
            // Check if first review took more than 24 hours
            const reviews = await mcp0_get_pull_request_reviews({
                owner,
                repo,
                pullNumber: pr.number
            });
            
            if (reviews.length > 0) {
                const createdAt = new Date(prDetails.created_at);
                const firstReviewAt = new Date(reviews[0].submitted_at);
                const hoursToFirstReview = (firstReviewAt - createdAt) / (1000 * 60 * 60);
                
                if (hoursToFirstReview > 24) {
                    prGuidelines.slowFirstReview.push({
                        number: pr.number,
                        title: pr.title,
                        hoursToFirstReview: hoursToFirstReview.toFixed(1)
                    });
                }
            }
            
            // Check if PR was merged with unresolved comments
            if (prDetails.state === 'closed' && prDetails.merged) {
                const comments = await mcp0_get_pull_request_comments({
                    owner,
                    repo,
                    pullNumber: pr.number
                });
                
                if (comments.length > 0) {
                    prGuidelines.unresolvedComments.push({
                        number: pr.number,
                        title: pr.title,
                        commentCount: comments.length
                    });
                }
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
