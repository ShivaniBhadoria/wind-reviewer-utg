#!/usr/bin/env node

/**
 * Direct PR Review Tool
 * This tool allows adding comments directly to a GitHub PR like GitHub Copilot does
 * with line-specific suggestions for code improvements
 */

// Import the PR review functions
const { 
    reviewPullRequest, 
    addLineComment, 
    addFileComment, 
    COMMENT_TYPES 
} = require('./pr-review-tool');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: node direct-pr-review.js <owner> <repo> <pr-number>');
    console.log('Example: node direct-pr-review.js ShivaniBhadoria personal-finance-simulator 1');
    process.exit(1);
}

const [owner, repo, prNumber] = args;

/**
 * Format a date in a human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

/**
 * Find the smallest possible diff between original and suggested code
 * @param {string[]} originalLines - Original code lines
 * @param {string[]} suggestedLines - Suggested code lines
 * @returns {string[]} - Array of lines representing the smallest diff
 */
function findSmallestDiff(originalLines, suggestedLines) {
    // Find first different line
    const firstDiffIndex = findFirstDifferentLineIndex(originalLines, suggestedLines);
    if (firstDiffIndex === -1) return [];
    
    // Find the smallest continuous block of changes
    let endDiffIndex = firstDiffIndex;
    while (endDiffIndex < Math.min(originalLines.length, suggestedLines.length) - 1) {
        if (endDiffIndex + 1 < originalLines.length && 
            endDiffIndex + 1 < suggestedLines.length && 
            originalLines[endDiffIndex + 1] !== suggestedLines[endDiffIndex + 1]) {
            endDiffIndex++;
        } else {
            break;
        }
    }
    
    // Limit to max 3 lines
    const maxLines = 3;
    const diffLength = endDiffIndex - firstDiffIndex + 1;
    
    if (diffLength <= maxLines) {
        return suggestedLines.slice(firstDiffIndex, endDiffIndex + 1);
    } else {
        // If diff is too large, just return the first changed line
        return [suggestedLines[firstDiffIndex]];
    }
}

/**
 * Find the index of the first line that differs between original and suggested code
 * @param {string[]} originalLines - Original code lines
 * @param {string[]} suggestedLines - Suggested code lines
 * @returns {number} - Index of first different line, or -1 if identical
 */
function findFirstDifferentLineIndex(originalLines, suggestedLines) {
    const minLength = Math.min(originalLines.length, suggestedLines.length);
    
    for (let i = 0; i < minLength; i++) {
        if (originalLines[i] !== suggestedLines[i]) {
            return i;
        }
    }
    
    // If we get here, either the arrays are identical up to the shorter one's length,
    // or one array is a prefix of the other
    if (originalLines.length !== suggestedLines.length) {
        return minLength;
    }
    
    return -1; // Arrays are identical
}

/**
 * Extract minimal changes between original and suggested code
 * @param {string[]} originalLines - Original code lines
 * @param {string[]} suggestedLines - Suggested code lines
 * @returns {string} - Minimal changes for GitHub suggestion block
 */
function extractMinimalChanges(originalLines, suggestedLines) {
    // Find common prefix and suffix
    let prefixLength = 0;
    const minLength = Math.min(originalLines.length, suggestedLines.length);
    
    // Find common prefix
    while (prefixLength < minLength && 
           originalLines[prefixLength] === suggestedLines[prefixLength]) {
        prefixLength++;
    }
    
    // Find common suffix
    let suffixLength = 0;
    while (suffixLength < minLength - prefixLength && 
           originalLines[originalLines.length - 1 - suffixLength] === 
           suggestedLines[suggestedLines.length - 1 - suffixLength]) {
        suffixLength++;
    }
    
    // Extract the changed lines
    const originalChanged = originalLines.slice(
        prefixLength, 
        originalLines.length - suffixLength
    );
    
    const suggestedChanged = suggestedLines.slice(
        prefixLength, 
        suggestedLines.length - suffixLength
    );
    
    // If there are no changes, return the original
    if (originalChanged.length === 0 && suggestedChanged.length === 0) {
        return suggestedLines.join('\n');
    }
    
    // Include one line of context before and after if available
    const startContext = Math.max(0, prefixLength - 1);
    const endContextOriginal = Math.min(originalLines.length, originalLines.length - suffixLength + 1);
    const endContextSuggested = Math.min(suggestedLines.length, suggestedLines.length - suffixLength + 1);
    
    const finalOriginal = originalLines.slice(startContext, endContextOriginal);
    const finalSuggested = suggestedLines.slice(startContext, endContextSuggested);
    
    // Return the suggested version with minimal changes
    return finalSuggested.join('\n');
}

