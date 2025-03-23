import { initDB, saveVideo, getAllVideos, deleteVideo } from './videoStorage.js';

// Navbar functionality
const hamburger = document.querySelector('.hamburger');
const navbar = document.querySelector('.left-navbar');
    
hamburger.addEventListener('click', function() {
    navbar.classList.toggle('expanded');
});

// Initialize the database
let db;
initDB().then(database => {
    db = database;
    loadSavedVideos();
}).catch(error => {
    console.error('Error initializing database:', error);
});

// Function to create a video element with controls
function createVideoElement(videoData) {
    const reelDiv = document.createElement('div');
    reelDiv.className = 'reel';
    
    const video = document.createElement('video');
    video.src = videoData.data;
    video.loop = true;
    video.muted = false;
    video.volume = 1;
    
    // Create play button
    const playBtn = document.createElement('button');
    playBtn.className = 'play-control';
    playBtn.innerHTML = '⏸';
    playBtn.onclick = function() {
        if (video.paused) {
            video.play();
            playBtn.innerHTML = '⏸';
        } else {
            video.pause();
            playBtn.innerHTML = '▶';
        }
    };

    // Create volume button
    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'volume-control';
    volumeBtn.innerHTML = '🔊';
    volumeBtn.onclick = function() {
        if (video.muted || video.volume === 0) {
            video.muted = false;
            video.volume = 1;
            volumeBtn.innerHTML = '🔊';
        } else {
            video.muted = true;
            volumeBtn.innerHTML = '🔈';
        }
    };

    // Create fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'fullscreen-button';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.onclick = function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            reelDiv.requestFullscreen();
        }
    };

    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.onclick = async function() {
        if (videoData.id) {
            await deleteVideo(videoData.id);
        }
        reelDiv.remove();
        handleVideoVisibility();
    };

    // Create seek bar
    const seekBarContainer = document.createElement('div');
    seekBarContainer.className = 'seek-bar-container';
    const seekBarFill = document.createElement('div');
    seekBarFill.className = 'seek-bar-fill';
    seekBarContainer.appendChild(seekBarFill);

    // Update seek bar as video plays
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        seekBarFill.style.width = `${progress}%`;
    });

    // Handle seeking
    seekBarContainer.addEventListener('click', (e) => {
        const rect = seekBarContainer.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        video.currentTime = video.duration * clickPosition;
    });

    // Append all elements
    reelDiv.appendChild(video);
    reelDiv.appendChild(playBtn);
    reelDiv.appendChild(volumeBtn);
    reelDiv.appendChild(fullscreenBtn);
    reelDiv.appendChild(deleteButton);
    reelDiv.appendChild(seekBarContainer);

    return reelDiv;
}

// Function to load saved videos
async function loadSavedVideos() {
    try {
        const videos = await getAllVideos();
        const reelsContainer = document.querySelector('.reels-container');
        
        videos.forEach(videoData => {
            const reelDiv = createVideoElement(videoData);
            reelsContainer.appendChild(reelDiv);
        });

        handleVideoVisibility();
    } catch (error) {
        console.error('Error loading saved videos:', error);
    }
}

// Handle video upload
document.getElementById("addVideo").addEventListener("click", function() {
    document.getElementById("videoInput").click();
});

document.querySelector('#videoInput').addEventListener('change', async function(e) {
    const files = e.target.files;
    const reelsContainer = document.querySelector('.reels-container');
    
    for (let file of files) {
        try {
            // Save video to IndexedDB
            const videoId = await saveVideo(file);
            
            // Create video element
            const videoData = {
                id: videoId,
                data: URL.createObjectURL(file),
                type: file.type,
                name: file.name
            };
            
            const reelDiv = createVideoElement(videoData);
            reelsContainer.appendChild(reelDiv);
        } catch (error) {
            console.error('Error saving video:', error);
        }
    }
    
    e.target.value = '';
});

// Handle video visibility
function handleVideoVisibility() {
    const videos = document.querySelectorAll('.reel video');
    
    videos.forEach(video => {
        const rect = video.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const isVisible = visibleHeight > rect.height / 2;
        const playBtn = video.parentElement.querySelector('.play-control');

        if (!document.fullscreenElement) {
            if (isVisible) {
                const savedTime = video.currentTime;
                video.play().then(() => {
                    if (Math.abs(video.currentTime - savedTime) > 0.1) {
                        video.currentTime = savedTime;
                    }
                });
                video.muted = false;
                playBtn.innerHTML = '⏸';
            } else {
                video.pause();
                video.muted = true;
                playBtn.innerHTML = '▶';
            }
        }
    });
}

