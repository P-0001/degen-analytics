declare const __APP_VERSION__: string;
const currentYear = new Date().getFullYear();
export const config = {
  appName: 'Degen Analytics',
  tagline: 'Privacy-first betting analytics. All processing happens in your browser.',
  privacyBadge: '100% Client-Side Processing',
  privacyNotice: 'Your data never leaves your device. Processing is done entirely in your browser.',
  githubUrl: 'https://github.com/P-0001/degen-analytics',
  donateUrl: 'https://solscan.io/account/EktY9cMcPmP2cwqVWMVycFs3epSZ5R98GUw235ReCjZ4',
  copyright: `© ${currentYear} Degen Analytics. All rights reserved.`,
  version: __APP_VERSION__,
  modalTitle: 'How to Use Degen Analytics',
  disclaimer:
    'This tool is not affiliated with any gambling site, casino, or betting platform. Degen Analytics is purely an informational tool for personal use to help you analyze and understand your betting history. Use of this tool does not constitute financial advice, and all gambling activities should be conducted responsibly and within your means.',
};

export default config;
