# 🔒 .gitignore Configuration Guide

## 📋 Overview

This document explains the .gitignore configuration for the Harvest Hope project, ensuring sensitive files, build artifacts, and development files are properly excluded from version control.

## 📁 .gitignore Files in Project

### 🏠 Root .gitignore (`/.gitignore`)
**Location**: Project root directory  
**Purpose**: Global exclusions for the entire project  
**Scope**: All subdirectories (frontend, backend, infrastructure, docs)

### ⚛️ Frontend .gitignore (`/frontend/.gitignore`)
**Location**: Frontend directory  
**Purpose**: Frontend-specific exclusions (Vite, React, TypeScript)  
**Scope**: Frontend application only

## 🔐 Critical Security Exclusions

### 🚨 Environment Variables (NEVER COMMIT!)
```gitignore
# Environment files containing API keys
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*.local
*.env
```

**Why Critical:**
- Contains Google Gemini API keys
- Database connection strings
- AWS credentials
- Other sensitive configuration

**What to Do:**
- ✅ Use `.env.example` for templates (committed)
- ✅ Add actual `.env` files to .gitignore (never committed)
- ✅ Use environment variables in production
- ❌ Never commit files with real API keys

### 🔑 API Keys and Secrets
```gitignore
# API Keys and Secrets
**/secrets.json
**/config/secrets.json
**/.secrets
**/private-key.json
**/service-account.json
**/*-key.json
**/*.pem
**/*.key
**/*.crt
```

**Protected Information:**
- Google Gemini API keys
- AWS access keys
- Database credentials
- SSL certificates
- Private keys

## 📦 Build Artifacts

### 🏗️ Compiled Output
```gitignore
# Build outputs
dist/
build/
out/
*/dist/
*/build/
*/out/
```

**Why Excluded:**
- Generated from source code
- Large file sizes
- Platform-specific
- Reproducible from source

**Included Directories:**
- `frontend/dist/` - Vite production build
- `backend/dist/` - Compiled Lambda functions
- `infrastructure/cdk.out/` - CDK CloudFormation templates

### 📚 Dependencies
```gitignore
# Dependencies
node_modules/
*/node_modules/
.pnp
.pnp.js
```

**Why Excluded:**
- Extremely large (100+ MB)
- Reproducible from package.json
- Platform-specific binaries
- Managed by npm/yarn

## 🛠️ Development Files

### 💻 IDE and Editor Files
```gitignore
# Visual Studio Code
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# JetBrains IDEs
.idea/
*.iml

# Vim
*.swp
*.swo

# Sublime Text
*.sublime-project
*.sublime-workspace
```

**Why Excluded:**
- Personal editor preferences
- Machine-specific paths
- Not relevant to other developers
- Can cause merge conflicts

**Exceptions:**
- `.vscode/extensions.json` - Recommended extensions (committed)
- `.vscode/settings.json` - Shared project settings (committed)

### 🧪 Test and Coverage Files
```gitignore
# Coverage
coverage/
*.lcov
.nyc_output/

# Test results
test-results/
playwright-report/
```

**Why Excluded:**
- Generated during testing
- Large file sizes
- Machine-specific results
- Reproducible by running tests

## ☁️ Cloud and Infrastructure

### 🏗️ AWS CDK
```gitignore
# AWS CDK
cdk.out/
*/cdk.out/
infrastructure/cdk.out/
```

**Why Excluded:**
- Generated CloudFormation templates
- Synthesized from CDK code
- Large JSON files
- Reproducible with `cdk synth`

### 📱 AWS Amplify
```gitignore
# AWS Amplify
amplify/#current-cloud-backend
amplify/.config/local-*
amplify/logs
amplify/backend/amplify-meta.json
aws-exports.js
```

**Why Excluded:**
- Generated configuration
- Environment-specific
- Contains deployment state
- Managed by Amplify CLI

## 🖥️ Operating System Files

### 🍎 macOS
```gitignore
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
```

### 🪟 Windows
```gitignore
Thumbs.db
Desktop.ini
$RECYCLE.BIN/
```

### 🐧 Linux
```gitignore
*~
```

**Why Excluded:**
- OS-generated metadata
- Not relevant to project
- Causes unnecessary diffs
- Platform-specific

