document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const output = document.getElementById('output');
    
    // Available commands
    const commands = {
        help: 'Available commands: help, clear, about, contact',
        about: 'Welcome to my terminal website!\nI am a developer who loves creating cool stuff.',
        contact: 'Email: your@email.com\nGitHub: github.com/yourusername',
        clear: () => output.innerHTML = '',
    };

    // Handle command input
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = input.value.toLowerCase().trim();
            
            // Add command to output
            output.innerHTML += `\nguest@website:~$ ${command}\n`;
            
            // Process command
            if (command in commands) {
                if (typeof commands[command] === 'function') {
                    commands[command]();
                } else {
                    output.innerHTML += commands[command];
                }
            } else if (command !== '') {
                output.innerHTML += `Command not found: ${command}`;
            }
            
            // Clear input and scroll to bottom
            input.value = '';
            window.scrollTo(0, document.body.scrollHeight);
        }
    });

    // Initial focus
    input.focus();
    
    // Refocus input when clicking anywhere in terminal
    document.querySelector('.terminal').addEventListener('click', () => {
        input.focus();
    });
}); 