jQuery(function($) {
    let chatMode = false;

    // Prevent mobile keyboard from popping up automatically
    document.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });

    $('#terminal').terminal({
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
                // Send message to AI API
                this.pause();
                fetch('https://api.community-ai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer YOUR_API_KEY'
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: command }]
                    })
                })
                .then(response => response.json())
                .then(data => {
                    this.echo('AI: ' + data.choices[0].message.content);
                })
                .catch(error => {
                    this.error('Error connecting to AI service');
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
}); 