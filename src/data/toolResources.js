// Integration facts and training resources, researched from each tool's own
// official pages.
//
// THE RULE: ONLY WHAT THE SOURCE SAYS
// Every name below appears on the page in `source.url`, checked on the date in
// VERIFIED. Nothing is inferred from a tool's reputation, a third-party list or
// a guess about what "surely" connects. Where a page named only examples, the
// entry says so instead of implying the list is complete. Counts ("10,082+
// apps") are quoted as the page stated them on that date and will drift.
//
// A tool is simply absent when its integrations could not be verified. That
// is the honest state, and it renders as nothing rather than as a thin list.
//
// SHAPE MIRRORS public.tool_claims (supabase/migrations/0003_tool_claims.sql):
// a tool, a claim, a source URL, a source type and a verified date, so these
// can be loaded into that table later without re-researching.
//
// Re-check before REVIEW_DUE. Integration lists and course URLs move; two of the
// learning URLs first tried here (zapier.com/learn, docs.n8n.io/courses) had
// already 404'd.

export const VERIFIED = '2026-09-13'
export const REVIEW_DUE = '2026-12-13'

// integrations.kind: 'connects' = apps it integrates with; 'works_in' = where the
// tool itself runs (editors, browsers, apps).
// learn[].kind: 'course' = structured lessons; 'docs' = official documentation
// or tutorials; 'help' = help centre.
export const TOOL_RESOURCES = {
  'github-copilot': {
    domains: ['github.com'],
    integrations: {
      kind: 'works_in',
      names: [
        'Visual Studio Code', 'Visual Studio', 'Xcode', 'Eclipse', 'Vim/Neovim',
        'IntelliJ IDEA (Ultimate, Community, Educational)', 'PyCharm (Professional, Community, Educational)',
        'WebStorm', 'PhpStorm', 'GoLand', 'Rider', 'RubyMine', 'RustRover', 'CLion', 'DataGrip',
        'DataSpell', 'Android Studio', 'Azure Data Studio', 'JetBrains Client', 'Code With Me Guest', 'MPS',
      ],
      source: {
        url: 'https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-extension',
        title: 'Installing the GitHub Copilot extension in your environment',
        type: 'official_docs',
      },
    },
    learn: [
      { title: 'Tutorials for GitHub Copilot', kind: 'docs', url: 'https://docs.github.com/en/copilot/tutorials' },
    ],
  },

  'otter-ai': {
    domains: ['otter.ai'],
    integrations: {
      kind: 'connects',
      names: [
        'Zoom', 'Zoom Phone', 'Google Meet', 'Microsoft Teams', 'Slack', 'Google Calendar', 'Microsoft Outlook',
        'Google Docs', 'Google Drive', 'Microsoft OneDrive', 'SharePoint', 'Dropbox', 'Notion', 'Salesforce',
        'HubSpot', 'Microsoft Dynamics', 'Zoho', 'Outreach', 'Salesloft', 'RingCentral', 'Asana', 'ClickUp',
        'JIRA', 'Monday.com', 'Airtable', 'Snowflake', 'Amazon S3', 'Egnyte', 'Glean', 'Claude', 'Zapier', 'viaSocket',
      ],
      source: { url: 'https://otter.ai/integrations', title: 'Otter.ai Integrations', type: 'official_docs' },
    },
    learn: [
      { title: 'Otter.ai Help Center', kind: 'help', url: 'https://help.otter.ai/hc/en-us' },
    ],
  },

  'fireflies-ai': {
    domains: ['fireflies.ai'],
    integrations: {
      kind: 'connects',
      note: 'The most prominent of the integrations listed on the page.',
      names: [
        'Zoom', 'Google Meet', 'Microsoft Teams', 'Webex', 'GoToMeeting', 'Slack', 'Notion', 'Linear',
        'Google Docs', 'Google Drive', 'Microsoft OneNote', 'Microsoft OneDrive', 'Dropbox', 'Box',
        'Salesforce', 'HubSpot', 'Airtable', 'BambooHR', 'Greenhouse', 'Lever',
      ],
      source: { url: 'https://fireflies.ai/integrations', title: 'Fireflies.ai Integrations', type: 'official_docs' },
    },
    learn: [
      { title: 'Fireflies Knowledge Base', kind: 'help', url: 'https://guide.fireflies.ai/' },
    ],
  },

  grammarly: {
    domains: ['grammarly.com'],
    integrations: {
      kind: 'works_in',
      summary: 'Works in 1 million+ apps and programs',
      note: 'Named examples from the page.',
      names: [
        'Gmail', 'Microsoft Outlook', 'Apple Mail', 'Google Docs', 'Microsoft Word', 'Slack', 'Figma', 'FigJam',
        'Chrome', 'Safari', 'Edge', 'Firefox', 'Windows', 'Mac', 'iOS', 'Android', 'iPhone', 'iPad',
      ],
      source: { url: 'https://www.grammarly.com/where-grammarly-works', title: 'Where Grammarly Works', type: 'official_docs' },
    },
    learn: [
      { title: 'Grammarly Support', kind: 'help', url: 'https://support.grammarly.com/hc/en-us' },
    ],
  },

  'notion-ai': {
    domains: ['notion.com'],
    integrations: {
      kind: 'connects',
      note: 'Notion AI works inside Notion; these are the integrations Notion lists.',
      names: [
        'Slack', 'Google Drive', 'GitHub', 'Figma', 'Canva', 'Loom', 'Calendly', 'Sketch', 'Pinterest',
        'Mixpanel', 'Streamlit', 'Datadog', 'Splunk', 'Sumo Logic', 'Panther', 'Nightfall AI', 'Polymer',
        'Microsoft Entra ID', 'RunReveal', 'Graphy',
      ],
      source: { url: 'https://www.notion.com/integrations', title: 'Connections & Integrations', type: 'official_docs' },
    },
    learn: [
      { title: 'Notion Academy', kind: 'course', url: 'https://academy.notion.com/' },
    ],
  },

  zapier: {
    domains: ['zapier.com'],
    integrations: {
      kind: 'connects',
      summary: 'Connects 10,082+ apps',
      note: 'Popular apps featured on the page.',
      names: [
        'Google Sheets', 'Gmail', 'Slack', 'Google Calendar', 'Google Drive', 'Google Forms', 'Notion', 'HubSpot',
        'Mailchimp', 'Stripe', 'Microsoft Outlook', 'Calendly', 'Facebook Lead Ads', 'LeadConnector',
      ],
      source: { url: 'https://zapier.com/apps', title: 'Zapier App Directory', type: 'official_docs' },
    },
    learn: [
      { title: 'Zapier Academy', kind: 'course', url: 'https://learn.zapier.com/' },
    ],
  },

  make: {
    domains: ['make.com'],
    integrations: {
      kind: 'connects',
      summary: '3,000+ integration apps',
      note: 'Popular apps featured on the page.',
      names: [
        'Google Sheets', 'Gmail', 'Google Drive', 'Google Docs', 'Google Calendar', 'Slack', 'Notion', 'Airtable',
        'OpenAI (ChatGPT, Sora, Whisper)', 'Google Gemini AI', 'Telegram Bot', 'Microsoft 365 Email (Outlook)',
        'Facebook Lead Ads', 'Facebook Pages', 'Pinterest',
      ],
      source: { url: 'https://www.make.com/en/integrations', title: 'App Integrations', type: 'official_docs' },
    },
    learn: [
      { title: 'Make Academy', kind: 'course', url: 'https://academy.make.com/' },
    ],
  },

  n8n: {
    domains: ['n8n.io'],
    integrations: {
      kind: 'connects',
      summary: '2,174 integrations',
      note: 'Popular apps featured on the page. Built-in nodes such as HTTP Request and Webhook are left out.',
      names: [
        'Google Sheets', 'Gmail', 'Google Drive', 'Microsoft Excel 365', 'Slack', 'Telegram', 'Notion',
        'Airtable', 'Supabase', 'OpenAI', 'Anthropic', 'Google Gemini',
      ],
      source: { url: 'https://n8n.io/integrations/', title: 'Best apps & software integrations | n8n', type: 'official_docs' },
    },
    learn: [
      { title: 'Build your first workflow', kind: 'docs', url: 'https://docs.n8n.io/build-your-first-workflow' },
    ],
  },

  claude: {
    domains: ['claude.com', 'anthropic.com'],
    integrations: {
      kind: 'connects',
      note: 'The most prominent connectors listed on the page.',
      names: [
        'Google Drive', 'Gmail', 'Google Calendar', 'Microsoft 365', 'Notion', 'Slack', 'Canva', 'Figma',
        'Adobe for creativity', 'Gamma', 'Atlassian Rovo', 'Asana', 'Linear', 'monday.com', 'HubSpot',
        'Shopify', 'Supabase', 'Spotify', 'General Legal', 'Brightdeck',
      ],
      source: { url: 'https://claude.com/connectors', title: 'Connect Claude to your favorite apps', type: 'official_docs' },
    },
    learn: [
      { title: 'Claude Academy', kind: 'course', url: 'https://academy.claude.com/' },
    ],
  },

  chatgpt: {
    domains: ['openai.com'],
    integrations: {
      kind: 'connects',
      note: 'Examples named in OpenAI help, not a full list.',
      names: ['Google Drive', 'Slack', 'Gmail', 'GitHub', 'Canva', 'Zillow'],
      source: {
        url: 'https://help.openai.com/en/articles/11487775-connectors-in-chatgpt',
        title: 'Apps in ChatGPT',
        type: 'official_docs',
      },
    },
    learn: [
      { title: 'OpenAI Academy', kind: 'course', url: 'https://academy.openai.com' },
    ],
  },

  // Learning resources verified; integrations not yet researched.
  cursor: {
    domains: ['cursor.com'],
    learn: [{ title: 'Cursor Docs', kind: 'docs', url: 'https://cursor.com/docs' }],
  },
  descript: {
    domains: ['descript.com'],
    learn: [{ title: 'Descript Help Center', kind: 'help', url: 'https://help.descript.com/' }],
  },
  elevenlabs: {
    domains: ['elevenlabs.io'],
    learn: [{ title: 'ElevenLabs Documentation', kind: 'docs', url: 'https://elevenlabs.io/docs/overview/intro' }],
  },
}

export function resourcesFor(slug) {
  return TOOL_RESOURCES[slug] || null
}
