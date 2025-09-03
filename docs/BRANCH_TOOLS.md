# Branch Management Scripts 🛠️

## Quick Setup Scripts for Descendants Development

### 🚀 Feature Branch Creator
```bash
#!/bin/bash
# Usage: ./scripts/new-feature.sh "simulant-ai-enhancement"

FEATURE_NAME=$1
if [ -z "$FEATURE_NAME" ]; then
    echo "❌ Please provide a feature name"
    echo "Usage: ./scripts/new-feature.sh 'your-feature-name'"
    exit 1
fi

echo "🌿 Creating new feature branch: feature/$FEATURE_NAME"

# Switch to dev and get latest
git checkout dev
git pull origin dev

# Create and checkout feature branch
git checkout -b "feature/$FEATURE_NAME"

echo "✅ Created feature branch: feature/$FEATURE_NAME"
echo "🚀 You can now start developing!"
echo ""
echo "Next steps:"
echo "1. Make your changes"
echo "2. git add . && git commit -m 'feat: your changes'"
echo "3. git push -u origin feature/$FEATURE_NAME"
echo "4. Create a Pull Request to dev branch"
```

### 🧹 Branch Cleanup Script
```bash
#!/bin/bash
# Usage: ./scripts/cleanup-branches.sh

echo "🧹 Cleaning up merged branches..."

# Switch to dev
git checkout dev
git pull origin dev

# List merged branches (excluding main and dev)
MERGED_BRANCHES=$(git branch --merged | grep -v -E "(main|dev|\*)")

if [ -z "$MERGED_BRANCHES" ]; then
    echo "✅ No merged branches to clean up"
else
    echo "🗑️  Found merged branches to delete:"
    echo "$MERGED_BRANCHES"
    echo ""
    read -p "Delete these branches? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$MERGED_BRANCHES" | xargs -n 1 git branch -d
        echo "✅ Merged branches deleted"
    else
        echo "❌ Cleanup cancelled"
    fi
fi

# Clean up remote tracking branches
git remote prune origin

echo "✅ Branch cleanup complete!"
```

### 🚨 Hotfix Creator
```bash
#!/bin/bash
# Usage: ./scripts/hotfix.sh "critical-performance-issue"

ISSUE_NAME=$1
if [ -z "$ISSUE_NAME" ]; then
    echo "❌ Please provide an issue name"
    echo "Usage: ./scripts/hotfix.sh 'critical-issue-description'"
    exit 1
fi

echo "🚨 Creating hotfix branch: hotfix/$ISSUE_NAME"

# Switch to main and get latest
git checkout main
git pull origin main

# Create hotfix branch
git checkout -b "hotfix/$ISSUE_NAME"

echo "✅ Created hotfix branch: hotfix/$ISSUE_NAME"
echo "🚨 IMPORTANT: This branch will need TWO PRs:"
echo "   1. hotfix/$ISSUE_NAME → main (production fix)"
echo "   2. hotfix/$ISSUE_NAME → dev (keep dev in sync)"
```

### 📦 Release Preparation
```bash
#!/bin/bash
# Usage: ./scripts/prepare-release.sh "1.2.0"

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "❌ Please provide a version number"
    echo "Usage: ./scripts/prepare-release.sh '1.2.0'"
    exit 1
fi

echo "📦 Preparing release: v$VERSION"

# Switch to dev and get latest
git checkout dev
git pull origin dev

# Create release branch
git checkout -b "release/v$VERSION"

# Update package.json version
if [ -f "package.json" ]; then
    npm version $VERSION --no-git-tag-version
    echo "✅ Updated package.json to version $VERSION"
fi

echo "📝 Release branch created: release/v$VERSION"
echo ""
echo "Next steps:"
echo "1. Update CHANGELOG.md"
echo "2. Test thoroughly"
echo "3. Commit changes: git commit -am 'chore: prepare release v$VERSION'"
echo "4. Push: git push -u origin release/v$VERSION"
echo "5. Create PR to main branch"
echo "6. After merge, tag the release: git tag v$VERSION && git push origin v$VERSION"
```

## 📋 Git Aliases for Descendants Development

Add these to your `~/.gitconfig`:

```ini
[alias]
    # Descendants-specific aliases
    desc-sync = "!f() { git checkout dev && git pull origin dev; }; f"
    desc-feature = "!f() { git checkout dev && git pull origin dev && git checkout -b feature/$1; }; f"
    desc-push = "!f() { git push -u origin $(git branch --show-current); }; f"
    desc-cleanup = "!f() { git checkout dev && git pull origin dev && git branch --merged | grep -v -E '(main|dev|\\*)' | xargs -n 1 git branch -d && git remote prune origin; }; f"
    
    # General productivity aliases
    co = checkout
    br = branch
    ci = commit
    st = status
    lg = log --oneline --graph --decorate --all -10
    last = log -1 HEAD
    unstage = reset HEAD --
    
    # 3D development specific
    perf-test = "!echo 'Run: pnpm dev and test with 1000+ blocks at 60 FPS'"
    
    # AI development specific  
    ai-test = "!echo 'Test Gemini AI integration and simulant behavior'"
```

Usage examples:
```bash
git desc-sync              # Sync with dev branch
git desc-feature "new-lod" # Create feature/new-lod branch
git desc-push              # Push current branch with upstream
git desc-cleanup           # Clean merged branches
git lg                     # Pretty log
```

## 🎯 VS Code Integration

### Recommended Extensions:
- GitLens
- Git Graph  
- GitHub Pull Requests
- Git History

### VS Code Settings (`.vscode/settings.json`):
```json
{
  "git.defaultCloneDirectory": "~/Desktop/Projects",
  "git.autofetch": true,
  "git.enableSmartCommit": true,
  "git.confirmSync": false,
  "githubPullRequests.defaultMergeMethod": "squash",
  "githubPullRequests.pullBranch": "never"
}
```

Save this file as `scripts/branch-tools.md` for team reference!