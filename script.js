document.addEventListener('DOMContentLoaded', () => {
    // API key for Apify - hardcoded for simplicity in this demo
    const API_KEY = 'apify_api_HncaBoFrTmcPjl1cuFGju3zwbViJJW4hjcdZ';
    
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
            showError('Please enter a valid Instagram post URL (e.g., https://www.instagram.com/p/ABC123/)');
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
            // First, start the scraper run
            const startRunResponse = await startApifyRun(instagramUrl);
            console.log('Run started:', startRunResponse);
            
            if (!startRunResponse.data || !startRunResponse.data.id) {
                throw new Error('Invalid response from Apify API');
            }
            
            const runId = startRunResponse.data.id;
            
            // Show a notification that fetching has started
            showNotification('Fetching comments... You can select the number of winners while waiting!', 'info');
            
            // Poll for completion
            const runData = await pollForRunCompletion(runId);
            console.log('Run completed:', runData);
            
            if (runData.status === 'SUCCEEDED') {
                // Get the dataset items
                const datasetId = runData.defaultDatasetId;
                const comments = await getDatasetItems(datasetId);
                
                // Store comments for winner selection
                // Filter out any non-comment objects that might be in the data
                fetchedComments = comments.filter(item => item.text && item.ownerUsername);
                
                if (fetchedComments.length === 0) {
                    hideLoading();
                    giveawayControlsElement.style.display = 'none';
                    noCommentsElement.style.display = 'block';
                    hideSelectingAnimation();
                    return;
                }
                
                // Update giveaway info text
                const giveawayInfoText = document.querySelector('.giveaway-info span');
                giveawayInfoText.innerHTML = `<strong>${fetchedComments.length}</strong> comments loaded! <span class="ready-text">Ready to pick winners!</span>`;
                
                // Extract post information from the first comment's ownerPost field
                const firstItem = comments[0];
                if (firstItem && firstItem.ownerPost) {
                    displayPostInfo(firstItem.ownerPost);
                }
                
                // Hide loading indicator after comments are fetched
                hideLoading();
                
                // Show success notification
                showNotification(`Successfully loaded ${fetchedComments.length} comments! Ready to pick winners!`, 'success');
                
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
                        
                        // Dramatic pause
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
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
                hideLoading();
                giveawayControlsElement.style.display = 'none';
                hideSelectingAnimation();
                showNotification(`The scraper failed with status: ${runData.status}. Please try again later.`, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            
            hideLoading();
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
        
        // Validate input
        if (isNaN(count) || count < 1) {
            showNotification('Please enter a valid number of winners (at least 1)', 'error');
            return;
        }
        
        // If comments are still loading, show a special selecting state
        if (!fetchedComments || fetchedComments.length === 0) {
            // Show the selecting winners animation
            showSelectingAnimation();
            
            // Store the winner count for when the comments are loaded
            selectWinnersBtn.setAttribute('data-winner-count', count);
            selectWinnersBtn.disabled = true;
            winnersCountInput.disabled = true;
            
            // Add a waiting message
            const giveawayInfoText = document.querySelector('.giveaway-info span');
            giveawayInfoText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Waiting for comments to finish loading... <strong>${count}</strong> winner(s) will be selected automatically.`;
            
            return;
        }
        
        // Show selecting animation
        showSelectingAnimation();
        
        // Limit the number of winners to the number of comments
        const actualCount = Math.min(count, fetchedComments.length);
        
        // Delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Select random winners
        const winners = selectRandomItems(fetchedComments, actualCount);
        
        // Display winners
        displayWinners(winners);
        
        // Hide giveaway controls
        giveawayControlsElement.style.display = 'none';
        
        // Start confetti animation
        startConfetti();
    }
    
    // Show selecting animation while winners are being picked
    function showSelectingAnimation() {
        // Create or get the selecting overlay
        let selectingOverlay = document.getElementById('selecting-overlay');
        if (!selectingOverlay) {
            selectingOverlay = document.createElement('div');
            selectingOverlay.id = 'selecting-overlay';
            document.body.appendChild(selectingOverlay);
        }
        
        // Add the animated content
        selectingOverlay.innerHTML = `
            <div class="selecting-content">
                <div class="selecting-spinner"></div>
                <h2>Selecting Winner<span class="dots">...</span></h2>
                <p>Magic happening!</p>
            </div>
        `;
        
        // Show the overlay
        selectingOverlay.style.display = 'flex';
        
        // Animate the dots
        const dots = document.querySelector('.dots');
        let dotCount = 3;
        const dotsInterval = setInterval(() => {
            dots.textContent = '.'.repeat(dotCount);
            dotCount = (dotCount % 3) + 1;
        }, 500);
        
        // Store the interval ID for later cleanup
        selectingOverlay.setAttribute('data-interval', dotsInterval);
        
        // Return a function to hide the overlay
        return () => {
            clearInterval(dotsInterval);
            selectingOverlay.style.display = 'none';
        };
    }
    
    // Hide selecting animation
    function hideSelectingAnimation() {
        const selectingOverlay = document.getElementById('selecting-overlay');
        if (selectingOverlay) {
            // Clear any intervals
            const intervalId = parseInt(selectingOverlay.getAttribute('data-interval'));
            if (!isNaN(intervalId)) {
                clearInterval(intervalId);
            }
            
            // Hide the overlay
            selectingOverlay.style.display = 'none';
        }
    }
    
    // Show a notification
    function showNotification(message, type = 'info') {
        // Create a notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to the document
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after a delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Validate Instagram URL format
    function isValidInstagramUrl(url) {
        // Simple validation for Instagram URLs
        const regex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?/;
        return regex.test(url);
    }

    // Start the Apify scraper run
    async function startApifyRun(instagramUrl) {
        const response = await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "directUrls": [instagramUrl],
                "resultsType": "comments",
                "resultsLimit": 100,
                "maxRequestRetries": 5,
                "proxy": {
                    "useApifyProxy": true
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to start the scraper. Status: ${response.status}`);
        }
        
        return response.json();
    }

    // Poll for run completion
    async function pollForRunCompletion(runId) {
        const maxAttempts = 30;
        const delayMs = 5000; // 5 seconds
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${API_KEY}`);
                
                if (!response.ok) {
                    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (!data || !data.data) {
                    throw new Error('Invalid response format from Apify API');
                }
                
                // Update loading message with current status
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <p>Fetching comments... (Status: ${data.data.status || 'UNKNOWN'})</p>
                    <p>Attempt ${attempt + 1}/${maxAttempts}</p>
                `;
                
                if (data.data.status === 'SUCCEEDED' || data.data.status === 'FAILED' || data.data.status === 'TIMED-OUT') {
                    return data.data;
                }
                
            } catch (error) {
                console.error('Error polling run status:', error);
                // Continue polling despite errors
            }
            
            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        throw new Error('Timeout waiting for the scraper to complete');
    }

    // Get dataset items from Apify
    async function getDatasetItems(datasetId) {
        try {
            const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_KEY}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch dataset items. Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dataset items retrieved:', data.length || 0, 'items');
            return data;
        } catch (error) {
            console.error('Error fetching dataset:', error);
            throw error;
        }
    }

    // Display comments in the UI
    function displayComments(data) {
        if (!data || data.length === 0) {
            noCommentsElement.style.display = 'block';
            return;
        }
        
        // Extract post information from the first comment's ownerPost field
        const firstItem = data[0];
        if (firstItem && firstItem.ownerPost) {
            displayPostInfo(firstItem.ownerPost);
        }
        
        // Filter out any non-comment objects that might be in the data
        const comments = data.filter(item => item.text && item.ownerUsername);
        
        if (comments.length === 0) {
            noCommentsElement.style.display = 'block';
            return;
        }
        
        commentsCountElement.textContent = `Showing ${comments.length} comment${comments.length === 1 ? '' : 's'}`;
        
        comments.forEach(comment => {
            const commentElement = createCommentElement(comment);
            commentsContainer.appendChild(commentElement);
        });
    }

    // Display post information
    function displayPostInfo(postData) {
        if (!postData) return;
        
        postInfoElement.style.display = 'block';
        
        // Set author info
        postAuthorElement.textContent = postData.ownerUsername || 'Unknown';
        
        // Set author avatar
        if (postData.ownerProfilePicUrl) {
            postAuthorAvatarElement.innerHTML = `<img src="${postData.ownerProfilePicUrl}" alt="${postData.ownerUsername}" />`;
        } else {
            // Default avatar if no image available
            postAuthorAvatarElement.innerHTML = `<div style="width:100%;height:100%;background:#e1e1e1;display:flex;align-items:center;justify-content:center;">${(postData.ownerUsername || '?')[0].toUpperCase()}</div>`;
        }
        
        // Set post caption
        postCaptionElement.textContent = postData.caption || '';
        
        // Set post stats
        const likesCount = postData.likesCount || 0;
        const commentsCount = postData.commentsCount || 0;
        
        postLikesElement.textContent = `${likesCount.toLocaleString()} like${likesCount === 1 ? '' : 's'}`;
        postCommentsCountElement.textContent = `${commentsCount.toLocaleString()} comment${commentsCount === 1 ? '' : 's'}`;
    }

    // Create comment element
    function createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        
        // Avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'comment-avatar';
        
        if (comment.authorPicUrl) {
            const avatarImg = document.createElement('img');
            avatarImg.src = comment.authorPicUrl;
            avatarImg.alt = comment.ownerUsername || 'User';
            avatarDiv.appendChild(avatarImg);
        } else {
            // Default avatar if no image available
            avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:#e1e1e1;display:flex;align-items:center;justify-content:center;">${(comment.ownerUsername || '?')[0].toUpperCase()}</div>`;
        }
        
        // Comment content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'comment-content';
        
        // Username
        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'comment-username';
        usernameDiv.textContent = comment.ownerUsername || 'Anonymous';
        
        // Comment text
        const textDiv = document.createElement('div');
        textDiv.className = 'comment-text';
        textDiv.textContent = comment.text || '';
        
        // Likes count
        const likesDiv = document.createElement('div');
        likesDiv.className = 'comment-likes';
        const likesCount = comment.likesCount || 0;
        likesDiv.textContent = `${likesCount} like${likesCount === 1 ? '' : 's'}`;
        
        // Date
        if (comment.timestamp) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'comment-date';
            const date = new Date(comment.timestamp);
            dateDiv.textContent = formatDate(date);
            contentDiv.appendChild(dateDiv);
        }
        
        // Append elements
        contentDiv.appendChild(usernameDiv);
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(likesDiv);
        
        commentDiv.appendChild(avatarDiv);
        commentDiv.appendChild(contentDiv);
        
        return commentDiv;
    }

    // Format date for display
    function formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        
        if (diffSecs < 60) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else if (diffWeeks < 4) {
            return `${diffWeeks}w ago`;
        } else {
            // Format as MM/DD/YYYY
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        }
    }
    
    // Select random items from an array
    function selectRandomItems(array, count) {
        // Make a copy of the array to avoid modifying the original
        const copyArray = [...array];
        const result = [];
        
        // Fisher-Yates shuffle algorithm
        for (let i = 0; i < count; i++) {
            // Get a random index between current index and end of array
            const randomIndex = i + Math.floor(Math.random() * (copyArray.length - i));
            
            // Swap the current element with the randomly selected one
            [copyArray[i], copyArray[randomIndex]] = [copyArray[randomIndex], copyArray[i]];
            
            // Add the selected element to the result
            result.push(copyArray[i]);
        }
        
        return result;
    }
    
    // Display the winners
    function displayWinners(winners) {
        // Clear previous winners
        winnersListElement.innerHTML = '';
        
        // Show the winners container
        winnersContainer.style.display = 'block';
        
        // Add each winner with a delay for animation effect
        winners.forEach((winner, index) => {
            setTimeout(() => {
                const winnerCard = document.createElement('div');
                winnerCard.className = 'winner-card';
                
                // Winner avatar
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'winner-avatar';
                
                if (winner.authorPicUrl) {
                    const avatarImg = document.createElement('img');
                    avatarImg.src = winner.authorPicUrl;
                    avatarImg.alt = winner.ownerUsername || 'Winner';
                    avatarDiv.appendChild(avatarImg);
                } else {
                    // Default avatar if no image available
                    avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:#e1e1e1;display:flex;align-items:center;justify-content:center;">${(winner.ownerUsername || '?')[0].toUpperCase()}</div>`;
                }
                
                // Winner details
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'winner-details';
                
                // Username
                const usernameDiv = document.createElement('div');
                usernameDiv.className = 'winner-username';
                usernameDiv.innerHTML = `${winner.ownerUsername || 'Anonymous'} <span class="winner-trophy">🏆</span>`;
                
                // Comment text
                const textDiv = document.createElement('div');
                textDiv.className = 'winner-text';
                textDiv.textContent = winner.text || '';
                
                // Append elements
                detailsDiv.appendChild(usernameDiv);
                detailsDiv.appendChild(textDiv);
                
                winnerCard.appendChild(avatarDiv);
                winnerCard.appendChild(detailsDiv);
                
                winnersListElement.appendChild(winnerCard);
                
                // Play sound effect for each winner reveal (optional)
                // playWinnerSound();
                
            }, index * 800); // Stagger the animations
        });
    }
    
    // Confetti animation
    function startConfetti() {
        const ctx = confettiCanvas.getContext('2d');
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        
        const confettiCount = 200;
        const gravity = 0.5;
        const terminalVelocity = 5;
        const drag = 0.075;
        const colors = [
            { front: '#ff3e00', back: '#ff8c00' },  // Orange
            { front: '#00d1b2', back: '#00b5cc' },  // Turquoise
            { front: '#ff9f1c', back: '#ffbf69' },  // Yellow
            { front: '#f25f5c', back: '#ff8a80' },  // Red
            { front: '#6a4c93', back: '#9d81ba' }   // Purple
        ];
        
        // Confetti particle
        class Confetti {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = Math.random() * 10 + 5;
                this.height = this.width * (Math.random() * 0.6 + 0.4);
                this.velocityX = Math.random() * 10 - 5;
                this.velocityY = Math.random() * -15 - 10;
                this.angle = Math.random() * Math.PI * 2;
                this.angularVelocity = Math.random() * 0.2 - 0.1;
                this.rotation = 0;
                this.flip = Math.random() < 0.5;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            update() {
                this.velocityY += gravity;
                if (this.velocityY > terminalVelocity) {
                    this.velocityY = terminalVelocity;
                }
                this.velocityX += this.velocityX > 0 ? -drag : drag;
                this.x += this.velocityX;
                this.y += this.velocityY;
                this.rotation = (this.rotation + this.angularVelocity) % (Math.PI * 2);
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                const colorToUse = this.flip ? this.color.back : this.color.front;
                ctx.fillStyle = colorToUse;
                
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                
                ctx.restore();
            }
        }
        
        const particles = [];
        // Create confetti particles
        for (let i = 0; i < confettiCount; i++) {
            particles.push(
                new Confetti(
                    Math.random() * confettiCanvas.width,
                    Math.random() * confettiCanvas.height - confettiCanvas.height
                )
            );
        }
        
        let animationId = null;
        
        function render() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            
            particles.forEach((particle, index) => {
                particle.update();
                particle.draw();
                
                // Remove particles that have fallen offscreen
                if (particle.y > confettiCanvas.height) {
                    particles.splice(index, 1);
                }
            });
            
            // Stop animation when all particles have fallen
            if (particles.length === 0) {
                cancelAnimationFrame(animationId);
                confettiCanvas.style.display = 'none';
                return;
            }
            
            animationId = requestAnimationFrame(render);
        }
        
        // Make canvas visible and start animation
        confettiCanvas.style.display = 'block';
        render();
        
        // Automatically stop confetti after 6 seconds
        setTimeout(() => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                particles.length = 0;
                confettiCanvas.style.display = 'none';
            }
        }, 6000);
    }

    // Show loading indicator
    function showLoading() {
        loadingElement.style.display = 'block';
        fetchBtn.disabled = true;
    }

    // Hide loading indicator
    function hideLoading() {
        loadingElement.style.display = 'none';
        fetchBtn.disabled = false;
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
});
