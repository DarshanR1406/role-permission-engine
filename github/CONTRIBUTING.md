# Contributing to `role-permission-engine`

First of all, thank you for your interest in contributing to **role-permission-engine**! 🎉

Community contributions help improve the project for everyone. Whether you're fixing a bug, adding a feature, improving documentation, or writing tests, your contribution is appreciated.

Please read this guide before contributing to ensure a smooth development and review process.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Requesting Features](#requesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [TypeScript Declaration Files](#typescript-declaration-files)
- [Testing Guidelines](#testing-guidelines)
- [Build Verification](#build-verification)
- [Generated Files](#generated-files)
- [Commit Message Convention](#commit-message-convention)
- [CI/CD Process](#cicd-process)
- [Release Policy](#release-policy)
- [Pull Request Checklist](#pull-request-checklist)

---

## Code of Conduct

By participating in this project, you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

Please be respectful, professional, and constructive when interacting with other contributors.

---

## Ways to Contribute

You can contribute in many ways:

- 🐛 Fix bugs
- ✨ Add new features
- 📚 Improve documentation
- 🧪 Improve tests
- ⚡ Improve performance
- ♻️ Refactor code
- 🌍 Improve examples or demos

---

## Reporting Bugs

Before creating a bug report:

- Search existing issues to avoid duplicates.
- Verify that you're using the latest package version.

When creating a bug report, please include:

- Clear title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Package version
- Minimal reproduction example (if possible)
- Screenshots or logs (if applicable)

Please use the **Bug Report** issue template.

---

## Requesting Features

Feature requests are welcome.

Please include:

- The problem you're trying to solve
- Your proposed solution
- Alternative solutions considered
- Real-world use cases
- Example API (if applicable)

Please use the **Feature Request** issue template.

---

## Submitting Pull Requests

1. Fork the repository.

2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/role-permission-engine.git
```

3. Enter the project:

```bash
cd role-permission-engine
```

4. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

or

```bash
git checkout -b fix/your-bug-fix
```

5. Make your changes.

6. Commit using Conventional Commits.

7. Push your branch:

```bash
git push origin feature/your-feature-name
```

8. Open a Pull Request against the **main** branch.

---

## Development Workflow

The expected workflow is:

```text
Fork Repository
        │
        ▼
Create Branch
        │
        ▼
Write Code
        │
        ▼
Run Tests
        │
        ▼
Build Package
        │
        ▼
Commit Changes
        │
        ▼
Push Branch
        │
        ▼
Open Pull Request
        │
        ▼
CI Checks
        │
        ▼
Maintainer Review
        │
        ▼
Merge
```

---

## Branch Strategy

Please **do not** push directly to protected branches such as:

- `main`
- `develop`

Instead:

Create a feature branch:

```bash
git checkout -b feature/add-role-cache
```

or

```bash
git checkout -b fix/router-guard
```

Recommended branch naming:

```
feature/feature-name

fix/bug-description

docs/update-readme

refactor/module-name

test/add-tests

chore/dependency-update
```

---

## Local Development Setup

## Requirements

- Node.js
- npm

## Install dependencies

```bash
npm install
```

## Run tests

```bash
npm test
```

## Build package

```bash
npm run build
```

If available, run additional quality checks:

```bash
npm run lint
```

---

## Project Structure

```
role-permission-engine/

├── .github/
├── src/
├── types/
├── test/
├── dist/
├── package.json
├── README.md
└── CONTRIBUTING.md
```

Typical directories:

```
src/
    components/
    hooks/
    context/
    utils/

types/

test/

dist/
```

---

## Coding Guidelines

Please follow these guidelines:

- Write clean and readable code.
- Keep functions small and focused.
- Prefer reusable utilities.
- Avoid unnecessary complexity.
- Remove debugging code before submitting.
- Do not leave commented-out code.
- Follow the existing project style.

Avoid:

```javascript
console.log(...)
debugger;
```

unless specifically needed for development.

---

# Documentation Guidelines

Public APIs should be documented.

Examples include:

- Components
- Hooks
- Contexts
- Utility functions

Provide meaningful descriptions and examples whenever appropriate.

---

# TypeScript Declaration Files

If your changes modify the public API, update the corresponding declaration files inside:

```
types/
```

Examples:

```
types/index.d.ts

types/utils.d.ts
```

Keep declaration files synchronized with implementation changes.

---

## Testing Guidelines

All new functionality should be tested whenever possible.

Run:

```bash
npm test
```

If watch mode exists:

```bash
npm run test:watch
```

Before submitting a Pull Request:

- Existing tests should pass.
- New functionality should be covered by tests when applicable.

---

## Build Verification

Before submitting your Pull Request, verify that the project builds successfully:

```bash
npm run build
```

The build should complete without errors.

---

## Generated Files

Unless specifically requested by a maintainer, do **not** commit generated files such as:

- `dist/`
- coverage reports
- temporary build artifacts
- cache files

Only commit source code and necessary documentation.

---

## Commit Message Convention

This project follows **Conventional Commits**.

Format:

```text
<type>(<scope>): <description>
```

Examples:

```
feat(auth): add role inheritance

fix(router): resolve redirect issue

docs(readme): improve installation guide

refactor(utils): simplify permission parser

test(hooks): add unit tests
```

Common types:

- feat
- fix
- docs
- style
- refactor
- test
- chore

---

## CI/CD Process

Every Pull Request automatically runs Continuous Integration (CI).

Typical checks include:

- Installing dependencies
- Running tests
- Building the package

A Pull Request may not be merged until required checks pass.

Contributors do **not** need to publish packages to npm.

---

## Release Policy

Package releases are managed only by project maintainers.

Contributors should **not**:

- Create release tags
- Publish npm versions
- Modify the release workflow without discussion

Typical release flow:

```text
Contributor
        │
        ▼
Open Pull Request
        │
        ▼
CI Passes
        │
        ▼
Maintainer Reviews
        │
        ▼
Merge
        │
        ▼
Maintainer Creates Release
        │
        ▼
GitHub Actions
        │
        ▼
Publish to npm
```

---

## Pull Request Checklist

Before submitting your Pull Request, please verify:

- [ ] My code follows the project's coding style.
- [ ] I have performed a self-review.
- [ ] I have updated documentation where necessary.
- [ ] I have updated TypeScript declaration files if public APIs changed.
- [ ] I have added or updated tests where appropriate.
- [ ] All tests pass locally.
- [ ] The project builds successfully.
- [ ] My commit messages follow Conventional Commits.
- [ ] My Pull Request addresses a single feature or bug and does not include unrelated changes.

---

## Thank You

Thank you for taking the time to contribute to **role-permission-engine**.

Your contributions help make the project better for everyone in the community. 🚀