// Add scroll event listener for video visibility
document.querySelector('.reels-container').addEventListener('scroll', handleVideoVisibility);

// Add keyboard controls
document.addEventListener('keydown', (e) => {
    const currentVideo = Array.from(document.querySelectorAll('.reel video')).find(video => {
        const rect = video.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        return visibleHeight > rect.height / 2;
    });

    if (!currentVideo) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            const playBtn = currentVideo.parentElement.querySelector('.play-control');
            if (currentVideo.paused) {
                currentVideo.play();
                playBtn.innerHTML = '⏸';
            } else {
                currentVideo.pause();
                playBtn.innerHTML = '▶';
            }
            break;

        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            const previousVideo = currentVideo.closest('.reel').previousElementSibling;
            if (previousVideo) {
                previousVideo.scrollIntoView({ behavior: 'smooth' });
                setTimeout(handleVideoVisibility, 500);
            }
            break;

        case 'ArrowDown':
        case 'PageDown':
            e.preventDefault();
            const nextVideo = currentVideo.closest('.reel').nextElementSibling;
            if (nextVideo) {
                nextVideo.scrollIntoView({ behavior: 'smooth' });
                setTimeout(handleVideoVisibility, 500);
            }
            break;

        case 'KeyM':
            e.preventDefault();
            const volumeBtn = currentVideo.parentElement.querySelector('.volume-control');
            if (currentVideo.muted || currentVideo.volume === 0) {
                currentVideo.muted = false;
                currentVideo.volume = 1;
                volumeBtn.innerHTML = '🔊';
            } else {
                currentVideo.muted = true;
                volumeBtn.innerHTML = '🔈';
            }
            break;

        case 'KeyF':
            e.preventDefault();
            const reelDiv = currentVideo.closest('.reel');
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                reelDiv.requestFullscreen();
            }
            break;
    }
});

let isScrolling = false;
let lastScrollTime = 0;
const scrollCooldown = 800; // Cooldown period in milliseconds

document.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    const currentTime = Date.now();
    if (isScrolling || currentTime - lastScrollTime < scrollCooldown) return;
    
    const reels = Array.from(document.querySelectorAll('.reel'));
    const currentReel = reels.find(reel => {
        const rect = reel.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        return visibleHeight > rect.height / 2;
    });

    if (currentReel) {
        isScrolling = true;
        lastScrollTime = currentTime;
        
        const currentIndex = reels.indexOf(currentReel);
        const targetIndex = e.deltaY > 0 ? 
            Math.min(currentIndex + 1, reels.length - 1) : 
            Math.max(currentIndex - 1, 0);
            
        if (targetIndex !== currentIndex) {
            reels[targetIndex].scrollIntoView({ behavior: 'smooth' });
            
            // Reset scroll lock after animation
            setTimeout(() => {
                isScrolling = false;
                handleVideoVisibility();
            }, scrollCooldown);
        } else {
            isScrolling = false;
        }
    }
}, { passive: false });

// Also handle touch events for mobile
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].clientY;
    const currentTime = Date.now();
    
    if (isScrolling || currentTime - lastScrollTime < scrollCooldown) return;
    
    const deltaY = touchStartY - touchEndY;
    if (Math.abs(deltaY) > 50) { // Minimum swipe distance
        const event = new WheelEvent('wheel', {
            deltaY: deltaY
        });
        document.dispatchEvent(event);
    }
}, { passive: false });

