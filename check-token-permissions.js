// This script checks what permissions your GitHub token has
// It tests various operations to see what's allowed

// Import the necessary tools from global.mcp
// Note: This script must be run within the Windsurf IDE environment

// Configuration
const config = {
  owner: 'ShivaniBhadoria',
  repo: 'personal-finance-simulator',
  prNumber: 2 // Using PR #2 for testing
};

// Helper function to run a test and log the result
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = await testFn();
    console.log(`✅ Success: ${name}`);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Failed: ${name}`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error };
  }
}

// Main function to check token permissions
async function checkTokenPermissions() {
  console.log('Checking GitHub token permissions...');
  
  // Check if MCP tools are available
  if (!global.mcp) {
    console.error('GitHub MCP server tools are not available.');
    console.error('This script must be run within the Windsurf IDE environment.');
    return;
  }
  
  // Extract the MCP tools we need
  const {
    mcp0_get_me,
    mcp0_get_pull_request,
    mcp0_get_pull_request_files,
    mcp0_add_issue_comment,
    mcp0_create_pending_pull_request_review,
    mcp0_add_comment_to_pending_review,
    mcp0_submit_pending_pull_request_review
  } = global.mcp;
  
  // Test 1: Get user info (basic authentication test)
  const userTest = await runTest('Get user info', async () => {
    const user = await mcp0_get_me();
    console.log(`   Authenticated as: ${user.login}`);
    return user;
  });
  
  // Test 2: Get PR details (read access test)
  const prTest = await runTest('Get PR details', async () => {
    const pr = await mcp0_get_pull_request({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber
    });
    console.log(`   PR Title: ${pr.title}`);
    return pr;
  });
  
  // Test 3: Get PR files (read access test)
  const filesTest = await runTest('Get PR files', async () => {
    const files = await mcp0_get_pull_request_files({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber
    });
    console.log(`   Files changed: ${files.length}`);
    return files;
  });
  
  // Test 4: Add issue comment (write access test)
  const commentTest = await runTest('Add issue comment', async () => {
    const comment = await mcp0_add_issue_comment({
      owner: config.owner,
      repo: config.repo,
      issue_number: config.prNumber,
      body: `Test comment from permission checker at ${new Date().toISOString()}`
    });
    console.log(`   Comment added with ID: ${comment.id}`);
    return comment;
  });
  
  // Test 5: Create pending review (write access test)
  let reviewId = null;
  const pendingReviewTest = await runTest('Create pending review', async () => {
    if (!prTest.success) {
      throw new Error('Cannot create review without PR details');
    }
    
    const review = await mcp0_create_pending_pull_request_review({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber,
      commitID: prTest.result.head.sha
    });
    reviewId = review.id;
    console.log(`   Pending review created with ID: ${review.id}`);
    return review;
  });
  
  // Test 6: Add review comment (write access test)
  const reviewCommentTest = await runTest('Add review comment', async () => {
    if (!pendingReviewTest.success || !filesTest.success || filesTest.result.length === 0) {
      throw new Error('Cannot add review comment without pending review or files');
    }
    
    const file = filesTest.result[0];
    const comment = await mcp0_add_comment_to_pending_review({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber,
      path: file.filename,
      body: `Test review comment from permission checker at ${new Date().toISOString()}`,
      subjectType: "FILE",
      side: "RIGHT"
    });
    console.log(`   Review comment added`);
    return comment;
  });
  
  // Test 7: Submit review (write access test)
  const submitReviewTest = await runTest('Submit review', async () => {
    if (!pendingReviewTest.success) {
      throw new Error('Cannot submit review without pending review');
    }
    
    const result = await mcp0_submit_pending_pull_request_review({
      owner: config.owner,
      repo: config.repo,
      pullNumber: config.prNumber,
      event: "COMMENT",
      body: `Test review from permission checker at ${new Date().toISOString()}`
    });
    console.log(`   Review submitted successfully`);
    return result;
  });
  
  // Summary of permissions
  console.log('\n📋 Permission Summary:');
  console.log('-------------------');
  console.log(`User Authentication: ${userTest.success ? '✅' : '❌'}`);
  console.log(`Read PR Details: ${prTest.success ? '✅' : '❌'}`);
  console.log(`Read PR Files: ${filesTest.success ? '✅' : '❌'}`);
  console.log(`Add Issue Comments: ${commentTest.success ? '✅' : '❌'}`);
  console.log(`Create PR Reviews: ${pendingReviewTest.success ? '✅' : '❌'}`);
  console.log(`Add Review Comments: ${reviewCommentTest.success ? '✅' : '❌'}`);
  console.log(`Submit Reviews: ${submitReviewTest.success ? '✅' : '❌'}`);
  
  if (pendingReviewTest.success && !submitReviewTest.success) {
    console.log('\n⚠️ Warning: A pending review was created but not submitted.');
    console.log('   This might leave an orphaned pending review.');
  }
  
  console.log('\n🔍 Recommendation:');
  if (!commentTest.success || !pendingReviewTest.success || !reviewCommentTest.success || !submitReviewTest.success) {
    console.log('Your token appears to be missing write permissions for pull requests.');
    console.log('For a classic token, make sure you have the "repo" scope enabled.');
    console.log('For a fine-grained token, ensure "Pull requests" permission is set to "Read and write".');
  } else {
    console.log('Your token has all the necessary permissions for PR reviews!');
    console.log('You can now use the PR review tool with this token.');
  }
}

// Run the permission check
checkTokenPermissions();
