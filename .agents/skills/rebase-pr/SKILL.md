---
name: rebase-pr
description: Rebase a stacked PR branch onto its base after the upstream PR was merged — resolves conflicts automatically or surfaces them clearly
argument-hint: "<PR number>"
level: 2
---

<Purpose>
When PRs are stacked (PR B based on PR A), merging PR A changes the commit history of main so PR B shows conflicts. This skill rebases PR B's branch onto the updated base, skips already-merged commits automatically, force-pushes, and verifies GitHub shows MERGEABLE.

Run this sequentially for each PR in the stack after each merge.
</Purpose>

<Use_When>
- A stacked PR shows CONFLICTING on GitHub after its upstream PR was merged
- User says "rebase PR#N", "PR N has conflicts", "fix the stack", or "unstick PR"
- Multiple PRs need sequential rebasing after a chain of merges
</Use_When>

<Do_Not_Use_When>
- PR is not yet CONFLICTING — no action needed
- The conflict is intentional and requires manual resolution discussion
- This is not a stacked PR situation (e.g. two independent branches that both modified the same file)
</Do_Not_Use_When>

<Steps>
1. **Identify the PR** from the argument (PR number). If none given, list open conflicting PRs and ask.

2. **Fetch and inspect**
   ```bash
   gh pr view <PR_NUMBER> --json number,title,mergeable,baseRefName,headRefName,state
   git fetch origin
   ```
   - If already MERGEABLE, report and stop.
   - If UNKNOWN, wait a moment and re-check (GitHub is still computing mergeability).

3. **Tag the remote HEAD as a backup** before touching anything
   ```bash
   git fetch origin
   git tag backup/<headRefName>-pre-rebase origin/<headRefName>
   ```
   This gives you a named ref to compare against or restore from if anything goes wrong.
   Delete it afterward with `git tag -d backup/<headRefName>-pre-rebase` once satisfied.

4. **Stash any local changes** (so checkout doesn't fail)
   ```bash
   git stash push -m "rebase-pr-temp-<PR_NUMBER>"
   ```

5. **Checkout the PR's head branch**
   ```bash
   git checkout <headRefName>
   ```

6. **Rebase onto the latest base branch**
   ```bash
   git rebase origin/<baseRefName>
   ```
   - Git will auto-skip commits already present in the base (the previously stacked commits).
   - If rebase stops with conflicts: resolve each file, then `git rebase --continue`.
   - Common conflict pattern: same file changed in the base PR and this PR. Prefer this PR's intent.

7. **Verify no accidental additions or deletions** before pushing
   ```bash
   # Check commits unique to the rebased branch
   git log --oneline origin/<baseRefName>..<headRefName>

   # Stat diff of the whole branch vs base — review for unexpected files
   git diff origin/<baseRefName>...<headRefName> --stat

   # Compare rebased tip to the original backup tip — should show ONLY intentional delta
   git diff backup/<headRefName>-pre-rebase <headRefName> --stat
   ```
   - The backup diff should be empty or show only content that was correctly resolved during conflict.
   - Any unexpected file changes here indicate a bad `--ours`/`--theirs` resolution — abort and redo.
   - For squash-merge stacks: a non-empty backup diff is expected when upstream PRs were squash-merged
     (patch fingerprints differ), but every line in the diff must be explainable.
   - **Duplication trap:** after taking `--ours` for conflicts, any content the carried-over commit
     adds may already exist in the base. Cross-check with `git diff origin/<baseRefName> -- <file>`
     on any file that changed. Identical blocks appearing twice in the same method are a red flag.

8. **Restore stash**
   ```bash
   git stash pop  # only if stash was created in step 4
   ```

9. **Force push with lease** (safe — rejects if remote was updated by someone else)
   ```bash
   git push --force-with-lease origin <headRefName>
   ```

10. **Verify mergeability**
    ```bash
    gh pr view <PR_NUMBER> --json number,title,mergeable,state
    ```
    - Confirm `mergeable: MERGEABLE`. GitHub may take ~30s to re-evaluate; re-run if still UNKNOWN.

11. **Clean up backup tag and return to original branch**
    ```bash
    git tag -d backup/<headRefName>-pre-rebase
    git checkout <original_branch>
    ```
</Steps>

<Conflict_Resolution_Guide>
When `git rebase` stops at a conflict:

1. Run `git status` to see conflicting files.
2. Open each file — conflict markers look like:
   ```
   <<<<<<< HEAD
   (base branch version)
   =======
   (your branch version)
   >>>>>>> commit-hash
   ```
3. Keep the intent of both changes where possible; when in doubt, prefer the PR's new logic.
4. `git add <resolved-file>` then `git rebase --continue`.
5. Repeat for each conflicting commit.
6. If hopelessly stuck: `git rebase --abort` and report what files conflict for manual input.
</Conflict_Resolution_Guide>

<Sequential_Stack_Pattern>
For a chain like PR#18 → PR#19 → PR#20 (each stacked on the previous):

1. Merge PR#18 on GitHub.
2. Run `$rebase-pr 19` — rebases #19 onto updated main.
3. Merge PR#19 on GitHub.
4. Run `$rebase-pr 20` — rebases #20 onto updated main.

Each invocation is independent. The skill always rebases onto `origin/<baseRefName>` as reported by GitHub.
</Sequential_Stack_Pattern>

<Example>
User: `$rebase-pr 18`
→ Fetches, checks out `feature/phase6.1-customer-auth`, rebases onto `origin/main`, force-pushes, confirms MERGEABLE.

User: `$rebase-pr 19`  (after #18 is merged)
→ Fetches, checks out `feature/phase6.1-frontend`, rebases onto updated `origin/feature/phase6.1-customer-auth` (or main if base changed), force-pushes, confirms MERGEABLE.
</Example>

<Notes>
- **Always tag a backup first.** `git tag backup/<branch>-pre-rebase origin/<branch>` before any checkout or rebase. Costs nothing; saves everything if the rebase goes wrong.
- **Always verify before pushing.** Run `git diff backup/<branch>-pre-rebase <branch> --stat` after rebase. Every line must be explainable — unexpected deletions mean a conflict was resolved in the wrong direction.
- **Squash-merge stacks need extra care.** When upstream PRs were squash-merged, git can't auto-skip stacked commits by patch fingerprint. Conflicts will appear on already-merged content — take `--ours` (base branch version) for those files, then carefully check the backup diff to confirm no phase-N content was accidentally dropped.
- `--force-with-lease` is safe: it fails if the remote was updated by someone else since your last fetch, preventing accidental overwrites.
- GitHub recomputes mergeability asynchronously after a push. If `mergeable` shows UNKNOWN, wait 15-30s and re-check.
- The stash is only created if there are local changes. Always pop it after rebase to avoid losing work.
- Never use `--no-verify` or `--force` (without lease) — both bypass safety checks.
- Delete the backup tag after confirming the push is correct: `git tag -d backup/<branch>-pre-rebase`.
</Notes>
