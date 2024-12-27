jQuery(function($) {
    let chatMode = false;

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
                <video id="fullscreen-video" controls>
                    <source src="https://raw.githubusercontent.com/simplets-git/wbp/main/video.m4v" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            document.body.appendChild(videoContainer);
            
            const video = document.getElementById('fullscreen-video');
            
            // Add detailed error handling
            video.onerror = () => {
                const errorDetails = video.error ? `Code: ${video.error.code}, Message: ${video.error.message}` : 'Unknown error';
                this.error('Error loading video: ' + errorDetails);
                videoContainer.remove();
                this.enable();
            };

            // Add loading handling with more feedback
            video.onloadstart = () => {
                this.echo('Video starting to load...');
            };

            video.onloadedmetadata = () => {
                this.echo('Video metadata loaded...');
            };

            video.oncanplay = () => {
                this.echo('Video can start playing...');
            };

            video.onloadeddata = () => {
                this.echo('Video loaded, starting playback...');
                video.play().catch(err => {
                    this.error('Error playing video: ' + err.message);
                    videoContainer.remove();
                    this.enable();
                });
            };

            // Handle video end
            video.addEventListener('ended', () => {
                videoContainer.remove();
                this.enable();
                this.echo('Video playback completed.');
            });

            // Handle ESC key
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    videoContainer.remove();
                    this.enable();
                    this.echo('Video playback stopped.');
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);

            // Disable terminal while video is playing
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

    // Keep terminal focused
    const terminal = $('#terminal').terminal();
    setInterval(() => {
        terminal.focus(true);
    }, 100);
}); 