/**
 * Add direct comments to a PR
 */
async function addDirectPRComments(owner, repo, prNumber) {
    try {
        console.log(`Adding direct comments to PR #${prNumber} in ${owner}/${repo}`);
        
        // Use the GitHub MCP server tools directly if available
        const { 
            mcp0_get_pull_request, 
            mcp0_get_pull_request_files, 
            mcp0_get_pull_request_diff,
            mcp0_create_pending_pull_request_review, 
            mcp0_add_comment_to_pending_review,
            mcp0_submit_pending_pull_request_review,
            mcp0_create_and_submit_pull_request_review
        } = global.mcp || {};
        
        // Check if we have access to the MCP tools
        if (!mcp0_get_pull_request) {
            console.error('GitHub MCP server tools are not available. Make sure the GitHub MCP server is running.');
            process.exit(1);
        }
        
        // 1. Get PR details
        console.log('Getting PR details...');
        const pr = await mcp0_get_pull_request({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        console.log(`PR Title: ${pr.title}`);
        
        // 2. Get PR files
        console.log('Getting PR files...');
        const files = await mcp0_get_pull_request_files({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        console.log(`Found ${files.length} changed files`);
        
        // 3. Get PR diff
        console.log('Getting PR diff...');
        const diff = await mcp0_get_pull_request_diff({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        
        // 4. Create a pending review
        console.log('Creating pending review...');
        const review = await mcp0_create_pending_pull_request_review({
            owner,
            repo,
            pullNumber: parseInt(prNumber)
        });
        
        const author = pr.user.login;
        const prOpenedDate = formatDate(pr.created_at);
        
        console.log(`PR Author: ${author}`);
        console.log(`PR Opened: ${prOpenedDate}`);
        
        // Calculate PR changes
        const currentPRAdditions = files.reduce((sum, file) => sum + file.additions, 0);
        const currentPRDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
        const currentPRChanges = currentPRAdditions + currentPRDeletions;
        
        console.log(`Lines changed in this PR: ${currentPRChanges} (${currentPRAdditions} additions, ${currentPRDeletions} deletions)`);
        
        // 6. Analyze code changes and generate comments
        console.log('Analyzing code changes and generating comments...');
        const comments = [];
        
        // Helper function to format comments in the requested format - SonarQube style
        function formatComment({ issue, context, suggestion, codeExamples, lineSuggestions, lineContent, actionItems, tldr }) {
            // Start with the issue description
            let comment = `**Issue:** ${issue || ''}\n\n`;
            
            // Add context if provided
            if (context) {
                comment += `**Context:** ${context}\n\n`;
            }
            
            // Add suggestion if provided
            if (suggestion) {
                comment += `**Suggestion:** ${suggestion}\n\n`;
            }
            
            // Add code examples if provided
            if (codeExamples && codeExamples.length > 0) {
                comment += `**Code Examples:**\n\n`;
                codeExamples.forEach(example => {
                    comment += `\`\`\`javascript\n${example}\n\`\`\`\n\n`;
                });
            }
            
            // Add multiple GitHub suggestion blocks if provided
            if (lineSuggestions && lineContent) {
                comment += `**GitHub Suggestions:**\n\n`;
                const originalLines = lineContent.trim().split('\n');
                const suggestionKeys = Object.keys(lineSuggestions);
                
                // If we have multiple suggestions, add them all with labels
                if (suggestionKeys.length > 1) {
                    suggestionKeys.forEach((key, index) => {
                        const suggestedLines = lineSuggestions[key].trim().split('\n');
                        
                        // Find the exact line that needs changing
                        let targetLineIndex = -1;
                        let contextLinesBefore = 0;
                        let contextLinesAfter = 0;
                        
                        // First try to find the exact line containing the key
                        for (let i = 0; i < originalLines.length; i++) {
                            if (originalLines[i].includes(key)) {
                                targetLineIndex = i;
                                break;
                            }
                        }
                        
                        // If we found the target line, create a micro-suggestion with minimal context
                        if (targetLineIndex >= 0) {
                            // Determine how many context lines to include (0-1 lines of context)
                            contextLinesBefore = Math.min(1, targetLineIndex);
                            contextLinesAfter = Math.min(1, originalLines.length - targetLineIndex - 1);
                            
                            // Extract just the specific line and minimal context
                            const startLine = targetLineIndex - contextLinesBefore;
                            const endLine = targetLineIndex + contextLinesAfter;
                            
                            // Create minimal original and suggested code blocks
                            const minimalOriginal = originalLines.slice(startLine, endLine + 1).join('\n');
                            const minimalSuggested = suggestedLines.slice(startLine, endLine + 1).join('\n');
                            
                            comment += `**Option ${index + 1}:**\n`;
                            comment += `\`\`\`suggestion\n${minimalSuggested}\n\`\`\`\n\n`;
                        } else {
                            // If we can't find the exact line, find the smallest possible diff
                            const diffLines = findSmallestDiff(originalLines, suggestedLines);
                            if (diffLines.length > 0 && diffLines.length <= 3) {
                                // Use the small diff if it's 3 lines or fewer
                                comment += `**Option ${index + 1}:**\n`;
                                comment += `\`\`\`suggestion\n${diffLines.join('\n')}\n\`\`\`\n\n`;
                            } else {
                                // Fallback to single line change if diff is too large
                                const firstDiffIndex = findFirstDifferentLineIndex(originalLines, suggestedLines);
                                if (firstDiffIndex >= 0 && firstDiffIndex < suggestedLines.length) {
                                    comment += `**Option ${index + 1}:**\n`;
                                    comment += `\`\`\`suggestion\n${suggestedLines[firstDiffIndex]}\n\`\`\`\n\n`;
                                } else {
                                    // Last resort - use minimal changes but limit to 3 lines max
                                    const minimalSuggestion = extractMinimalChanges(originalLines, suggestedLines);
                                    const limitedSuggestion = minimalSuggestion.split('\n').slice(0, 3).join('\n');
                                    
                                    comment += `**Option ${index + 1}:**\n`;
                                    comment += `\`\`\`suggestion\n${limitedSuggestion}\n\`\`\`\n\n`;
                                }
                            }
                        }
                    });
                    
                    // Add explanation about the suggestion blocks
                    comment += `*You can commit any suggestion directly by clicking its commit button, add it to a batch of changes, or reject it by clicking the "Don't commit" button.*\n\n`;
                    comment += `*To apply multiple suggestions as a single commit, use "Add suggestion to batch" for each suggestion you want to include, then commit the batch.*\n\n`;
                } else if (suggestionKeys.length === 1) {
                    // Just one suggestion - make it ultra-focused
                    const key = suggestionKeys[0];
                    const suggestedLines = lineSuggestions[key].trim().split('\n');
                    
                    // Find the exact line that needs changing
                    let targetLineIndex = -1;
                    
                    // First try to find the exact line containing the key
                    for (let i = 0; i < originalLines.length; i++) {
                        if (originalLines[i].includes(key)) {
                            targetLineIndex = i;
                            break;
                        }
                    }
                    
                    // If we found the target line, create a micro-suggestion
                    if (targetLineIndex >= 0 && targetLineIndex < suggestedLines.length) {
                        // Just use the single line that needs changing
                        const suggestedLine = suggestedLines[targetLineIndex];
                        comment += `\`\`\`suggestion\n${suggestedLine}\n\`\`\`\n\n`;
                    } else {
                        // Find the smallest possible diff (max 3 lines)
                        const diffLines = findSmallestDiff(originalLines, suggestedLines);
                        if (diffLines.length > 0 && diffLines.length <= 3) {
                            comment += `\`\`\`suggestion\n${diffLines.join('\n')}\n\`\`\`\n\n`;
                        } else {
                            // Fallback to single line change
                            const firstDiffIndex = findFirstDifferentLineIndex(originalLines, suggestedLines);
                            if (firstDiffIndex >= 0 && firstDiffIndex < suggestedLines.length) {
                                comment += `\`\`\`suggestion\n${suggestedLines[firstDiffIndex]}\n\`\`\`\n\n`;
                            } else {
                                // Last resort - use minimal changes but limit to 3 lines max
                                const minimalSuggestion = extractMinimalChanges(originalLines, suggestedLines);
                                const limitedSuggestion = minimalSuggestion.split('\n').slice(0, 3).join('\n');
                                comment += `\`\`\`suggestion\n${limitedSuggestion}\n\`\`\`\n\n`;
                            }
                        }
                    }
                    
                    comment += `*You can commit this suggestion directly by clicking the commit button above, or reject it by clicking the "Don't commit" button.*\n\n`;
                }
            }
            
            // Add additional code examples if they weren't already included above
            // and weren't converted to GitHub suggestion blocks
            if (codeExamples && (!lineSuggestions || Object.keys(lineSuggestions).length === 0)) {
                // Handle both string and array formats
                const examples = Array.isArray(codeExamples) ? codeExamples : [codeExamples];
                
                // Only show option labels if there are multiple valid approaches
                const showOptions = examples.length > 1;
                
                if (showOptions) {
                    comment += `**Additional Examples:**\n\n`;
                }
                
                examples.forEach((example, index) => {
                    if (showOptions) {
                        comment += `**Option ${index + 1}:**\n`;
                    }
                    comment += `\`\`\`javascript\n${example}\n\`\`\`\n\n`;
                });
            }
            
            // Add action items without checkboxes
            if (actionItems && actionItems.length > 0) {
                comment += `**Action Items:**\n`;
                actionItems.forEach(item => {
                    comment += `- ${item}\n`;
                });
                comment += '\n';
            }
            
            // Add TLDR for longer comments
            if (tldr && (comment.length > 500 || comment.split('\n').length > 10)) {
                comment += `**TLDR:** ${tldr}`;
            }
            
            return comment.trim();
        }
        
        // Analyze changed files
        for (const file of files) {
            // Look for common issues in JavaScript files
            if (file.filename.endsWith('.js')) {
                // Analyze code patterns and add structured comments - SonarQube style
                const codePatterns = [
                    {
                        pattern: 'confirm(',
                        issue: 'Using browser\'s native confirm() dialog lacks proper accessibility support (WCAG 2.1)',
                        context: 'Native browser dialogs cannot be styled, lack keyboard navigation control, and are not properly announced by screen readers. This creates barriers for users with disabilities and fails WCAG 2.1 success criteria 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).',
                        suggestion: 'Replace with a custom dialog component with proper ARIA attributes',
                        codeExamples: [
                            `showAccessibleConfirmDialog('Are you sure?', () => {\n  // action on confirm\n});`,
                            `// Promise-based API for more complex flows\nshowConfirmDialog('Are you sure?')\n  .then(() => {\n    // action on confirm\n  })\n  .catch(() => {\n    // action on cancel\n  });`
                        ],
                        // Line-specific suggestions for GitHub suggestion blocks
                        lineSuggestions: {
                            'if (confirm': `if (showAccessibleConfirmDialog`,
                            'confirm(': `showAccessibleConfirmDialog(`,
                        },
                        actionItems: ['Replace native confirm() with accessible custom dialog'],
                        tldr: 'Replace confirm() with accessible dialog for WCAG compliance'
                    },
                    {
                        pattern: 'console.log(',
                        issue: 'Development console.log statements in production code',
                        context: 'Console statements are meant for debugging during development and should not be included in production code. They can expose sensitive information, impact performance, and create noise in browser consoles.',
                        suggestion: 'Remove console statements or use a proper logging library with configurable log levels',
                        codeExamples: `logger.debug('Debug info', { level: 'development' });`,
                        // Line-specific suggestions for GitHub suggestion blocks
                        lineSuggestions: {
                            'console.log': `logger.debug`,
                        },
                        actionItems: ['Remove console.log or replace with proper logging'],
                        tldr: 'Remove debug logs from production code'
                    },
                    {
                        pattern: /TODO|FIXME/,
                        issue: 'TODO/FIXME comments in production code',
                        context: 'TODO and FIXME comments indicate incomplete work or known issues that should be addressed before code is merged to production. Leaving these comments in the codebase creates technical debt and can lead to forgotten issues.',
                        suggestion: 'Address these comments before merging or create proper tracking issues in your issue management system',
                        codeExamples: `// Create a tracking issue instead\n// See issue #123: Implement feature X`,
                        // Line-specific suggestions for GitHub suggestion blocks
                        lineSuggestions: {
                            'TODO': `// See issue #123:`,
                            'FIXME': `// See issue #123:`,
                        },
                        actionItems: ['Address TODO/FIXME comments or create tracking issues'],
                        tldr: 'Resolve or track TODO comments'
                    },
                    {
                        pattern: 'document.getElementById',
                        issue: 'Unhandled DOM element access',
                        context: 'Direct DOM access without checking if elements exist can lead to runtime errors if the element is not found. This is particularly problematic in dynamic applications where the DOM structure might change.',
                        suggestion: 'Add proper error handling for DOM operations',
                        codeExamples: `const element = document.getElementById('element-id');\nif (element) {\n  element.addEventListener('click', handleClick);\n} else {\n  console.error('Element not found: element-id');\n}`,
                        // Line-specific suggestions for GitHub suggestion blocks
                        lineSuggestions: {
                            'document.getElementById': `const element = document.getElementById`,
                            '.addEventListener': `if (element) {\n  element.addEventListener`,
                        },
                        actionItems: ['Add null checks for DOM element access', 'Consider using a utility function for safe element selection'],
                        tldr: 'Add error handling for DOM element access'
                    },
                    {
                        pattern: /querySelector.*\(.*\)/,
                        issue: 'Potential performance issue with repeated DOM queries',
                        context: 'Repeatedly querying the DOM for the same elements can impact performance, especially in event handlers or loops. DOM queries are expensive operations that should be minimized.',
                        suggestion: 'Cache DOM references when elements are used multiple times',
                        codeExamples: `// Cache DOM references\nconst form = document.getElementById('form');\nconst submitButton = form.querySelector('.submit');\n\n// Use cached references\nsubmitButton.addEventListener('click', () => {\n  // Use form and submitButton\n});`,
                        // Line-specific suggestions for GitHub suggestion blocks
                        lineSuggestions: {
                            'querySelector': `// Cache this reference outside the function\nconst element = document.querySelector`,
                        },
                        actionItems: ['Cache DOM references outside of functions/loops', 'Use event delegation for dynamic elements'],
                        tldr: 'Cache DOM references for better performance'
                    }
                ];

                // For each pattern, scan the diff for all occurrences and add a comment for each
                const diffLines = diff.split('\n');
                for (const pattern of codePatterns) {
                    const isRegex = pattern.pattern instanceof RegExp;
                    diffLines.forEach((line, idx) => {
                        const match = isRegex ? pattern.pattern.test(line) : line.includes(pattern.pattern);
                        if (match) {
                            const commentObj = {
                                issue: pattern.issue,
                                context: pattern.context,
                                suggestion: pattern.suggestion,
                                codeExamples: pattern.codeExamples,
                                lineSuggestions: pattern.lineSuggestions,
                                lineContent: line, // Pass the current line content
                                actionItems: pattern.actionItems,
                                tldr: pattern.tldr
                            };
                            const comment = formatComment(commentObj);
                            mcp0_add_comment_to_pending_review && mcp0_add_comment_to_pending_review({
                                owner,
                                repo,
                                pullNumber: parseInt(prNumber),
                                body: comment,
                                path: file.filename,
                                side: 'RIGHT',
                                line: idx + 1 // diff lines are 1-based for GitHub API
                            });
                            comments.push(comment);
                        }
                    });
                }

                // Issue 2: Missing form validation
                if (diff.includes('addEventListener') && diff.includes('cancel')) {
                    const comment2 = formatComment(
                        "The cancel button handler doesn't validate form state before closing",
                        "Add form validation before allowing cancel to prevent accidental data loss",
                        "Add form validation to prevent data loss"
                    );
                    await mcp0_add_comment_to_pending_review({
                        owner,
                        repo,
                        pullNumber: parseInt(prNumber),
                        body: comment2,
                        path: file.filename,
                        side: 'RIGHT',
                        line: diff.indexOf('cancel')
                    });
                    comments.push(comment2);
                }
            }
        }
        
        // Process each file
        for (const file of files) {
            // Example: Check for large files
            if (file.additions + file.deletions > 300) {
                await addFileComment(
                    owner, 
                    repo, 
                    parseInt(prNumber), 
                    file.filename, 
                    `This file has many changes (${file.additions + file.deletions} lines). Consider breaking it into smaller, more focused files for better maintainability.`,
                    COMMENT_TYPES.WARNING
                );
                comments.push({
                    path: file.filename,
                    body: `This file has many changes (${file.additions + file.deletions} lines).`,
                    type: COMMENT_TYPES.WARNING
                });
            }
            
            // Check for specific file types
            if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx')) {
                // Check for console.log statements
                if (file.patch && file.patch.includes('console.log')) {
                    await addFileComment(
                        owner, 
                        repo, 
                        parseInt(prNumber), 
                        file.filename, 
                        "There are console.log statements in this file. Consider removing them before merging.",
                        COMMENT_TYPES.NITPICK
                    );
                    comments.push({
                        path: file.filename,
                        body: "There are console.log statements in this file.",
                        type: COMMENT_TYPES.NITPICK
                    });
                }
                
                // Check for TODO/FIXME comments
                if (file.patch && (file.patch.includes('TODO') || file.patch.includes('FIXME'))) {
                    await addFileComment(
                        owner, 
                        repo, 
                        parseInt(prNumber), 
                        file.filename, 
                        "There are TODO/FIXME comments in this file. Consider addressing them before merging.",
                        COMMENT_TYPES.WARNING
                    );
                    comments.push({
                        path: file.filename,
                        body: "There are TODO/FIXME comments in this file.",
                        type: COMMENT_TYPES.WARNING
                    });
                }
                
                // Check for potential security issues
                if (file.patch && file.patch.match(/password|secret|token|key/i)) {
                    await addFileComment(
                        owner, 
                        repo, 
                        parseInt(prNumber), 
                        file.filename, 
                        "This file might contain sensitive information. Make sure it's not exposing any secrets.",
                        COMMENT_TYPES.SECURITY
                    );
                    comments.push({
                        path: file.filename,
                        body: "This file might contain sensitive information.",
                        type: COMMENT_TYPES.SECURITY
                    });
                }
            }
            
            // Check for JSON files
            if (file.filename.endsWith('.json')) {
                await addFileComment(
                    owner, 
                    repo, 
                    parseInt(prNumber), 
                    file.filename, 
                    "Changes to JSON files detected. Please ensure the JSON is valid and properly formatted.",
                    COMMENT_TYPES.BEST_PRACTICE
                );
                comments.push({
                    path: file.filename,
                    body: "Changes to JSON files detected.",
                    type: COMMENT_TYPES.BEST_PRACTICE
                });
            }
        }

        // 7. Submit the review with comments
        console.log(`Submitting review with ${comments.length} comments...`);
        
        // Generate a balanced PR review summary
        let reviewSummary = "";
        if (comments.length > 0) {
            // Group comments by category
            const categories = {};
            const impactAreas = new Set();
            
            comments.forEach(comment => {
                // Extract category from the first line (assumes format "**Issue:** Category - Description")
                const firstLine = comment.body.split('\n')[0] || '';
                const match = firstLine.match(/\*\*Issue:\*\*\s*(.*)/i);
                let category = 'General';
                
                if (match && match[1]) {
                    // Extract main category (before any colon or dash)
                    category = match[1].split(/[-:]/)[0].trim();
                }
                
                // Track file path to determine impact areas
                const filePath = comment.path || '';
                if (filePath.includes('/css/')) {
                    impactAreas.add('UI/Styling');
                } else if (filePath.includes('/js/')) {
                    impactAreas.add('JavaScript');
                } else if (filePath.includes('.html')) {
                    impactAreas.add('HTML');
                }
                
                if (!categories[category]) {
                    categories[category] = 0;
                }
                categories[category]++;
            });
            
            // Build balanced summary
            // reviewSummary = `## PR Review Summary\n\n`;
            
            // Add overview sentence
            const categoryCount = Object.keys(categories).length;
            const impactList = Array.from(impactAreas).join(', ');
            
            reviewSummary += `I've reviewed the changes and found **${comments.length}** suggestions across ${categoryCount} categories, `;
            reviewSummary += `primarily affecting ${impactList}.\n\n`;
            
            // Add category breakdown
            reviewSummary += `### Suggestions by Category\n`;
            Object.keys(categories).sort().forEach(category => {
                reviewSummary += `- **${category}**: ${categories[category]} suggestion${categories[category] > 1 ? 's' : ''}\n`;
            });
            
            // Add brief instruction
            reviewSummary += '\n### How to Apply\nEach suggestion includes a GitHub suggestion block that can be directly committed or batched with others.';
        } else {
            reviewSummary = "## PR Review\n\n✅ Looks good! No issues found in this review.";
        }
        
        await mcp0_submit_pending_pull_request_review({
            owner,
            repo,
            pullNumber: parseInt(prNumber),
            event: comments.length > 0 ? "COMMENT" : "APPROVE",
            body: reviewSummary
        });
        
        console.log('PR review submitted successfully!');
    } catch (error) {
        console.error('Failed to add comments:', error);
        process.exit(1);
    }
}

// Run the function to add direct comments to the PR
addDirectPRComments(owner, repo, parseInt(prNumber))
    .then(() => console.log('PR review process completed successfully!'))
    .catch(error => {
        console.error('PR review process failed:', error);
        process.exit(1);
    });
