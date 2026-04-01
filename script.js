const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { execSync } = require('child_process');

// === CONFIG ===
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;
const REPO = process.env.REPO; // format: "username/repo"

const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// === DETECT MORNING VS EVENING ===
const runType = process.argv[2] || detectRunType();

function detectRunType() {
  const hour = new Date().getUTCHours();
  // 11 UTC = 7 AM EST, 23 UTC = 7 PM EST
  if (hour >= 10 && hour <= 12) return 'morning';
  return 'evening';
}

// === GITHUB API ===
async function getCommits(since) {
  const url = `https://api.github.com/repos/${REPO}/commits`;
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        since: since.toISOString(),
        per_page: 100
      }
    });
    return res.data.map(c => ({
      message: c.commit.message.split('\n')[0], // first line only
      author: c.commit.author.name,
      date: c.commit.author.date,
      sha: c.sha.substring(0, 7)
    }));
  } catch (err) {
    console.error('GitHub API error:', err.message);
    return [];
  }
}

// === READ GOALS ===
function readGoals() {
  try {
    return fs.readFileSync('goals.txt', 'utf-8');
  } catch {
    return 'No goals.txt found. Create one to track your project tasks.';
  }
}

// === OPENROUTER AI ===
async function askAI(prompt) {
  try {
    const res = await axios.post(OPENROUTER_URL, {
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a project management assistant. Be concise, clear, and actionable. Use bullet points. Always include a completion percentage estimate based on the goals and commits.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    }, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Daily Email Bot'
      }
    });
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error('OpenRouter error:', err.message);
    if (err.response) console.error('Response:', err.response.data);
    return 'AI summary unavailable. See raw commit list below.';
  }
}

// === BUILD PROMPT ===
function buildPrompt(runType, commits, goals) {
  const commitsText = commits.length > 0
    ? commits.map(c => `- [${c.sha}] ${c.message} (by ${c.author})`).join('\n')
    : 'No commits in this period.';

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });

  if (runType === 'morning') {
    return `Today is ${date}.

YESTERDAY'S COMMITS:
${commitsText}

FULL PROJECT GOALS:
${goals}

Based on yesterday's commits and the full goals list:
1. Summarize what was accomplished yesterday (3-5 bullet points)
2. Create a prioritized plan for today (what to work on)
3. Estimate overall project completion as a percentage
4. Flag any blockers or risks you notice

Keep it concise and actionable. This will be sent as a morning email update.`;
  } else {
    return `Today is ${date}.

TODAY'S COMMITS:
${commitsText}

FULL PROJECT GOALS:
${goals}

Based on today's commits and the full goals list:
1. Summarize what was accomplished today (3-5 bullet points)
2. List remaining tasks from goals.txt that haven't been completed
3. Estimate overall project completion as a percentage
4. Suggest what to prioritize tomorrow

Keep it concise and actionable. This will be sent as an evening email update.`;
  }
}

// === SEND EMAIL ===
async function sendEmail(subject, body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS // Use Gmail App Password, not regular password
    }
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; }
  .header { background: linear-gradient(135deg, #1e3a5f, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0 0; opacity: 0.8; font-size: 14px; }
  .content { background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 16px; color: #3b82f6; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
  .section p, .section li { font-size: 14px; line-height: 1.6; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px; }
  .badge { display: inline-block; background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <h1>🛠️ ${subject}</h1>
    <p>Automated Daily Update</p>
  </div>
  <div class="content">
    <div class="section">
      ${body.replace(/\n/g, '<br>').replace(/^- (.+)/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')}
    </div>
  </div>
  <div class="footer">
    Sent by Daily Email Bot • ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Daily Updates" <${EMAIL_USER}>`,
      to: EMAIL_TO,
      subject: subject,
      text: body,
      html: htmlBody
    });
    console.log(`✅ Email sent: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// === MAIN ===
async function main() {
  console.log(`📧 Running ${runType} update for ${REPO}`);

  // Determine time range
  const now = new Date();
  let since;
  if (runType === 'morning') {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24h
  } else {
    since = new Date(now.getTime() - 12 * 60 * 60 * 1000); // last 12h (today)
  }

  // Fetch commits
  console.log(`Fetching commits since ${since.toISOString()}`);
  const commits = await getCommits(since);
  console.log(`Found ${commits.length} commits`);

  // Read goals
  const goals = readGoals();

  // Build AI prompt
  const prompt = buildPrompt(runType, commits, goals);

  // Get AI summary
  console.log('Generating AI summary...');
  const summary = await askAI(prompt);

  // Build email
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });

  let subject, body;
  if (runType === 'morning') {
    subject = `🌅 Morning Update — ${date}`;
    body = summary;
  } else {
    subject = `🌙 Evening Update — ${date}`;
    body = summary;
  }

  // Send email
  await sendEmail(subject, body);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
