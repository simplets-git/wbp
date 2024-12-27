jQuery(function($) {
    let chatMode = false;

    // AI Configuration
    const config = {
        huggingface_api_key: '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',
        ai_settings: {
            max_length: 50,        // Maximum response length
            temperature: 0.7,      // Creativity (0.0 - 1.0)
            top_p: 0.9,           // Nucleus sampling
            return_full_text: false
        }
    };

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
        greetings: 'Type "help" for available commands',
        prompt: '> ',
        height: '100%',
        width: '100%',
        completion: ['help', 'about', 'clear', 'echo', 'time', 'video', 'agent', 'exit'],
        onInit: function() {
            this.focus();
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
                this.echo('AI is thinking...');
                
                // Send message to Hugging Face API
                fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + config.huggingface_api_key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: command
                    })
                })
                .then(async response => {
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API Error:', errorText);
                        throw new Error(`API error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!Array.isArray(data) || !data[0]?.generated_text) {
                        console.error('Unexpected API response format:', data);
                        throw new Error('Invalid response format');
                    }
                    this.echo('AI: ' + data[0].generated_text);
                })
                .catch(error => {
                    console.error('AI chat error:', error);
                    this.error('Sorry, there was an error: ' + error.message);
                });
            } else {
                this.error(`Command not found: '${command}'\nType 'help' to see available commands.`);
            }
        }
    });

    // Ensure terminal is focused when needed
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#video-container').length) {
            term.focus();
        }
    });

    // Initial focus
    term.focus();
}); 