## 📝 Logs and Temporary Files

### 📋 Log Files
```gitignore
# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*
```

**Why Excluded:**
- Runtime-generated
- Can be very large
- Contain sensitive information
- Not needed in repository

### 🗂️ Temporary Files
```gitignore
# Temporary folders
tmp/
temp/
.temp/
.tmp/
```

**Why Excluded:**
- Temporary by nature
- Not needed for project
- Can accumulate quickly
- Machine-specific

## 🎮 Project-Specific Exclusions

### 🌾 Harvest Hope Specific
```gitignore
# Game saves
harvest-hope-save-*.json
game-saves/
user-data/

# Test files
frontend/test-output.html
frontend/test.html
```

**Why Excluded:**
- User-generated game data
- Test output files
- Not part of source code
- Personal game progress

## ✅ Best Practices

### 🔒 Security Checklist
- [ ] **Never commit `.env` files** with real API keys
- [ ] **Use `.env.example`** for templates
- [ ] **Review before commit** - Check for sensitive data
- [ ] **Use environment variables** in production
- [ ] **Rotate exposed keys** immediately if accidentally committed

### 📦 Repository Hygiene
- [ ] **Keep .gitignore updated** as project evolves
- [ ] **Test .gitignore** with `git status` before committing
- [ ] **Document exceptions** when including unusual files
- [ ] **Use global .gitignore** for personal preferences
- [ ] **Review periodically** for outdated patterns

### 🔍 Verification Commands
```bash
# Check what files are being tracked
git status

# See what would be committed
git add --dry-run .

# Check if specific file is ignored
git check-ignore -v filename

# List all ignored files
git status --ignored

# Clean untracked files (be careful!)
git clean -fdx --dry-run  # Preview
git clean -fdx            # Actually clean
```

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This
```bash
# Committing environment files
git add .env  # NEVER!

# Committing node_modules
git add node_modules/  # NEVER!

# Committing build artifacts
git add dist/  # Usually not needed

# Committing API keys in code
const API_KEY = "AIza...";  # NEVER!
```

### ✅ Do This Instead
```bash
# Use environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

# Use .env.example for templates
cp .env.example .env
# Then edit .env with real values

# Commit package.json, not node_modules
git add package.json package-lock.json

# Build artifacts are generated
npm run build  # Generates dist/
```

## 🔧 Maintenance

### 📅 Regular Reviews
- **Monthly**: Review .gitignore for new patterns
- **Before Release**: Verify no sensitive data committed
- **After Dependencies**: Update for new tools/frameworks
- **Team Changes**: Ensure all developers understand rules

### 🔄 Updating .gitignore
```bash
# After updating .gitignore, remove cached files
git rm -r --cached .
git add .
git commit -m "chore: update .gitignore"

# This removes files from git but keeps them locally
```

## 📚 Additional Resources

### 🔗 Useful Links
- **gitignore.io**: https://www.toptal.com/developers/gitignore
- **GitHub Templates**: https://github.com/github/gitignore
- **Git Documentation**: https://git-scm.com/docs/gitignore

### 📖 Related Documentation
- **[API Setup Guide](API_SETUP.md)** - Environment variable configuration
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Development workflow
- **[Deployment Guide](DEPLOYMENT.md)** - Production environment setup

## 🎯 Summary

### ✅ What's Ignored
- ✅ Environment files (.env)
- ✅ Dependencies (node_modules)
- ✅ Build artifacts (dist, build)
- ✅ IDE files (.vscode, .idea)
- ✅ OS files (.DS_Store, Thumbs.db)
- ✅ Logs and temporary files
- ✅ Test coverage reports
- ✅ AWS CDK output (cdk.out)

### ❌ What's NOT Ignored (Committed)
- ✅ Source code (.ts, .tsx, .js, .jsx)
- ✅ Configuration templates (.env.example)
- ✅ Package manifests (package.json)
- ✅ Documentation (.md files)
- ✅ Static assets (images, fonts)
- ✅ Shared VS Code settings
- ✅ Git configuration (.gitattributes)

---

<div align="center">

**🔒 Keep Your Repository Clean and Secure! 🔐**

*Proper .gitignore configuration is essential for security and repository hygiene.*

</div>