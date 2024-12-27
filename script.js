jQuery(function($) {
    $('#terminal').terminal({
        help: function() {
            this.echo('Available commands:');
            this.echo('help     - Show this help message');
            this.echo('about    - About this terminal');
            this.echo('clear    - Clear the terminal');
            this.echo('echo     - Echo a message');
            this.echo('time     - Show current time');
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
        }
    }, {
        greetings: false,
        prompt: '> ',
        height: '100%',
        completion: ['help', 'about', 'clear', 'echo', 'time'],
        onInit: function() {
            this.echo('Type "help" to see available commands.');
        }
    });
}); 