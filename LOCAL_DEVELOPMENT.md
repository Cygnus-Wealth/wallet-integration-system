# Local Development Workflow

This guide explains how to work with local versions of `@cygnus-wealth/data-models` during development while ensuring published versions are used for releases.

## Setup

First, install the git hooks that will prevent pushing local dependencies:

```bash
npm run install-hooks
```

## Development Workflow

### 1. Link Local data-models for Development

When you need to test changes to `@cygnus-wealth/data-models` locally:

```bash
# If data-models is in a sibling directory
npm run link-local

# Or specify the path explicitly
npm run link-local ../path/to/data-models
```

This will:
- Create a global npm link for `@cygnus-wealth/data-models`
- Link it in this project
- Allow you to see changes immediately without publishing

### 2. Make Your Changes

Now you can:
- Edit files in the data-models repository
- Changes will be reflected immediately in this project
- No need to rebuild or reinstall

### 3. Switch Back to Published Version

Before committing or pushing:

```bash
# Install latest published version
npm run use-published

# Or install a specific version
npm run use-published 1.2.3
```

## Git Hooks

The pre-push hook will prevent you from pushing if:
- `package.json` contains local file references (`file:...`)
- npm packages are linked (symlinks in node_modules)
- `package-lock.json` contains local file references

If the hook prevents pushing, run `npm run use-published` to fix it.

## Available Scripts

- `npm run link-local [path]` - Link local data-models for development
- `npm run use-published [version]` - Switch to published version
- `npm run install-hooks` - Install git hooks
- `npm run prepush` - Manually run pre-push checks

## Best Practices

1. Always use `npm run link-local` for local development
2. Always run `npm run use-published` before:
   - Creating pull requests
   - Publishing packages
   - Tagging releases
3. Keep the git hooks installed to prevent accidental pushes
4. Document in PRs if you've tested with local dependencies

## Troubleshooting

### "Could not find data-models directory"
The script looks for data-models in common locations. Specify the path explicitly:
```bash
npm run link-local /absolute/path/to/data-models
```

### "Error: Failed to install @cygnus-wealth/data-models"
Ensure you have access to the npm registry where the package is published.

### Changes not reflecting after linking
1. Ensure you've built the data-models project
2. Check that the link was created successfully: `ls -la node_modules/@cygnus-wealth/`
3. Try unlinking and relinking