// Update keydown event listener
document.addEventListener('keydown', (e) => {
    const reelsContainer = document.querySelector('.reels-container');
    const videos = document.querySelectorAll('.reel video');
    
    const currentVideo = Array.from(videos).find(video => {
        const rect = video.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        return visibleHeight > rect.height / 2;
    });

    switch (e.code) {
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            if (currentVideo) {
                const previousVideo = currentVideo.closest('.reel').previousElementSibling;
                if (previousVideo) {
                    previousVideo.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(handleVideoVisibility, 500);
                }
            }
            break;

        case 'ArrowDown':
        case 'PageDown':
            e.preventDefault();
            if (currentVideo) {
                const nextVideo = currentVideo.closest('.reel').nextElementSibling;
                if (nextVideo) {
                    nextVideo.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(handleVideoVisibility, 500);
                }
            }
            break;

        case 'ArrowRight':
            e.preventDefault();
            if (currentVideo) {
                currentVideo.volume = Math.min(1, currentVideo.volume + 0.1);
                const volumeBtn = currentVideo.parentElement.querySelector('.volume-control');
                if (volumeBtn) {
                    volumeBtn.innerHTML = currentVideo.volume > 0 ? '🔊' : '🔈';
                }
            }
            break;

        case 'ArrowLeft':
            e.preventDefault();
            if (currentVideo) {
                currentVideo.volume = Math.max(0, currentVideo.volume - 0.1);
                const volumeBtn = currentVideo.parentElement.querySelector('.volume-control');
                if (volumeBtn) {
                    volumeBtn.innerHTML = currentVideo.volume > 0 ? '🔊' : '🔈';
                }
            }
            break;

        case 'Escape':
            e.preventDefault();
            if (!document.fullscreenElement) {
                // Go back to previous page if not in fullscreen
                window.history.back();
            }
            break;

        case 'Space':
            e.preventDefault();
            if (currentVideo) {
                const playBtn = currentVideo.parentElement.querySelector('.play-control');
                if (currentVideo.paused) {
                    currentVideo.play();
                    if (playBtn) playBtn.innerHTML = '⏸';  // Pause symbol
                } else {
                    currentVideo.pause();
                    if (playBtn) playBtn.innerHTML = '▶';  // Play symbol
                }
            }
            break;

        case 'KeyF':  // F key for fullscreen
            e.preventDefault();
            if (currentVideo) {
                const reelDiv = currentVideo.closest('.reel');
                if (document.fullscreenElement) {
                    document.exitFullscreen().then(() => {
                        // Continue playing current video
                        currentVideo.play();
                        currentVideo.muted = false;
                        const playBtn = reelDiv.querySelector('.play-control');
                        if (playBtn) playBtn.innerHTML = '⏸';
                    });
                } else {
                    reelDiv.requestFullscreen().then(() => {
                        currentVideo.play();
                        currentVideo.muted = false;
                    });
                }
            }
            break;

        case 'KeyM':  // M key for mute/unmute
            e.preventDefault();
            if (currentVideo) {
                const volumeBtn = currentVideo.parentElement.querySelector('.volume-control');
                if (currentVideo.muted || currentVideo.volume === 0) {
                    currentVideo.muted = false;
                    currentVideo.volume = 1;
                    if (volumeBtn) volumeBtn.innerHTML = '🔊';
                } else {
                    currentVideo.muted = true;
                    if (volumeBtn) volumeBtn.innerHTML = '🔈';
                }
            }
            break;
    }
});

// Add volume bar to each reel when created
function createVolumeBar(reelDiv) {
    const volumeBarContainer = document.createElement('div');
    volumeBarContainer.className = 'volume-bar-container';
    volumeBarContainer.innerHTML = `
        <span class="volume-icon">🔊</span>
        <div class="volume-bar">
            <div class="volume-bar-fill"></div>
        </div>
        <span class="volume-level">100%</span>
    `;
    reelDiv.appendChild(volumeBarContainer);
    return volumeBarContainer;
}

// Update your volume control in the keydown event listener
let volumeBarTimeout;
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const currentVideo = Array.from(document.querySelectorAll('.reel video')).find(video => {
            const rect = video.getBoundingClientRect();
            const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            return visibleHeight > rect.height / 2;
        });

        if (currentVideo) {
            const reelDiv = currentVideo.closest('.reel');
            let volumeBarContainer = reelDiv.querySelector('.volume-bar-container');
            if (!volumeBarContainer) {
                volumeBarContainer = createVolumeBar(reelDiv);
            }

            // Update volume
            const volumeChange = e.code === 'ArrowRight' ? 0.1 : -0.1;
            currentVideo.volume = Math.max(0, Math.min(1, currentVideo.volume + volumeChange));
            
            // Update volume bar
            const volumeBarFill = volumeBarContainer.querySelector('.volume-bar-fill');
            const volumeLevel = volumeBarContainer.querySelector('.volume-level');
            const volumeIcon = volumeBarContainer.querySelector('.volume-icon');
            
            volumeBarFill.style.width = `${currentVideo.volume * 100}%`;
            volumeLevel.textContent = `${Math.round(currentVideo.volume * 100)}%`;
            volumeIcon.textContent = currentVideo.volume > 0 ? '🔊' : '🔈';

            // Show volume bar
            volumeBarContainer.classList.add('visible');
            
            // Hide volume bar after delay
            clearTimeout(volumeBarTimeout);
            volumeBarTimeout = setTimeout(() => {
                volumeBarContainer.classList.remove('visible');
            }, 2000);
        }
    }
});