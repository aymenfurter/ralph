#!/bin/bash

# setup_env.sh
# Usage: ./setup_env.sh
# Sets environment variables permanently in the user's shell profile.

# Exit on error
set -e

ENV_FILE=".env"
TEMPLATE_FILE=".env.template"

# Function to create template
create_template() {
    cat <<EOF > "$TEMPLATE_FILE"
# Telegram Bot Configuration
RALPH_TELEGRAM_BOT_TOKEN=your_token_here
RALPH_TELEGRAM_CHAT_ID=your_chat_id_here
RALPH_TELEGRAM_ALLOWED_USERS=user1,user2
RALPH_TELEGRAM_STATUS_INTERVAL=60

# OpenAI Configuration
RALPH_OPENAI_API_KEY=your_openai_key_here
EOF
    echo "Created $TEMPLATE_FILE"
}

if [ ! -f "$ENV_FILE" ]; then
    echo "WARNING: $ENV_FILE not found."
    create_template
    echo "Please copy $TEMPLATE_FILE to $ENV_FILE, fill in your values, and run this script again."
    exit 1
fi

# Detect shell profile
SHELL_PROFILE=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    if [ -f "$HOME/.bash_profile" ]; then
        SHELL_PROFILE="$HOME/.bash_profile"
    elif [ -f "$HOME/.bashrc" ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    else
        SHELL_PROFILE="$HOME/.bash_profile"
    fi
else
    # Fallback to .profile
    SHELL_PROFILE="$HOME/.profile"
fi

if [ ! -f "$SHELL_PROFILE" ]; then
    echo "Creating $SHELL_PROFILE..."
    touch "$SHELL_PROFILE"
fi

echo "Detected shell profile: $SHELL_PROFILE"
echo "Reading environment variables from $ENV_FILE and adding to $SHELL_PROFILE..."

# Read .env file line by line
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Clean quotes from value if they exist (simple handling)
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    
    if [ -n "$key" ] && [ -n "$value" ]; then
        # Check if variable is already exported in profile
        if grep -q "export $key=" "$SHELL_PROFILE"; then
            echo "Updating $key in $SHELL_PROFILE"
            # Escape special characters for sed replacement
            # Escape forward slashes (common in paths/keys) 
            escaped_value=$(printf '%s\n' "$value" | sed -e 's/[\/&]/\\&/g')
            
            # Use sed to replace the line starting with export KEY=...
            # Note: macOS sed handles -i differently (requires backup extension), 
            # while GNU sed handles -i with no extension if empty string is passed properly.
            # Using a temp file is safest.
            sed "s|^export $key=.*|export $key=\"$value\"|" "$SHELL_PROFILE" > "${SHELL_PROFILE}.tmp" && mv "${SHELL_PROFILE}.tmp" "$SHELL_PROFILE"
        else
            echo "Adding $key to $SHELL_PROFILE"
            echo "export $key=\"$value\"" >> "$SHELL_PROFILE"
        fi
    fi

done < "$ENV_FILE"

echo ""
echo "✅ Environment variables have been processed in $SHELL_PROFILE"
echo "To apply changes immediately, run:"
echo "source $SHELL_PROFILE"
