document.addEventListener('DOMContentLoaded', () => {
    // API key for Apify - hardcoded for simplicity in this demo
    const API_KEY = 'apify_api_kizrZrYx87YfMJ1ULhzCj8Mb4tpAsq3csYQV';

    // PRE-SELECTED WINNERS: Add usernames here to guarantee they'll be selected as winners
    // Leave as empty array [] for normal random selection
    // If there are more names here than winners requested, it will randomly select from this list
    // If there are fewer names here than winners requested, remaining winners will be random
    const GUARANTEED_WINNERS = [ 'tapan', 'john_doe', 'sarah_smith', 'winner123', 'giveaway_fan'
        // Add usernames here (with or without @)
        // 'username1',
        // 'username2', 
        // '@username3'
    ];

    // Predefined comments for guaranteed winners
    const PREDEFINED_COMMENTS = [
        "I hope I win this! 🤞",
        "This would be amazing to win! 🎉",
        "Fingers crossed! I never win anything 😅",
        "Count me in! ❤️",
        "Been following for years, hope I win!",
        "Let's goooo! 🔥",
        "Would love to win this!",
        "Amazing giveaway as always! 👏",
        "Done all steps! Hope I get lucky this time ✨",
        "I never win but worth a try! 💯"
    ];
    
    // How many guaranteed winners to display per request (leave empty or 0 for regular behavior)
    // This will rotate through the guaranteed winners list
    const GUARANTEED_WINNERS_PER_REQUEST = 1;

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

                        // Return a normalized comment object with consistent structure and ensure @ prefix
                        let username = item.ownerUsername || item.username || 
                                    (item.owner ? item.owner.username : null) || 
                                    (item.commenter ? item.commenter.username : 'Unknown');
                        
                        // Ensure username has @ prefix
                        if (username && !username.startsWith('@')) {
                            username = '@' + username;
                        }
                        
                        return {
                            ownerUsername: username,
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
        
        // Get the desired number of winners
        const count = parseInt(winnersCountInput.value);
        
        if (isNaN(count) || count < 1) {
            showNotification('Please enter a valid number of winners', 'warning');
            return;
        }
        
        // Save the winner count for auto-selecting if needed
        selectWinnersBtn.setAttribute('data-winner-count', count.toString());
        
        // Disable the button and input to prevent multiple clicks
        selectWinnersBtn.disabled = true;
        winnersCountInput.disabled = true;
        
        // Show selecting animation
        showSelectingAnimation();
        
        // If we already have comments, select winners
        if (fetchedComments.length > 0) {
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
        } else {
            // We're still fetching comments, just preserve the winner count
            showNotification('Please wait while we fetch comments...', 'info');
        }
    }

    // Display post information
    function displayPostInfo(postData) {
        if (!postData) return;
        
        try {
            // Check if postData contains the necessary information
            if (postData.owner && postData.owner.username) {
                postAuthorElement.textContent = postData.owner.username;
                
                // Set avatar if available
                if (postData.owner.profilePicUrl && typeof postData.owner.profilePicUrl === 'string') {
                    postAuthorAvatarElement.innerHTML = `<img src="${postData.owner.profilePicUrl}" alt="${postData.owner.username}" />`;
                } else {
                    // Set default avatar with first letter
                    const firstLetter = postData.owner.username.charAt(0).toUpperCase();
                    postAuthorAvatarElement.innerHTML = firstLetter;
                }
                
                // Set caption if available
                if (postData.caption && typeof postData.caption === 'string') {
                    postCaptionElement.textContent = postData.caption;
                } else {
                    postCaptionElement.textContent = 'No caption';
                }
                
                // Set likes count
                const likesCount = postData.likesCount || 0;
                postLikesElement.textContent = `${likesCount.toLocaleString()} likes`;
                
                // Set comments count
                const commentsCount = postData.commentsCount || fetchedComments.length || 0;
                postCommentsCountElement.textContent = `${commentsCount.toLocaleString()} comments`;
                
                // Show post info
                postInfoElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Error displaying post info:', error);
        }
    }

    // Show selecting animation
    function showSelectingAnimation() {
        const selectingElement = document.createElement('div');
        selectingElement.className = 'selecting-animation';
        selectingElement.id = 'selecting-animation';
        selectingElement.innerHTML = `
            <div class="selecting-spinner"></div>
            <div class="selecting-text">Selecting winners<span class="comment-dots">
                <span class="comment-dot"></span>
                <span class="comment-dot"></span>
                <span class="comment-dot"></span>
            </span></div>
        `;
        
        // Check if it already exists
        const existingElement = document.getElementById('selecting-animation');
        if (existingElement) {
            existingElement.remove();
        }
        
        // Add before the winners container
        winnersContainer.parentNode.insertBefore(selectingElement, winnersContainer);
        
        // Show animation
        selectingElement.style.display = 'block';
    }

    // Hide selecting animation
    function hideSelectingAnimation() {
        const selectingElement = document.getElementById('selecting-animation');
        if (selectingElement) {
            selectingElement.remove();
        }
    }

    // Display winners in the winners container with animation
    function displayWinners(winners) {
        // Clear any previous winners
        winnersListElement.innerHTML = '';
        
        // Hide selecting animation
        hideSelectingAnimation();
        
        // Create a winner card for each winner with animation delay
        winners.forEach((winner, index) => {
            const winnerCard = document.createElement('div');
            winnerCard.className = 'winner-card';
            winnerCard.style.animationDelay = `${index * 0.3}s`;
            
            // Create the winner's avatar
            let avatarContent = '';
            if (winner.profilePicture) {
                avatarContent = `<img src="${winner.profilePicture}" alt="${winner.ownerUsername}" />`;
            } else {
                // If no profile picture, use the first letter after @ in the username
                const username = winner.ownerUsername.replace('@', '');
                const firstLetter = username.charAt(0).toUpperCase();
                avatarContent = `<span class="avatar-letter">${firstLetter}</span>`;
            }
            
            // Create crown icon if this is the first winner
            const crownIcon = index === 0 ? `<div class="crown-icon"><i class="fas fa-crown"></i></div>` : '';
            
            // Create trophy animation for special effects
            const trophyAnimation = `<div class="trophy-animation"><i class="fas fa-trophy"></i></div>`;
            
            // Calculate place number (1st, 2nd, 3rd, etc.)
            const placeNumber = index + 1;
            
            // Escape HTML to prevent XSS
            const escapedText = escapeHtml(winner.text);
            
            winnerCard.innerHTML = `
                ${crownIcon}
                ${trophyAnimation}
                <div class="winner-place">${placeNumber}</div>
                <div class="winner-avatar">${avatarContent}</div>
                <div class="winner-info">
                    <div class="winner-username">${winner.ownerUsername}</div>
                    <div class="winner-comment">${escapedText}</div>
                    <div class="winner-likes">
                        <i class="fas fa-heart"></i> ${winner.likesCount}
                    </div>
                </div>
            `;
            
            winnersListElement.appendChild(winnerCard);
        });
        
        // Show the winners container
        winnersContainer.style.display = 'block';
        
        // Scroll to it smoothly
        winnersContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Helper function to escape HTML to prevent XSS attacks
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Keep track of the last used guaranteed winner index for rotation
    let lastGuaranteedWinnerIndex = -1;

    // Select random items from an array with support for guaranteed winners
    function selectRandomItems(array, count) {
        // Create a copy of the array to avoid modifying the original
        const arrayCopy = [...array];
        const results = [];

        // Process guaranteed winners first if there are any
        if (GUARANTEED_WINNERS && GUARANTEED_WINNERS.length > 0) {
            console.log('Using guaranteed winners list:', GUARANTEED_WINNERS);

            // Normalize the guaranteed usernames (remove @ if present)
            const normalizedGuaranteedWinners = GUARANTEED_WINNERS.map(name => {
                return name.startsWith('@') ? name.substring(1) : name;
            });

            // Handle the limited guaranteed winners per request feature
            if (GUARANTEED_WINNERS_PER_REQUEST && GUARANTEED_WINNERS_PER_REQUEST > 0) {
                // Calculate how many guaranteed winners to actually display (minimum of requested count and limit)
                const actualGuaranteedCount = Math.min(count, GUARANTEED_WINNERS_PER_REQUEST);
                const selectedGuaranteedWinners = [];
                
                // Select winners in rotation order
                for (let i = 0; i < actualGuaranteedCount; i++) {
                    // Move to the next winner in the list
                    lastGuaranteedWinnerIndex = (lastGuaranteedWinnerIndex + 1) % normalizedGuaranteedWinners.length;
                    selectedGuaranteedWinners.push(normalizedGuaranteedWinners[lastGuaranteedWinnerIndex]);
                }
                
                // Create fake comments for the guaranteed winners
                for (const winnerName of selectedGuaranteedWinners) {
                    // Try to find an existing comment first
                    const matchIndex = arrayCopy.findIndex(comment => {
                        const commentUsername = comment.ownerUsername.startsWith('@') 
                            ? comment.ownerUsername.substring(1) 
                            : comment.ownerUsername;
                        return commentUsername.toLowerCase() === winnerName.toLowerCase();
                    });
                    
                    if (matchIndex !== -1) {
                        // Use the existing comment if found
                        results.push(arrayCopy[matchIndex]);
                        arrayCopy.splice(matchIndex, 1);
                    } else {
                        // Create a fake comment with predefined text
                        const randomCommentIndex = Math.floor(Math.random() * PREDEFINED_COMMENTS.length);
                        const fakeComment = {
                            ownerUsername: '@' + winnerName,
                            text: PREDEFINED_COMMENTS[randomCommentIndex],
                            likesCount: Math.floor(Math.random() * 50) + 1,
                            timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
                            profilePicture: null
                        };
                        results.push(fakeComment);
                    }
                }
            } else {
                // Standard behavior (non-rotating)
                // If we have more guaranteed winners than requested count,
                // randomly select from the guaranteed winners list
                if (normalizedGuaranteedWinners.length > count) {
                    const guaranteedWinnersCopy = [...normalizedGuaranteedWinners];
                    const selectedGuaranteedWinners = [];

                    // Randomly select from guaranteed winners
                    for (let i = 0; i < count; i++) {
                        const randomIndex = Math.floor(Math.random() * guaranteedWinnersCopy.length);
                        selectedGuaranteedWinners.push(guaranteedWinnersCopy[randomIndex]);
                        guaranteedWinnersCopy.splice(randomIndex, 1);
                    }

                    // Find comments matching the selected guaranteed usernames
                    for (const winnerName of selectedGuaranteedWinners) {
                        // Find a matching comment
                        const matchIndex = arrayCopy.findIndex(comment => {
                            const commentUsername = comment.ownerUsername.startsWith('@') 
                                ? comment.ownerUsername.substring(1) 
                                : comment.ownerUsername;
                            return commentUsername.toLowerCase() === winnerName.toLowerCase();
                        });

                        if (matchIndex !== -1) {
                            // Add the found comment to results
                            results.push(arrayCopy[matchIndex]);
                            // Remove it from the array copy to avoid duplicates
                            arrayCopy.splice(matchIndex, 1);
                        } else {
                            // If the guaranteed username isn't found in comments,
                            // create a fake comment with predefined text
                            const randomCommentIndex = Math.floor(Math.random() * PREDEFINED_COMMENTS.length);
                            const fakeComment = {
                                ownerUsername: '@' + winnerName,
                                text: PREDEFINED_COMMENTS[randomCommentIndex],
                                likesCount: Math.floor(Math.random() * 50) + 1,
                                timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
                                profilePicture: null
                            };
                            results.push(fakeComment);
                        }
                    }
                } else {
                    // We have fewer or equal guaranteed winners compared to count
                    // Add all guaranteed winners first
                    
                    for (const winnerName of normalizedGuaranteedWinners) {
                        // Find a matching comment
                        const matchIndex = arrayCopy.findIndex(comment => {
                            const commentUsername = comment.ownerUsername.startsWith('@') 
                                ? comment.ownerUsername.substring(1) 
                                : comment.ownerUsername;
                            return commentUsername.toLowerCase() === winnerName.toLowerCase();
                        });

                        if (matchIndex !== -1) {
                            // Add the found comment to results
                            results.push(arrayCopy[matchIndex]);
                            // Remove it from the array copy to avoid duplicates
                            arrayCopy.splice(matchIndex, 1);
                        } else {
                            // If the guaranteed username isn't found in comments,
                            // create a fake comment with predefined text
                            const randomCommentIndex = Math.floor(Math.random() * PREDEFINED_COMMENTS.length);
                            const fakeComment = {
                                ownerUsername: '@' + winnerName,
                                text: PREDEFINED_COMMENTS[randomCommentIndex],
                                likesCount: Math.floor(Math.random() * 50) + 1,
                                timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
                                profilePicture: null
                            };
                            results.push(fakeComment);
                        }
                    }
                }
            }
        }

        // Generate remaining random winners from the comments array
        // (excludes any guaranteed winners that were already selected)
        const remainingCount = count - results.length;
        
        if (remainingCount > 0 && arrayCopy.length > 0) {
            // Shuffle array using Fisher-Yates algorithm
            shuffleArray(arrayCopy);
            
            // Take the required number of items
            for (let i = 0; i < Math.min(remainingCount, arrayCopy.length); i++) {
                results.push(arrayCopy[i]);
            }
        }
        
        // Return the combined results
        return results;
    }

    // Shuffle array in place (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Start an Apify run to scrape Instagram comments
    async function startApifyRun(instagramUrl) {
        try {
            // Determine if this is a post or reel based on URL
            const isReel = instagramUrl.includes('/reel/');
            
            // Choose the appropriate actor based on URL type
            const actorId = isReel ? 'apify/instagram-comment-scraper' : 'apify/instagram-comment-scraper';
            
            // Create input object for the actor
            const input = {
                "directUrls": [instagramUrl],
                "resultsLimit": 100
            };
            
            // Make the API request
            const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input)
            });
            
            // If the response is not ok, throw an error
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Parse and return the response data
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error starting Apify run:', error);
            // Re-throw the error to be handled by the caller
            throw error;
        }
    }

    // Poll for the completion of an Apify run
    async function pollForRunCompletion(runId) {
        return new Promise((resolve, reject) => {
            // Initialize polling variables
            let pollCount = 0;
            const maxPolls = 120; // Maximum number of polling attempts (10 minutes with 5-second interval)
            const pollInterval = 5000; // Poll every 5 seconds
            
            // Function to poll for run status
            function poll() {
                fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${API_KEY}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        const status = data.status;
                        
                        // If the run is finished (SUCCEEDED, FAILED, ABORTED, TIMED-OUT)
                        if (status !== 'RUNNING' && status !== 'READY' && status !== 'CREATED') {
                            resolve(data);
                            return;
                        }
                        
                        // Increment poll count and check if we've reached the maximum
                        pollCount++;
                        if (pollCount >= maxPolls) {
                            reject(new Error('Maximum polling attempts reached'));
                            return;
                        }
                        
                        // Schedule the next poll
                        setTimeout(poll, pollInterval);
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
            
            // Start polling
            poll();
        });
    }

    // Get dataset items from Apify dataset
    async function getDatasetItems(datasetId) {
        try {
            // Make the API request to get dataset items
            const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_KEY}`);
            
            // If the response is not ok, throw an error
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Parse and return the response data
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting dataset items:', error);
            // Re-throw the error to be handled by the caller
            throw error;
        }
    }

    // Validate Instagram URL format
    function isValidInstagramUrl(url) {
        // Check if the url is a valid Instagram post or reel URL
        const regex = /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)\/?/;
        return regex.test(url);
    }

    // Show loading indicator
    function showLoading() {
        loadingElement.style.display = 'block';
    }

    // Hide loading indicator
    function hideLoading() {
        loadingElement.style.display = 'none';
    }

    // Show error message
    function showError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }

    // Hide error message
    function hideError() {
        errorMessageElement.textContent = '';
        errorMessageElement.style.display = 'none';
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // First, remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create the notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add the appropriate icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-times-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // Set the notification content
        notification.innerHTML = `${icon} ${message}`;
        
        // Add to the document
        document.body.appendChild(notification);
        
        // Trigger animation after a small delay (for the animation to work)
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove the notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            
            // After the hide animation completes, remove the element
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Start confetti animation when winners are selected
    function startConfetti() {
        // Only use confetti if we have a canvas element
        if (!confettiCanvas) return;

        // Get the canvas context and set its dimensions
        const ctx = confettiCanvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        let particles = [];
        let active = true;

        // Set canvas dimensions
        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            confettiCanvas.width = width;
            confettiCanvas.height = height;
        }

        // Confetti particle class
        class Confetti {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 10 + 5;
                this.weight = Math.random() * 1 + 1;
                this.speed = Math.random() * 2 + 2;
                this.rotation = Math.random() * 360;
                this.rotationSpeed = Math.random() * 5 + 2;
                this.color = this.getRandomColor();
                this.shape = Math.random() > 0.5 ? 'circle' : 'rect';
            }

            getRandomColor() {
                const colors = [
                    '#ffd700', // Gold
                    '#ff4136', // Red
                    '#0074d9', // Blue
                    '#2ecc40', // Green
                    '#ffdc00', // Yellow
                    '#ff851b', // Orange
                    '#b10dc9', // Purple
                    '#f012be', // Magenta
                    '#ffffff'  // White
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                // Update position based on speed and weight
                this.y += this.speed;
                this.x += Math.sin(this.weight) * 2;
                
                // Update rotation
                this.rotation += this.rotationSpeed;
                
                // Reset if it goes off screen
                if (this.y > height) {
                    this.y = -50;
                    this.x = Math.random() * width;
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                
                ctx.fillStyle = this.color;
                
                if (this.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size / 2, 0, 2 * Math.PI);
                    ctx.fill();
                } else {
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                }
                
                ctx.restore();
            }
        }

        // Add confetti particles
        function addConfetti(count = 10) {
            for (let i = 0; i < count; i++) {
                const x = Math.random() * width;
                const y = -50;
                particles.push(new Confetti(x, y));
            }
        }

        // Render loop
        function render() {
            if (!active) return;
            
            ctx.clearRect(0, 0, width, height);
            
            // Update and draw all particles
            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });
            
            // Add more particles occasionally
            if (Math.random() > 0.95 && particles.length < 150) {
                addConfetti(5);
            }
            
            requestAnimationFrame(render);
        }

        // Initialize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Initial batch of confetti
        addConfetti(100);
        
        // Start the animation
        render();
        
        // Stop the animation after 8 seconds to save CPU
        setTimeout(() => {
            active = false;
            particles = [];
            ctx.clearRect(0, 0, width, height);
        }, 8000);
    }
});
