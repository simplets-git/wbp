jQuery(function($) {
    let chatMode = false;

    // Configure terminal with proper focus handling
    const term = $('#terminal').terminal({
        help: function() {
            this.echo('Available commands:');
            this.echo('help     - Show this help message');
            this.echo('about    - About this terminal');
            this.echo('clear    - Clear the terminal');
            this.echo('echo     - Echo a message');
            this.echo('time     - Show current time');
            this.echo('video    - Play demo video');
            this.echo('agent    - Chat with AI agent');
            this.echo('exit     - Exit chat mode');
        },
        about: function() {
            this.echo('Welcome to the interactive terminal.');
            this.echo('Type "help" to see available commands.');
        },
        time: function() {
            this.echo(new Date().toLocaleString());
        },
        echo: function(...args) {
            this.echo(args.join(' '));
        },
        video: function() {
            this.echo('Loading video...');
            
            const videoContainer = document.createElement('div');
            videoContainer.id = 'video-container';
            videoContainer.innerHTML = `
                <video id="fullscreen-video" playsinline webkit-playsinline x5-video-player-type="h5" x5-video-player-fullscreen="true">
                    <source src="video.m4v" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            document.body.appendChild(videoContainer);
            
            const video = document.getElementById('fullscreen-video');
            
            // Lock screen orientation to landscape if possible
            try {
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape');
                }
            } catch (err) {
                console.log('Orientation lock not supported');
            }

            // Handle touch events for video
            let touchStartX = 0;
            videoContainer.addEventListener('touchstart', function(e) {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            videoContainer.addEventListener('touchend', function(e) {
                const touchEndX = e.changedTouches[0].clientX;
                const diff = touchStartX - touchEndX;
                
                // Swipe right to exit video
                if (Math.abs(diff) > 50 && diff < 0) {
                    videoContainer.remove();
                    this.enable();
                    this.echo('Video playback stopped.');
                }
            }.bind(this), { passive: true });

            // Add detailed error handling
            video.onerror = (e) => {
                const errorDetails = video.error ? `Code: ${video.error.code}, Message: ${video.error.message}` : 'Unknown error';
                console.error('Video error:', errorDetails);
                this.error('Error loading video. Please try again.');
                videoContainer.remove();
                this.enable();
            };

            video.onloadstart = () => {
                console.log('Video loading started');
                this.echo('Video starting to load...');
            };

            video.oncanplay = () => {
                console.log('Video can start playing');
                // Request fullscreen on mobile
                if (videoContainer.requestFullscreen) {
                    videoContainer.requestFullscreen();
                } else if (videoContainer.webkitRequestFullscreen) {
                    videoContainer.webkitRequestFullscreen();
                }
                
                // Start playing with sound
                video.play().then(() => {
                    video.volume = 1;
                }).catch(err => {
                    console.error('Play error:', err);
                    // On mobile, we might need user interaction
                    this.echo('Tap to play video with sound');
                    video.addEventListener('touchstart', function playHandler() {
                        video.play();
                        video.removeEventListener('touchstart', playHandler);
                    });
                });
            };

            // Handle video end
            video.addEventListener('ended', () => {
                // Exit fullscreen if needed
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                
                videoContainer.remove();
                this.enable();
                this.echo('Video playback completed.');
            });

            // Handle ESC key and back button
            const handleExit = () => {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                videoContainer.remove();
                this.enable();
                this.echo('Video playback stopped.');
            };

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    handleExit();
                }
            });

            // Handle back button on mobile
            window.addEventListener('popstate', handleExit);

            this.disable();
        },
        agent: function() {
            chatMode = true;
            this.set_prompt('chat> ');
            this.echo('Entering chat mode with AI agent...');
            this.echo('Type "exit" to leave chat mode');
            this.echo('Tips: Keep messages under 50 characters for best results');
        },
        exit: function() {
            if (chatMode) {
                chatMode = false;
                this.set_prompt('> ');
                this.echo('Exiting chat mode...');
            } else {
                this.error('Not in chat mode');
            }
        }
    }, {
        greetings: false,
        prompt: '> ',
        height: '100%',
        width: '100%',
        completion: ['help', 'about', 'clear', 'echo', 'time', 'video', 'agent', 'exit'],
        onInit: function() {
            // No initial message
        },
        onCommandNotFound: function(command) {
            if (chatMode) {
                // Input validation
                if (command.trim().length === 0) {
                    this.error('Please type a message');
                    return;
                }
                if (command.length > 100) {
                    this.error('Message too long. Please keep under 100 characters');
                    return;
                }

                // Show loading state
                this.pause();
                const loadingMessage = this.echo('AI is thinking...');
                
                // Send message to Hugging Face API
                fetch('https://api-inference.huggingface.co/models/EleutherAI/pythia-70m-deduped', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + config.huggingface_api_key
                    },
                    body: JSON.stringify({
                        inputs: command,
                        parameters: config.ai_settings
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Remove loading message
                    loadingMessage.remove();
                    
                    if (!data || !data[0] || !data[0].generated_text) {
                        throw new Error('Invalid response from AI');
                    }

                    // Process and format response
                    let response = data[0].generated_text || '';
                    response = response.trim().substring(0, 50);
                    
                    // Check for empty response
                    if (response.length === 0) {
                        throw new Error('AI returned empty response');
                    }

                    this.echo('AI: ' + response);
                })
                .catch(error => {
                    // Remove loading message
                    loadingMessage.remove();
                    
                    console.error('AI Error:', error);
                    
                    // User-friendly error messages
                    if (error.message.includes('HTTP error! status: 429')) {
                        this.error('AI is busy. Please try again in a moment.');
                    } else if (error.message.includes('HTTP error! status: 401')) {
                        this.error('AI authentication failed. Please check API key.');
                    } else if (error.message.includes('HTTP error! status: 503')) {
                        this.error('AI service is temporarily unavailable.');
                    } else if (error.message === 'Failed to fetch') {
                        this.error('Network error. Please check your connection.');
                    } else {
                        this.error('Error connecting to AI service. Please try again.');
                    }
                })
                .finally(() => {
                    this.resume();
                });
            } else {
                this.error(`Command not found: '${command}'\nType 'help' to see available commands.`);
            }
        },
        clickTimeout: 0,
        focusOnClick: true
    });

    // Keep terminal focused but allow touch events
    const terminal = $('#terminal').terminal();
    let focusInterval = setInterval(() => {
        if (!document.querySelector('#video-container')) {
            terminal.focus(true);
        }
    }, 100);

    // Ensure terminal is focused when needed
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#video-container').length) {
            term.focus();
        }
    });

    // Initial focus
    term.focus();
}); 