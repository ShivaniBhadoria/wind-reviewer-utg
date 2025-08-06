// Script to check token permissions
const https = require('https');

// Replace with your token
const token = process.env.GITHUB_TOKEN || 'YOUR_TOKEN_HERE';

// Function to make a GitHub API request
function makeGitHubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Token-Checker',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } else {
          reject({ statusCode: res.statusCode, data: JSON.parse(data) });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function checkTokenPermissions() {
  console.log('Checking token permissions...');
  
  try {
    // 1. Check user info (basic authentication)
    console.log('\n1. Checking user info...');
    const userInfo = await makeGitHubRequest('/user');
    console.log(`✅ Authenticated as: ${userInfo.data.login}`);
    
    // 2. Check repository access
    const owner = 'ShivaniBhadoria';
    const repo = 'personal-finance-simulator';
    console.log(`\n2. Checking access to ${owner}/${repo}...`);
    try {
      const repoInfo = await makeGitHubRequest(`/repos/${owner}/${repo}`);
      console.log(`✅ Repository access: ${repoInfo.data.full_name}`);
      console.log(`   Permissions:`, repoInfo.data.permissions);
    } catch (error) {
      console.log(`❌ Cannot access repository: ${error.statusCode}`);
      console.log(error.data);
    }
    
    // 3. Check token scopes
    console.log('\n3. Checking token scopes...');
    try {
      const rateLimit = await makeGitHubRequest('/rate_limit');
      // GitHub returns token scopes in the headers, but we can't access those directly here
      // Instead, we'll check what operations we can perform
      
      // 4. Try to list PRs (read access)
      console.log('\n4. Checking PR read access...');
      try {
        const prs = await makeGitHubRequest(`/repos/${owner}/${repo}/pulls`);
        console.log(`✅ Can read PRs: Found ${prs.data.length} PRs`);
      } catch (error) {
        console.log(`❌ Cannot read PRs: ${error.statusCode}`);
      }
      
      // 5. Try to create a comment on an issue (write access)
      console.log('\n5. Checking comment write access...');
      // We'll just check if we can access the comments endpoint
      try {
        const comments = await makeGitHubRequest(`/repos/${owner}/${repo}/issues/2/comments`);
        console.log(`✅ Can read comments: Found ${comments.data.length} comments`);
        console.log('   Note: This doesn\'t guarantee write access');
      } catch (error) {
        console.log(`❌ Cannot access comments: ${error.statusCode}`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking rate limit: ${error.statusCode}`);
    }
    
    console.log('\nToken Permission Summary:');
    console.log('------------------------');
    console.log('To add comments to PRs, your token needs:');
    console.log('1. "repo" scope for classic tokens');
    console.log('2. "pull_requests: write" permission for fine-grained tokens');
    console.log('3. Access to the specific repository');
    console.log('\nIf you have these permissions but still can\'t comment,');
    console.log('check branch protection rules in your repository settings.');
    
  } catch (error) {
    console.error('Error checking token:', error);
  }
}

// Run the check
checkTokenPermissions();
