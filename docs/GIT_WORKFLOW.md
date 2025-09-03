# Git Workflow & Branching Strategy 🌿

## Overview
This document outlines the Git workflow for the Descendants project, designed for 2-3 developers working collaboratively on a complex 3D metaverse application.

## Branch Structure

### 🌟 **Main Branches**

#### `main` 
- **Purpose**: Production-ready code
- **Protection**: 🔒 Protected, requires PR approval
- **Merges from**: `dev` branch only (via release PRs)
- **Deploy**: Automatic deployment to production
- **Never commit directly to main**

#### `dev`
- **Purpose**: Integration branch for ongoing development
- **Protection**: 🔒 Protected, requires PR approval  
- **Merges from**: Feature branches, hotfix branches
- **Deploy**: Automatic deployment to staging/development environment
- **Quality Gate**: All tests must pass, code review required

### 🚀 **Supporting Branches**

#### `feature/*`
- **Naming**: `feature/animation-performance-improvements`
- **Created from**: `dev`
- **Merged to**: `dev`
- **Purpose**: New features, enhancements, major refactors
- **Examples**:
  - `feature/simulant-ai-enhancement`
  - `feature/grid-system-optimization`
  - `feature/camera-controls-improvement`

#### `bugfix/*`
- **Naming**: `bugfix/fix-lod-distance-calculation`
- **Created from**: `dev`
- **Merged to**: `dev`
- **Purpose**: Non-critical bug fixes

#### `hotfix/*`
- **Naming**: `hotfix/critical-performance-issue`
- **Created from**: `main`
- **Merged to**: Both `main` AND `dev`
- **Purpose**: Critical production fixes that can't wait for next release

#### `release/*`
- **Naming**: `release/v1.2.0`
- **Created from**: `dev`
- **Merged to**: `main` (then tagged)
- **Purpose**: Prepare releases, final testing, version bumps

## 🔄 Developer Workflow

### Daily Development Flow

1. **Start New Feature**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Work on Feature**
   ```bash
   # Make changes
   git add .
   git commit -m "feat: implement simulant behavior improvements"
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Target: `dev` branch
   - Use PR template
   - Request review from team member
   - Ensure CI/CD passes

4. **After PR Approval**
   ```bash
   # Feature gets merged to dev by reviewer
   git checkout dev
   git pull origin dev
   git branch -d feature/your-feature-name
   ```

### 🚨 Hotfix Workflow

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-description
# Fix the issue
git commit -m "hotfix: resolve critical performance issue"
git push origin hotfix/critical-issue-description
```

**Create 2 PRs:**
1. `hotfix/critical-issue` → `main` (immediate production fix)
2. `hotfix/critical-issue` → `dev` (keep dev in sync)

### 📦 Release Workflow

```bash
git checkout dev
git pull origin dev
git checkout -b release/v1.2.0
# Update version numbers, changelog
git commit -m "chore: prepare release v1.2.0"
git push origin release/v1.2.0
# Create PR to main
# After merge, tag the release
git tag v1.2.0
git push origin v1.2.0
```

## 🏗️ Branch Protection Rules

### `main` Branch
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass (CI/CD)
- ✅ Require up-to-date branches before merging
- ✅ Include administrators in restrictions
- ✅ Allow force pushes: **NO**
- ✅ Allow deletions: **NO**

### `dev` Branch  
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass
- ✅ Require up-to-date branches before merging
- ✅ Allow force pushes: **NO**

## 📋 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Build process or auxiliary tool changes

### Examples:
```bash
feat(simulants): add distance-based LOD system
fix(grid): resolve console log performance issue
docs(readme): update installation instructions
perf(animation): optimize memory usage in animation controller
```

## 🎯 Project-Specific Guidelines

### For 3D/Animation Features:
- Always test performance with 1000+ blocks
- Verify 60 FPS target is maintained
- Test LOD system at various distances
- Check memory usage and cleanup

### For AI/Simulant Features:
- Test Gemini AI integration thoroughly
- Verify animation state transitions
- Check simulant behavior in various scenarios
- Test real-time synchronization

### For UI/UX Features:
- Test responsiveness across devices
- Verify Axiom Design System compliance
- Check accessibility standards
- Test with actual 3D viewport interactions

## 🚦 Code Review Guidelines

### Reviewer Responsibilities:
1. **Functionality**: Does it work as intended?
2. **Performance**: No degradation in 3D rendering
3. **Code Quality**: Readable, maintainable, follows patterns
4. **Testing**: Adequate test coverage
5. **Security**: No exposed secrets or vulnerabilities
6. **Documentation**: Code is well-documented

### PR Requirements:
- ✅ All CI checks pass
- ✅ No merge conflicts
- ✅ At least 1 approval from team member
- ✅ Performance benchmarks meet requirements
- ✅ No console.log statements in production code

## 🔧 Local Development Setup

```bash
# Clone and setup
git clone https://github.com/Cortana-Devs/Descendants.git
cd Descendants
pnpm install

# Always work on feature branches
git checkout dev
git pull origin dev
git checkout -b feature/your-new-feature

# Run development server
pnpm dev
```

## 📚 Quick Reference Commands

```bash
# Switch to dev and get latest
git checkout dev && git pull origin dev

# Create feature branch
git checkout -b feature/my-feature

# Push feature branch
git push -u origin feature/my-feature

# Update feature branch with latest dev
git checkout dev && git pull origin dev
git checkout feature/my-feature && git merge dev

# Clean up merged branches
git branch -d feature/merged-feature
git remote prune origin
```

## 🎭 Team Coordination

### Daily Sync:
- Share what you're working on
- Discuss any blocking issues
- Coordinate who reviews PRs
- Plan integration testing

### Branch Naming by Developer:
- **Developer 1**: Focus on `feature/simulant-*`, `feature/ai-*`
- **Developer 2**: Focus on `feature/world-*`, `feature/performance-*`
- **Shared**: `feature/integration-*`, `bugfix/*`, `docs/*`

This workflow ensures code quality, enables parallel development, and maintains a stable main branch while allowing rapid iteration on the dev branch.