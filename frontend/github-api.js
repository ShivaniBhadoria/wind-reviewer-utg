/**
 * GitHub API Integration
 * This module provides functions to fetch real GitHub repository data
 */

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch data from GitHub API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data
 */
async function fetchGitHubAPI(endpoint, options = {}) {
  try {
    const url = `${GITHUB_API_BASE}${endpoint}`;
    
    // Default options with authorization
    const fetchOptions = {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      },
      ...options
    };
    
    console.log(`Fetching from GitHub API: ${url}`);
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from GitHub API:', error);
    throw error;
  }
}

/**
 * Fetch repository pull requests
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Pull requests
 */
async function fetchPullRequests(owner, repo) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`);
}

/**
 * Fetch repository commits
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Commits
 */
async function fetchCommits(owner, repo) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}/commits?per_page=100`);
}

/**
 * Fetch pull request details
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - Pull request number
 * @returns {Promise<Object>} - Pull request details
 */
async function fetchPullRequestDetails(owner, repo, pullNumber) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
}

/**
 * Fetch pull request files
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - Pull request number
 * @returns {Promise<Array>} - Files changed in pull request
 */
async function fetchPullRequestFiles(owner, repo, pullNumber) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
}

/**
 * Fetch repository contributors
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Contributors
 */
async function fetchContributors(owner, repo) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}/contributors?per_page=100`);
}

/**
 * Fetch repository details
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository details
 */
async function fetchRepoDetails(owner, repo) {
  return fetchGitHubAPI(`/repos/${owner}/${repo}`);
}

/**
 * Main function to fetch all repository data
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository data
 */
async function fetchRepositoryData(owner, repo) {
  try {
    // Fetch all data in parallel
    const [pullRequests, commits, contributors, repoDetails] = await Promise.all([
      fetchPullRequests(owner, repo),
      fetchCommits(owner, repo),
      fetchContributors(owner, repo),
      fetchRepoDetails(owner, repo)
    ]);
    
    return {
      pullRequests,
      commits,
      contributors,
      repoDetails
    };
  } catch (error) {
    console.error('Error fetching repository data:', error);
    throw error;
  }
}

/**
 * Analyze repository data to generate statistics
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} data - Repository data
 * @returns {Promise<Object>} - Repository statistics
 */
async function analyzeRepositoryData(owner, repo, data) {
  try {
    const { pullRequests, commits, contributors, repoDetails } = data;
    
    // Track contributors, files changed, and other metrics
    const contributorStats = {};
    const filesChanged = {};
    const defectAreas = {};
    const prGuidelines = {
      exceedsSizeLimit: [],
      potentialSplits: []
    };
    
    // Process each PR
    for (const pr of pullRequests) {
      const author = pr.user.login;
      
      // Track contributor stats
      if (!contributorStats[author]) {
        contributorStats[author] = {
          prCount: 0,
          totalLinesChanged: 0,
          avgTimeOpen: 0,
          prs: []
        };
      }
      contributorStats[author].prCount++;
      
      // Calculate time open
      const created = new Date(pr.created_at);
      const closed = pr.closed_at ? new Date(pr.closed_at) : new Date();
      const timeOpenHours = (closed - created) / (1000 * 60 * 60);
      
      // Update average time open for this contributor
      contributorStats[author].avgTimeOpen = 
        (contributorStats[author].avgTimeOpen * (contributorStats[author].prCount - 1) + timeOpenHours) / 
        contributorStats[author].prCount;
      
      // Fetch PR files
      const files = await fetchPullRequestFiles(owner, repo, pr.number);
      
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
      
      contributorStats[author].totalLinesChanged += prLinesChanged;
      contributorStats[author].prs.push({
        number: pr.number,
        title: pr.title,
        linesChanged: prLinesChanged,
        timeOpen: timeOpenHours.toFixed(1)
      });
      
      // Check PR guidelines
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
    
    // Format the statistics
    return {
      contributorStats: {
        contributors: Object.entries(contributorStats).map(([name, stats]) => ({
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
    console.error('Error analyzing repository data:', error);
    throw error;
  }
}

/**
 * Get repository statistics
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository statistics
 */
async function getRepositoryStatistics(owner, repo) {
  try {
    console.log(`Fetching statistics for ${owner}/${repo}...`);
    
    // We're using the main loading indicator now, no need to show a separate one
    
    // Fetch repository data
    const data = await fetchRepositoryData(owner, repo);
    
    // Analyze repository data
    const stats = await analyzeRepositoryData(owner, repo, data);
    
    return stats;
  } catch (error) {
    // Show error
    document.getElementById('error-message').textContent = `Error: ${error.message}`;
    document.getElementById('error-message').style.display = 'block';
    
    console.error('Error getting repository statistics:', error);
    throw error;
  }
}

// Export functions
window.getRepositoryStatistics = getRepositoryStatistics;
