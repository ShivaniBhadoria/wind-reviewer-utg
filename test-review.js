// Test script for PR review functionality
const { Octokit } = require('@octokit/rest');

// This function simulates what the GitHub Action would do
async function testPRReview() {
  // You'll need to provide your GitHub token here for testing
  // NEVER commit this token to your repository
  const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN';
  
  // Test parameters - replace with an actual PR you want to test with
  const owner = 'ShivaniBhadoria';
  const repo = 'ShopPro-Ecommerce'; // One of your repositories
  const prNumber = 1; // Replace with an actual PR number or create a test PR
  
  // Initialize Octokit with GitHub token
  const octokit = new Octokit({
    auth: GITHUB_TOKEN
  });
  
  try {
    console.log(`Starting test review for PR #${prNumber} in ${owner}/${repo}`);
    
    // 1. Check if the PR exists
    console.log('Fetching PR details...');
    try {
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });
      console.log('✅ Successfully fetched PR details');
      console.log(`PR Title: ${pr.title}`);
    } catch (error) {
      console.error('❌ Failed to fetch PR details. Make sure the PR exists.');
      console.error(`Error: ${error.message}`);
      return;
    }
    
    // 2. Get changed files
    console.log('Fetching changed files...');
    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });
      
      console.log(`✅ Found ${files.length} changed files`);
      files.forEach(file => {
        console.log(`- ${file.filename} (${file.additions} additions, ${file.deletions} deletions)`);
      });
      
      // 3. Simulate review analysis
      console.log('\nAnalyzing changes (simulation)...');
      const comments = [];
      
      for (const file of files) {
        // Example: Check for large files
        if (file.additions + file.deletions > 300) {
          comments.push({
            path: file.filename,
            body: "⚠️ This file has many changes (" + (file.additions + file.deletions) + " lines).",
            line: 1
          });
          console.log(`🔍 Found large file: ${file.filename}`);
        }
      }
      
      console.log(`\nFound ${comments.length} potential comments to add`);
      
      // 4. Don't actually submit the review in test mode
      console.log('\n✅ Test completed successfully!');
      console.log('In actual execution, a review would be created with these comments.');
      
    } catch (error) {
      console.error('❌ Failed to fetch or analyze files');
      console.error(`Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testPRReview()
  .then(() => console.log('\nTest completed.'))
  .catch(error => console.error('Test failed:', error));
