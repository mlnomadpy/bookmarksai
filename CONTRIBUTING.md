
# Contributing Guide

Welcome to The Documentation Compendium! This guide will assist you in making valuable contributions to this project. Your efforts to improve and enhance our work are highly appreciated.

## Overview

- **Understanding the Codebase**: Familiarize yourself with the structure and organization of the project files. For a detailed overview, refer to our [Codebase Structure](./CODEBASE_STRUCTURE.md).
- **Adhering to Standards**: It's crucial that your contributions align with our established practices. Please review the [Coding Guidelines](./CODING_GUIDELINES.md) to ensure compliance.

## Making Contributions

### Getting Started

1. **Fork the Repository**:
   - Begin by forking the repository to your GitHub account. You can do this at: <https://github.com/skywolfmo/bookmarksai/fork>.

2. **Create a New Branch**:
   - Checkout a new branch for your work. Name it appropriately based on the nature of your contribution.
   - For example:
     ```bash
     $ git checkout -b BRANCH_NAME
     ```
     In case of any issues, you might need to update your local repository:
     ```bash
     $ git remote update && git fetch
     ```
   - It's best to use separate branches for different fixes or features.

### Making Changes

3. **Commit Your Changes**:
   - When making changes, ensure your git commit messages are clear and descriptive.
   - Follow our commit message [conventions](https://gist.github.com/robertpainsi/b632364184e70900af4ab688decf6f53#file-commit-message-guidelines-md).
   - Commit these changes to your forked repository.
   - For example:
     ```bash
     $ git commit -am 'Add some feature or fix'
     ```

4. **Push Your Changes**:
   - Push the changes to your branch.
   - For example:
     ```bash
     $ git push origin BRANCH_NAME
     ```

### Submitting Your Changes

5. **Create a Pull Request**:
   - Once you've pushed your changes, create a pull request (PR) to the `fooBar` branch of the main repository.
   - Ensure that your PR details the changes you've made and why they are necessary.
   - Our continuous integration system, Travis CI, will automatically check your submission.

By following these steps, your contribution should smoothly integrate with the main project. We look forward to your valuable input!
