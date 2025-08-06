/**
 * GitHub Repository Statistics
 * This script fetches and analyzes repository statistics from GitHub
 */

// Function to fetch repository data using GitHub API
async function fetchRepositoryData(owner, repo) {
  try {
    console.log('Fetching data using MCP tools for', owner, repo);
    
    // 1. Get all PRs in the repository
    const prs = await window.mcp0_search_pull_requests({
      query: `repo:${owner}/${repo} is:pr`,
      perPage: 100
    });
    console.log('PRs fetched:', prs);

    // 2. Get all commits
    const commits = await window.mcp0_list_commits({
      owner,
      repo,
      perPage: 100
    });
    console.log('Commits fetched:', commits);

    return {
      prs: prs.items || [],
      commits: commits || [],
      repoDetails: { name: repo, owner: { login: owner } }
    };
  } catch (error) {
    console.error('Error fetching repository data:', error);
    throw error;
  }
}

// Function to analyze PR data
async function analyzePRs(owner, repo, prs) {
  // Track contributors, files changed, and other metrics
  const contributors = {};
  const filesChanged = {};
  const defectAreas = {};
  const prGuidelines = {
    exceedsSizeLimit: [],
    potentialSplits: []
  };

  // Process each PR
  for (const pr of prs) {
    const author = pr.user.login;
    
    // Track contributor stats
    if (!contributors[author]) {
      contributors[author] = {
        prCount: 0,
        totalLinesChanged: 0,
        avgTimeOpen: 0,
        prs: []
      };
    }
    contributors[author].prCount++;
    
    // Calculate time open
    const created = new Date(pr.created_at);
    const closed = pr.closed_at ? new Date(pr.closed_at) : new Date();
    const timeOpenHours = (closed - created) / (1000 * 60 * 60);
    
    // Update average time open for this contributor
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

  return {
    contributors,
    filesChanged,
    defectAreas,
    prGuidelines
  };
}

// Main function to get repository statistics
async function getRepositoryStatistics(owner, repo) {
  try {
    console.log(`Fetching statistics for ${owner}/${repo}...`);
    
    // Show loading message
    document.getElementById('loading-message').textContent = 'Fetching repository data...';
    document.getElementById('loading-indicator').style.display = 'block';
    
    // Fetch repository data
    const { prs, commits, repoDetails } = await fetchRepositoryData(owner, repo);
    
    document.getElementById('loading-message').textContent = 'Analyzing pull requests...';
    
    // Analyze PR data
    const { contributors, filesChanged, defectAreas, prGuidelines } = await analyzePRs(owner, repo, prs);
    
    // Format the statistics
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
    
    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';
    
    return stats;
  } catch (error) {
    // Hide loading indicator and show error
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('error-message').textContent = `Error: ${error.message}`;
    document.getElementById('error-message').style.display = 'block';
    
    console.error('Error getting repository statistics:', error);
    throw error;
  }
}

// Expose the function globally
window.getRepositoryStatistics = getRepositoryStatistics;
