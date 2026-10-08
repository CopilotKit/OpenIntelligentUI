# Contributing to Open Generative UI

⭐ Thank you for your interest in contributing!!

Here's how you can contribute to this repository.

## How can I contribute?

**Please reach out to us first before starting any significant work on new or existing features.**

We love community contributions! That said, we want to make sure we're all on the same page before you start.
Investing a lot of time and effort just to find out it doesn't align with the project feels awful, and we don't want that to happen.
It also helps to make sure the work you're planning isn't already in progress.

Please file an issue first: [https://github.com/CopilotKit/OpenIntelligentUI/issues](https://github.com/CopilotKit/OpenIntelligentUI/issues)
Or, reach out to us on Discord: https://discord.com/invite/6dffbvGU3D

Ready to contribute but seeking guidance? Reach out to us directly on [Discord](https://discord.gg/6dffbvGU3D) for immediate assistance! Alternatively, you're welcome to raise an issue and one of our dedicated maintainers will promptly steer you in the right direction!

## Found a bug?

If you find a bug in the source code, you can help us by [submitting an issue](https://github.com/CopilotKit/OpenIntelligentUI/issues/new) to our GitHub Repository. Even better, you can submit a Pull Request with a fix.

## Missing a feature?

So, you've got an awesome feature in mind? Throw it over to us by [creating an issue](https://github.com/CopilotKit/open-generative-ui/issues/new) on our GitHub Repo.

# How do I make a code contribution?

## Step 1: Make a fork

Fork the [OpenIntelligentUI](https://github.com/CopilotKit/OpenIntelligentUI) repository to your GitHub account. This means that you'll have a copy of the repository under _your-GitHub-username/OpenIntelligentUI_.

## Step 2: Clone the repository to your local machine

```bash
git clone https://github.com/<your-GitHub-username>/OpenGenerativeUI
```

## Step 3: Prepare the development environment

This is a **Turborepo monorepo** with a Next.js frontend and a LangGraph Python agent.

### 1) Install Prerequisites

- Node.js 20.x or later
- pnpm v9.x installed globally (`npm i -g pnpm@^9`)
- Python 3.11+ (for the agent)

> **Windows users:** Enable **Developer Mode** (Settings > System > For developers > Developer Mode → On) to allow symlink creation. This is required for Next.js standalone builds and pnpm to work correctly.

### 2) Install Dependencies and Set Up

The quickest way to get started is with the Makefile:

```bash
make setup    # Installs deps + creates .env template
```

Or manually:

```bash
pnpm install
echo 'ANTHROPIC_API_KEY=your-key-here' > apps/agent/.env
```

Then add your real Anthropic API key to `apps/agent/.env`.

### 3) Run the Project

```bash
make dev      # Start all services (frontend + agent + mcp)
```

Or run services individually:

```bash
make dev-app    # Next.js frontend on http://localhost:3000
make dev-agent  # LangGraph agent on http://localhost:8123
make dev-mcp    # MCP server
```

You can also use `pnpm` directly:

```bash
pnpm dev          # All services
pnpm dev:app      # Frontend only
pnpm dev:agent    # Agent only
```

### 4) Build and Lint

```bash
make build    # Build all apps
make lint     # Lint all apps
make clean    # Clean build artifacts
```

Run `make help` to see all available commands.

## Step 4: Create a branch

Create a new branch for your changes.
In order to keep branch names uniform and easy-to-understand, please use the following conventions for branch naming:

- for docs changes: `docs/<ISSUE_NUMBER>-<CUSTOM_NAME>`
- for new features: `feat/<ISSUE_NUMBER>-<CUSTOM_NAME>`
- for bug fixes: `fix/<ISSUE_NUMBER>-<CUSTOM_NAME>`

```bash
git checkout -b <new-branch-name-here>
```

## Step 5: Make your changes

The project has two main areas you can contribute to:

| Area | Location | Tech |
|------|----------|------|
| **Frontend** | `apps/app/` | Next.js 16, React 19, Tailwind CSS 4, CopilotKit v2 |
| **Agent** | `apps/agent/` | LangGraph, Python, CopilotKit middleware |

## Step 6: Add the changes that are ready to be committed

Stage the changes that are ready to be committed:

```bash
git add .
```

## Step 7: Commit the changes (Git)

Commit the changes with a short message. (See below for more details on how we structure our commit messages)

```bash
git commit -m "<type>(<scope>): <subject>"
```

## Step 8: Push the changes to the remote repository

Push the changes to the remote repository using:

```bash
git push origin <branch-name-here>
```

## Step 9: Create Pull Request

In GitHub, do the following to submit a pull request to the upstream repository:

1.  Give the pull request a title and a short description of the changes made. Include also the issue or bug number associated with your change. Explain the changes that you made, any issues you think exist with the pull request you made, and any questions you have for the maintainer.

Remember, it's okay if your pull request is not perfect (no pull request ever is). The reviewer will be able to help you fix any problems and improve it!

2.  Wait for the pull request to be reviewed by a maintainer.

3.  Make changes to the pull request if the reviewing maintainer recommends them.

Celebrate your success after your pull request is merged :-)

## Git Commit Messages

We structure our commit messages like this:

```
<type>(<scope>): <subject>
```

Example

```
feat(agent): add new visualization tool for 3D scenes
fix(app): correct iframe resize observer cleanup
docs(readme): update architecture diagram
```

### Types:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Changes to the documentation
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

### Scopes:

- **app**: Changes to the Next.js frontend (`apps/app/`)
- **agent**: Changes to the LangGraph agent (`apps/agent/`)
- **readme**: Documentation changes

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

[Code of Conduct](./CODE_OF_CONDUCT.md)

Our Code of Conduct means that you are responsible for treating everyone on the project with respect and courtesy.

## Need Help?

- **Questions**: Use our [Discord support channel](https://discord.com/invite/6dffbvGU3D) for any questions you have.
- **Resources**: Visit [CopilotKit documentation](https://docs.copilotkit.ai/) for more helpful documentation.

⭐ Happy coding, and we look forward to your contributions!
