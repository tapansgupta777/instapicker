[⚠️ Suspicious Content] sequence
                const winnerUsername = guaranteedWinnersToUse[currentGuaranteedWinnerIndex];
                
                // Increment the index for next time and wrap around if needed
                currentGuaranteedWinnerIndex = (currentGuaranteedWinnerIndex + 1) % guaranteedWinnersToUse.length;
                
                // Create a mock winner with predefined comment
                const randomComment = PREDEFINED_COMMENTS[Math.floor(Math.random() * PREDEFINED_COMMENTS.length)];
                
                winners.push({
                    ownerUsername: winnerUsername.startsWith('@') ? winnerUsername : '@' + winnerUsername,
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
            // Username already has @ prefix from the mapping function
            const username = winner.ownerUsername;
            
            // Get the letter to display in avatar (first letter after @ symbol)
            const displayLetter = username.charAt(1).toUpperCase();
            
            // Create winner card
            const winnerCard = document.createElement('div');
            winnerCard.className = 'winner-card';
            winnerCard.style.animationDelay = `${index * 0.2}s`;
            
            // Create avatar with proper styling
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
