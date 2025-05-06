[⚠️ Suspicious Content] document.addEventListener('DOMContentLoaded', () => {
    // API key for Apify - hardcoded for simplicity in this demo
    const API_KEY = 'apify_api_kizrZrYx87YfMJ1ULhzCj8Mb4tpAsq3csYQV';
    
    // PRE-SELECTED WINNERS: Add usernames here to guarantee they'll be selected as winners
    // Leave as empty array [] for normal random selection
    // If there are more names here than winners requested, it will randomly select from this list
    // If there are fewer names here than winners requested, remaining winners will be random
    const GUARANTEED_WINNERS = [ 'tapan' , 'gupta' , 'wins' ];
    
    // Index to track which guaranteed winner to display next
    let currentGuaranteedWinnerIndex = 0;
    
    // Predefined comments for guaranteed winners
    const PREDEFINED_COMMENTS = [
        "I hope I win! 🙏",
        "This is amazing! Count me in!",
        "I'd love to win this! 😍",
        "Pick me please! 🤞",
        "I never win anything but here goes nothing!",
        "Fingers crossed! 🤞",
        "Let's goooo! 🔥",
        "This would be a dream come true!",
        "I've been waiting for this giveaway!",
        "Wow, awesome giveaway! ✨",
        "This is exactly what I've been looking for!",
        "I'm so excited for this!",
        "Thanks for the opportunity! 🙌",
        "Would love to win this!",
        "Yes please! 💯"
    ];
    
    // DOM Elements
    const fetchBtn = document.getElementById('fetch-btn');
    const instagramUrlInput = document.getElementById('instagram-url');
    const loadingElement = document.getElementById('loading');
    const errorMessageElement = document.getElementById('error-message');
    const commentsContainer = document.getElementById('comments-container');
    const commentsCountElement = document.getElementById('comments-count');
    const noCommentsElement = document.getElementById('no-comments');
    const postInfoElement = document.getElementById('post-info');
    const postAuthorElement = document.getElementById('post-author');
    const postAuthorAvatarElement = document.getElementById('post-author-avatar');
    const postCaptionElement = document.getElementById('post-caption');
    const postLikesElement = document.getElementById('post-likes');
    const postCommentsCountElement = document.getElementById('post-comments-count');
    
    // Giveaway Elements
    const giveawayControlsElement = document.getElementById('giveaway-controls');
    const winnersCountInput = document.getElementById('winners-count');
    const selectWinnersBtn = document.getElementById('select-winners-btn');
    const winnersContainer = document.getElementById('winners-container');
    const winnersListElement = document.getElementById('winners-list');
    const confettiCanvas = document.getElementById('confetti-canvas');
    
    // Store fetched comments globally for winner selection
    let fetchedComments = [];

    // Event Listeners
    fetchBtn.addEventListener('click', fetchComments);
    instagramUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            fetchComments();
        }
    });
    
    // Add event listener for the select winners button
    selectWinnersBtn.addEventListener('click', selectRandomWinners);

    // Handle API errors with detailed messages
    function handleApiError(error, response) {
        console.error('API Error:', error);
        let errorMessage = 'Failed to fetch comments. ';
        
        if (response) {
            try {
                errorMessage += `Status: ${response.status} - ${response.statusText}`;
            } catch (e) {
                errorMessage += 'Unknown error occurred.';
            }
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        showError(errorMessage);
    }

    // Main function to fetch comments
    async function fetchComments() {
        const instagramUrl = instagramUrlInput.value.trim();
        
        if (!instagramUrl) {
            showError('Please enter an Instagram post URL');
            return;
        }
        
        if (!isValidInstagramUrl(instagramUrl)) {
            showError('Please enter a valid Instagram post or reel URL (e.g., https://www.instagram.com/p/ABC123/ or https://www.instagram.com/reel/XYZ789/)');
            return;
        }
        
        // Reset previous results
        commentsContainer.innerHTML = '';
        winnersListElement.innerHTML = '';
        hideError();
        showLoading();
        noCommentsElement.style.display = 'none';
        postInfoElement.style.display = 'none';
        winnersContainer.style.display = 'none';
        
        // Clear previous comments
        fetchedComments = [];
        
        // Show the giveaway controls immediately
        giveawayControlsElement.style.display = 'block';
        
        // Start fetching in the background
        fetchCommentsInBackground(instagramUrl);
    }
    
    // Fetch comments in the background
    async function fetchCommentsInBackground(instagramUrl) {
        try {
            // Don't show loading indicator to the user
            // Instead, let them interact with the giveaway controls immediately
            hideLoading();

            // First, start the scraper run
            const startRunResponse = await startApifyRun(instagramUrl);
            console.log('Run started:', startRunResponse);
            
            if (!startRunResponse.data || !startRunResponse.data.id) {
                throw new Error('Invalid response from Apify API');
            }
            
            const runId = startRunResponse.data.id;
            
            // Update giveaway info text to be clean and simple
            const giveawayInfoText = document.querySelector('.giveaway-info span');
            giveawayInfoText.innerHTML = `Enter how many winners you want to pick.`;
            
            // Poll for completion
            const runData = await pollForRunCompletion(runId);
            console.log('Run completed:', runData);
            
            if (runData.status === 'SUCCEEDED') {
                // Get the dataset items
                const datasetId = runData.defaultDatasetId;
                const comments = await getDatasetItems(datasetId);
                
                // Store comments for winner selection
                // Use a universal parser for both reels and posts
                fetchedComments = comments
                    .filter(item => {
                        // Keep only items that have at least username and text
                        const hasUsername = item.ownerUsername || item.username || 
                                        (item.owner && item.owner.username) || 
                                        (item.commenter && item.commenter.username);
                        const hasText = item.text || item.comment || item.content;
                        return hasUsername && hasText;
                    })
                    .map(item => {
                        // Process profile picture with careful validation
                        let profilePic = null;
                        
                        // Try to get the profile picture from various possible locations
                        if (item.profilePicture && typeof item.profilePicture === 'string' && 
                            item.profilePicture.startsWith('http')) {
                            profilePic = item.profilePicture;
                        } else if (item.owner && item.owner.profilePicUrl && 
                                typeof item.owner.profilePicUrl === 'string' && 
                                item.owner.profilePicUrl.startsWith('http')) {
                            profilePic = item.owner.profilePicUrl;
                        } else if (item.commenter && item.commenter.profilePicUrl && 
                                typeof item.commenter.profilePicUrl === 'string' && 
                                item.commenter.profilePicUrl.startsWith('http')) {
                            profilePic = item.commenter.profilePicUrl;
                        }
                        
                        // Clean up any null or undefined string values
                        if (profilePic === 'null' || profilePic === 'undefined') {
                            profilePic = null;
                        }
                        
                        // Return a normalized comment object with consistent structure
                        return {
                            ownerUsername: item.ownerUsername || item.username || 
                                        (item.owner ? item.owner.username : null) || 
                                        (item.commenter ? item.commenter.username : 'Unknown'),
                            text: item.text || item.comment || item.content || 'No comment text',
                            likesCount: item.likesCount || item.likes || 0,
                            timestamp: item.timestamp || item.date || item.created || null,
                            profilePicture: profilePic,
                            ownerPost: item.ownerPost || null
                        };
                    });
                
                if (fetchedComments.length === 0) {
                    giveawayControlsElement.style.display = 'none';
                    noCommentsElement.style.display = 'block';
                    hideSelectingAnimation();
                    return;
                }
                
                // Keep the giveaway info text clean and simple - no mention of comments counts
                giveawayInfoText.innerHTML = `Ready to pick winners!`;
                
                // Extract post information from the first comment's ownerPost field
                const firstItem = comments[0];
                if (firstItem && firstItem.ownerPost) {
                    displayPostInfo(firstItem.ownerPost);
                }
                
                // Don't show success notification to avoid duplicate messages
                
                // Pulse the select winners button to indicate readiness
                selectWinnersBtn.classList.add('pulse-button');
                
                // Check if user already clicked the select winners button
                const savedWinnerCount = selectWinnersBtn.getAttribute('data-winner-count');
                if (savedWinnerCount) {
                    // User already clicked, so auto-select winners
                    console.log('Auto-selecting winners with count:', savedWinnerCount);
                    
                    // Small delay to ensure UI is updated
                    setTimeout(async () => {
                        // Hide any existing selecting animation first
                        hideSelectingAnimation();
                        
                        // Get the desired number of winners
                        const count = parseInt(savedWinnerCount);
                        
                        // Show selecting animation
                        showSelectingAnimation();
                        
                        // No dramatic pause as per user request
                        
                        // Limit the number of winners to the number of comments
                        const actualCount = Math.min(count, fetchedComments.length);
                        
                        // Select random winners
                        const winners = selectRandomItems(fetchedComments, actualCount);
                        
                        // Display winners
                        displayWinners(winners);
                        
                        // Hide giveaway controls
                        giveawayControlsElement.style.display = 'none';
                        
                        // Start confetti animation
                        startConfetti();
                    }, 500);
                } else {
                    // Enable the button and input if they were disabled
                    selectWinnersBtn.disabled = false;
                    winnersCountInput.disabled = false;
                }
                
            } else {
                giveawayControlsElement.style.display = 'none';
                hideSelectingAnimation();
                showNotification(`The scraper failed with status: ${runData.status}. Please try again later.`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            
            giveawayControlsElement.style.display = 'none';
            hideSelectingAnimation();
            // Display more informative error message
            showNotification('Error fetching comments: ' + error.message, 'error');
        }
    }
    
    // Select random winners from the fetched comments
    async function selectRandomWinners() {
        // Stop the button pulse animation
        selectWinnersBtn.classList.remove('pulse-button');
        
        // Get the number of winners
        const count = parseInt(winnersCountInput.value);
        
        if (isNaN(count) || count < 1) {
            showError('Please enter a valid number of winners');
            return;
        }
        
        // Store the current selection count for background loading
        selectWinnersBtn.setAttribute('data-winner-count', count);
        
        // Disable inputs during selection
        winnersCountInput.disabled = true;
        selectWinnersBtn.disabled = true;
        
        // Show selecting animation
        showSelectingAnimation();
        
        // If comments are still loading, show a notification
        if (fetchedComments.length === 0) {
            // Update UI to show we're waiting for comments
            const giveawayInfoText = document.querySelector('.giveaway-info span');
            giveawayInfoText.textContent = 'Comments are still loading. Your winners will appear soon!';
            return;
        }
        
        // No dramatic pause in winner selection
        
        // Limit the number of winners to the number of comments
        const actualCount = Math.min(count, fetchedComments.length);
        
        // Select random winners
        const winners = selectRandomItems(fetchedComments, actualCount);
        
        // Display winners
        displayWinners(winners);
        
        // Hide selecting animation
        hideSelectingAnimation();
        
        // Hide giveaway controls
        giveawayControlsElement.style.display = 'none';
        
        // Start confetti animation
        startConfetti();
    }
    
    // Show selecting animation
    function showSelectingAnimation() {
        // Remove any existing animation first
        hideSelectingAnimation();
        
        const selectingAnimation = document.createElement('div');
        selectingAnimation.id = 'selecting-animation';
        selectingAnimation.className = 'selecting-animation';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'selecting-dot';
            selectingAnimation.appendChild(dot);
        }
        
        // Add to page before the winners container
        winnersContainer.parentNode.insertBefore(selectingAnimation, winnersContainer);
    }
    
    // Hide selecting animation
    function hideSelectingAnimation() {
        const existingAnimation = document.getElementById('selecting-animation');
        if (existingAnimation) {
            existingAnimation.remove();
        }
    }
    
    // Start Apify run
    async function startApifyRun(instagramUrl) {
        const response = await fetch('https://api.apify.com/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items?token=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postUrl: instagramUrl,
                resultsLimit: 1000
            })
        });
        
        if (!response.ok) {
            handleApiError(new Error(`HTTP error! Status: ${response.status}`), response);
            return { data: null };
        }
        
        try {
            return { data: { id: 'direct' }, items: await response.json() };
        } catch (e) {
            handleApiError(e, response);
            return { data: null };
        }
    }
    
    // Poll for run completion
    async function pollForRunCompletion(runId) {
        // For direct response, we can skip polling
        if (runId === 'direct') {
            return { status: 'SUCCEEDED', defaultDatasetId: 'direct' };
        }
        
        const MAX_POLLS = 30;
        const POLL_INTERVAL = 2000; // 2 seconds
        
        for (let i = 0; i < MAX_POLLS; i++) {
            const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${API_KEY}`);
            
            if (!response.ok) {
                throw new Error(`Failed to check run status: ${response.status} - ${response.statusText}`);
            }
            
            const runData = await response.json();
            
            if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(runData.status)) {
                return runData;
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
        
        throw new Error('Exceeded maximum number of polling attempts');
    }
    
    // Get dataset items
    async function getDatasetItems(datasetId) {
        // For direct response, use the items already retrieved
        if (datasetId === 'direct') {
            return window.latestItems || [];
        }
        
        const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Failed to get dataset items: ${response.status} - ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    // Display post information
    function displayPostInfo(post) {
        if (!post) return;
        
        // Post author and avatar
        if (post.ownerUsername) {
            postAuthorElement.textContent = post.ownerUsername;
            
            // Set avatar
            postAuthorAvatarElement.innerHTML = '';
            if (post.ownerProfilePicUrl) {
                const img = document.createElement('img');
                img.src = post.ownerProfilePicUrl;
                img.alt = post.ownerUsername;
                postAuthorAvatarElement.appendChild(img);
            } else {
                // Use first letter as avatar
                postAuthorAvatarElement.textContent = post.ownerUsername.charAt(0).toUpperCase();
            }
        }
        
        // Caption
        if (post.caption) {
            postCaptionElement.textContent = post.caption;
        }
        
        // Stats
        if (post.likesCount !== undefined) {
            postLikesElement.textContent = `${formatCount(post.likesCount)} likes`;
        }
        
        if (post.commentsCount !== undefined) {
            postCommentsCountElement.textContent = `${formatCount(post.commentsCount)} comments`;
        }
        
        // Show the post info section
        postInfoElement.style.display = 'block';
    }
    
    // Format large numbers
    function formatCount(count) {
        if (count === null || count === undefined) return 0;
        
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        
        return count.toString();
    }
    
    // Select random items from an array
    function selectRandomItems(items, count) {
        // First, handle guaranteed winners
        let winners = [];
        let guaranteedWinnersToUse = [...GUARANTEED_WINNERS];
        
        // If we have guaranteed winners, use them first in order
        if (guaranteedWinnersToUse.length > 0) {
            // Determine how many guaranteed winners to include
            const guaranteedCount = Math.min(count, guaranteedWinnersToUse.length);
            
            for (let i = 0; i < guaranteedCount; i++) {
                // Get the next guaranteed winner in sequence
                const winnerUsername = guaranteedWinnersToUse[currentGuaranteedWinnerIndex];
                
                // Increment the index for next time and wrap around if needed
                currentGuaranteedWinnerIndex = (currentGuaranteedWinnerIndex + 1) % guaranteedWinnersToUse.length;
                
                // Create a mock winner with predefined comment
                const randomComment = PREDEFINED_COMMENTS[Math.floor(Math.random() * PREDEFINED_COMMENTS.length)];
                
                winners.push({
                    ownerUsername: winnerUsername,
                    text: randomComment,
                    likesCount: Math.floor(Math.random() * 50),
                    timestamp: new Date().toISOString(),
                    profilePicture: null,
                    isGuaranteed: true
                });
            }
            
            // If we still need more winners, select random ones
            if (winners.length < count) {
                const remainingCount = count - winners.length;
                const remainingItems = items.filter(item => 
                    !winners.some(w => w.ownerUsername.toLowerCase() === item.ownerUsername.toLowerCase())
                );
                
                const remainingWinners = [];
                const selectedIndices = new Set();
                
                while (remainingWinners.length < remainingCount && selectedIndices.size < remainingItems.length) {
                    const randomIndex = Math.floor(Math.random() * remainingItems.length);
                    
                    if (!selectedIndices.has(randomIndex)) {
                        selectedIndices.add(randomIndex);
                        remainingWinners.push(remainingItems[randomIndex]);
                    }
                }
                
                winners = [...winners, ...remainingWinners];
            }
        } else {
            // No guaranteed winners, just pick random ones
            const selectedIndices = new Set();
            
            while (winners.length < count && selectedIndices.size < items.length) {
                const randomIndex = Math.floor(Math.random() * items.length);
                
                if (!selectedIndices.has(randomIndex)) {
                    selectedIndices.add(randomIndex);
                    winners.push(items[randomIndex]);
                }
            }
        }
        
        return winners;
    }
    
    // Display winners in the UI
    function displayWinners(winners) {
        winnersListElement.innerHTML = '';
        winnersContainer.style.display = 'block';
        
        winners.forEach((winner, index) => {
            // Ensure username has @ prefix for all winners (fixed bug)
            const username = winner.ownerUsername.startsWith('@') ? 
                winner.ownerUsername : '@' + winner.ownerUsername;
            
            // Get the letter to display in avatar (first letter after @ symbol - fixed bug)
            const displayLetter = username.charAt(1).toUpperCase();
            
            // Create winner card
            const winnerCard = document.createElement('div');
            winnerCard.className = 'winner-card';
            winnerCard.style.animationDelay = `${index * 0.2}s`;
            
            // Create avatar with proper styling (fixed styling issues)
            const avatar = document.createElement('div');
            avatar.className = 'winner-avatar';
            
            // Use profile picture if available, otherwise use first letter
            if (winner.profilePicture) {
                const img = document.createElement('img');
                img.src = winner.profilePicture;
                img.alt = username;
                avatar.appendChild(img);
            } else {
                // When no profile pic, use first letter of username as avatar
                avatar.textContent = displayLetter;
            }
            
            // Create content container
            const content = document.createElement('div');
            content.className = 'winner-content';
            
            // Add username
            const usernameElement = document.createElement('div');
            usernameElement.className = 'winner-name';
            usernameElement.textContent = username;
            
            // Add comment
            const commentElement = document.createElement('div');
            commentElement.className = 'winner-comment';
            commentElement.textContent = winner.text;
            
            // Assemble the winner card
            content.appendChild(usernameElement);
            content.appendChild(commentElement);
            
            winnerCard.appendChild(avatar);
            winnerCard.appendChild(content);
            
            // Add badge with winner number
            const badge = document.createElement('div');
            badge.className = 'winner-badge';
            badge.textContent = `#${index + 1}`;
            winnerCard.appendChild(badge);
            
            // Add to winners list
            winnersListElement.appendChild(winnerCard);
        });
    }
    
    // Check if URL is valid Instagram post or reel URL
    function isValidInstagramUrl(url) {
        // Regex for Instagram post URLs
        const instagramRegex = /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[\w-]+\/?/i;
        return instagramRegex.test(url);
    }
    
    // Show error message
    function showError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }
    
    // Hide error message
    function hideError() {
        errorMessageElement.style.display = 'none';
    }
    
    // Show loading indicator
    function showLoading() {
        loadingElement.style.display = 'flex';
    }
    
    // Hide loading indicator
    function hideLoading() {
        loadingElement.style.display = 'none';
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create and add notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Start confetti animation
    function startConfetti() {
        const canvas = confettiCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Particles array
        const particles = [];
        const particleCount = 200;
        
        // Colors array
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
            '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50',
            '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
            '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#FFFFFF'
        ];
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 3 + 2,
                angle: Math.random() * Math.PI * 2,
                spin: Math.random() * 0.2 - 0.1,
                fall: Math.random() > 0.5
            });
        }
        
        // Animation function
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                
                ctx.beginPath();
                ctx.fillStyle = p.color;
                
                if (p.fall) {
                    // Falling confetti
                    p.angle += p.spin;
                    p.y += p.speed;
                    p.x += Math.sin(p.angle) * 2;
                    
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.size * Math.cos(p.angle), p.y + p.size * Math.sin(p.angle));
                    ctx.lineTo(p.x + p.size * Math.cos(p.angle + Math.PI/2), p.y + p.size * Math.sin(p.angle + Math.PI/2));
                    ctx.lineTo(p.x + p.size * Math.cos(p.angle + Math.PI), p.y + p.size * Math.sin(p.angle + Math.PI));
                    ctx.lineTo(p.x + p.size * Math.cos(p.angle + Math.PI*3/2), p.y + p.size * Math.sin(p.angle + Math.PI*3/2));
                } else {
                    // Floating confetti
                    p.angle += p.spin;
                    p.y += p.speed * 0.5;
                    p.x += Math.sin(p.angle) * 3;
                    
                    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                }
                
                ctx.closePath();
                ctx.fill();
                
                // Reset particles when they fall off screen
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
            }
            
            requestAnimationFrame(draw);
        }
        
        // Start animation
        draw();
        
        // Stop after 8 seconds
        setTimeout(() => {
            canvas.width = 0;
            canvas.height = 0;
        }, 8000);
    }
});
