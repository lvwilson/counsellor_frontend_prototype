class ChatInterface {
    constructor() {
        this.conversationId = null;
        this.userId = 'user-' + Math.random().toString(36).substr(2, 9);
        this.userName = 'User';
        this.initialize();
    }

    initialize() {
        // DOM elements
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');
        this.newSessionButton = document.getElementById('newSession');
        this.generateReportButton = document.getElementById('generateReport');
        this.reportContent = document.getElementById('reportContent');

        // Event listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.newSessionButton.addEventListener('click', () => this.createNewSession());
        this.generateReportButton.addEventListener('click', () => this.generateReport());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Create initial session
        this.createNewSession();
    }

    async createNewSession() {
        try {
            const response = await fetch('/create_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: null  // Allow the server to generate one
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create conversation');
            }

            const data = await response.json();
            console.log('Created new conversation:', data);
            this.conversationId = data.conversation_id;
            this.chatMessages.innerHTML = '';
            this.reportContent.innerHTML = '';
            
            // Add welcome message
            this.addMessage({
                author_name: 'Counsellor',
                content: 'Hello! I\'m here to listen and help. What brings you here today?',
                author_id: 'counsellor',
            });
        } catch (error) {
            console.error('Failed to create new session:', error);
            this.showError('Failed to create new session: ' + error.message);
            throw error;
        }
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;

        try {
            // Add user message to UI immediately
            this.addMessage({
                author_name: this.userName,
                content: content,
                author_id: this.userId,
            });

            // Clear input
            this.messageInput.value = '';

            // Send message to server
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    author_name: this.userName,
                    content: content,
                    author_id: this.userId,
                    conversation_id: this.conversationId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            // Generate counsellor response
            await this.generateCounsellorResponse();
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message: ' + error.message);
            throw error;
        }
    }

    async generateCounsellorResponse() {
        try {
            const response = await fetch('/generate_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: this.conversationId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate response');
            }

            const data = await response.json();
            this.addMessage({
                author_name: 'Counsellor',
                content: data.response,
                author_id: 'counsellor',
            });
        } catch (error) {
            console.error('Failed to generate counsellor response:', error);
            this.showError('Failed to generate counsellor response: ' + error.message);
            throw error;
        }
    }

    async generateReport() {
        try {
            const response = await fetch('/generate_report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: this.conversationId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate report');
            }

            const data = await response.json();
            this.reportContent.textContent = data.response;
        } catch (error) {
            console.error('Failed to generate report:', error);
            this.showError('Failed to generate report: ' + error.message);
            throw error;
        }
    }

    addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.author_id === 'counsellor' ? 'counsellor' : 'user'}`;
        
        const metaElement = document.createElement('div');
        metaElement.className = 'message-meta';
        metaElement.textContent = message.author_name;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.textContent = message.content;
        
        messageElement.appendChild(metaElement);
        messageElement.appendChild(contentElement);
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showError(message) {
        console.error(message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        this.chatMessages.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the chat interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatInterface = new ChatInterface();
});
