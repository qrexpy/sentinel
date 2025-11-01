# Sentinel

A Discord bot that helps manage GitHub workflows, pull requests, and repository activities directly from Discord.

## Features

- List and check pull requests
- View repository statistics
- Manage GitHub workflows
- Interactive command interface

## Prerequisites

- Node.js 18.x or higher
- A Discord bot token
- A GitHub personal access token (optional - only needed for commands that modify repos like star, gist, workflow run)
- A Discord server where you have administrator permissions

**Note:** Sentinel works tokenless by default! Without a GitHub token, the bot can only access public repositories, ensuring your private repos remain secure. Some commands (like `/star`, `/gist create`, `/workflow run`) require authentication and will prompt you if a token isn't available.

## Local Development Setup

1. Clone this repository:
```bash
git clone https://github.com/qrexpy/sentinel.git
cd sentinel
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
GITHUB_TOKEN=your_github_personal_access_token (optional)
```

**Tokenless Mode:** If you don't provide a `GITHUB_TOKEN`, Sentinel will work with public repositories only, keeping your private repos secure. This is the recommended setup for most users.

4. Build the project:
```bash
npm run build
```

5. Start the bot:
```bash
npm start
```

## Deploying to Vercel

1. Install the Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy the project:
```bash
vercel
```

4. Set up the environment variables in the Vercel dashboard:
   - Go to your project settings
   - Add the environment variables from your `.env` file

5. For production deployment:
```bash
vercel --prod
```

## Available Commands

### Pull Request Management
- `/pr list [repo]` - List all open pull requests in a repository
- `/pr check [repo] [number]` - View details of a specific pull request

### Repository Information
- `/repo [repository]` - View repository statistics and information

### Workflow Management
- `/workflow list [repo]` - List available workflows in a repository
- `/workflow run [repo] [workflow]` - Trigger a specific workflow (requires token)

### Issue Management
- `/issue view [repo] [number]` - View details of a specific issue
- `/issue list [repo]` - List issues in a repository

### Release Information
- `/release latest [repo]` - Get the latest release
- `/release list [repo]` - List all releases

### Commit Information
- `/commit [repo] [sha]` - View a specific commit by SHA
- `/commit [repo]` - View recent commits on a branch

### Other Commands
- `/user [username]` - View GitHub user profile and stats
- `/search code [query]` - Search for code across GitHub
- `/search repositories [query]` - Search for repositories
- `/branch list [repo]` - List branches in a repository
- `/branch create [repo] [name]` - Create a branch (requires token)
- `/branch delete [repo] [name]` - Delete a branch (requires token)
- `/star [repo]` - Star a repository (requires token)
- `/gist create` - Create a GitHub Gist (requires token)
- `/markdown [text]` - Render GitHub Flavored Markdown

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---


<div align="center">

**Sentinel** integrates with GitHub to provide Discord-based GitHub management.

<a href="https://github.com">
  <img src="https://github.githubassets.com/assets/GitHub-Logo-ee398b662d42.png" alt="GitHub" height="32">
</a>

<small>GitHub logos and branding used in accordance with <a href="https://github.com/logos">GitHub's Logo Usage Guidelines</a>.</small>

</div> 
