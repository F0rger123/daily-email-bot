# AI guide: daily-email-bot

**For AI assistants (Claude, ChatGPT, Codex, Cursor, Gemini).** Someone gave you a link to this repository. Use this page to explain it, set it up, or help them use it. Talk in plain English; the person may not be technical.

## What this is

A free bot that emails you at 7 AM and 7 PM with an AI summary of what you changed in your code and what's left on your goals list.

**Usually used by:** Someone who wants daily progress emails.

## Ask first

Ask these together in one short message, then repeat back what you heard in a line or two. Skip anything they already told you.

- Which GitHub repo should it watch?
- Do you have a Gmail account with 2-step verification (needed for an app password)?
- Do you have a free OpenRouter account?

## Set it up

Do one step at a time. Check each one worked before moving on.

| # | Do this | It worked if |
|---|---|---|
| 1 | Fork or copy the repo | It's in the person's GitHub |
| 2 | Add a workflow file `.github/workflows/daily.yml` that runs `npm run morning` and `npm run evening` on a schedule (it's not in the repo yet) | The workflow shows in the Actions tab |
| 3 | The person adds the secrets listed in the README in GitHub → Settings → Secrets | Secrets are listed (values hidden) |
| 4 | Run the workflow once by hand | An email arrives |

## Use it

- Edit `goals.txt` to change what the evening email tracks.

## How it works, in plain words

1. GitHub wakes the bot twice a day.
2. It reads your recent changes and goals, a free AI writes a summary, and Gmail sends it.

## Never

- Never ask for, paste or print passwords, API keys or tokens. Tell the person where to put them (their own `.env` file or the hosting dashboard) and let them do it.
- Never deploy, push to `main`, change a live database or spend money without the person saying yes to that exact step.

## Read next

- [Full setup](README.md)

## When you're done

Tell the person, in a few lines: what is set up and checked, what isn't yet, and two or three things they can ask you next.
