# Arbot

Discord bot for AccSaber Reloaded. Links player profiles, assigns level-based roles, and surfaces platform data.

## Requirements

- Node.js 18+
- A Discord bot application with the `ManageRoles` permission
- The bot's role must be positioned above all level tier roles in the server hierarchy

## Quickstart

1. Install dependencies:

```
npm install
```

2. Copy the example config and fill in your values:

```
cp config.example.json config.json
```

- `clientId` - Bot application ID from the Discord Developer Portal
- `guildId` - Your Discord server ID
- `allowedChannels` - Array of channel IDs where commands are allowed (empty = all channels)
- `roles.player` - Role ID assigned to linked players on `/update`
- `roles.levelTiers.*` - Role IDs for each level tier (Newcomer through Ascendant)

3. Create a `.env` file with your bot token:

```
BOT_TOKEN=your_bot_token_here
```

The bot token is found in the Discord Developer Portal under your application > Bot > Token.

4. Register slash commands with Discord:

```
npm run deploy-commands
```

5. Start the bot:

```
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/update` | Sync your Discord roles based on your current AccSaber level |

Accounts are linked on the website, not through the bot: signing in at
https://accsaberreloaded.com with Discord creates the link the bot reads.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the bot in development mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled bot |
| `npm run deploy-commands` | Register slash commands with Discord |
