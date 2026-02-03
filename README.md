# Flow Affiliate Pro

🚀 **AI Video Automation Chrome Extension for Affiliate Marketers**

Generate professional product videos automatically using Google Flow AI and post them directly to TikTok, Shopee, and Lazada.

## Features

- 🎬 **AI Video Generation** - Create product review videos with one click
- 🔗 **Product Scraping** - Auto-extract product info from Shopee/Lazada URLs
- 📝 **Smart Prompts** - Thai-optimized templates for affiliate content
- 📤 **Multi-Platform Posting** - Post to TikTok, Shopee, Lazada automatically
- 📊 **Analytics Dashboard** - Track video performance and engagement
- ⚡ **Batch Processing** - Generate multiple videos in queue
- 🔐 **Secure Auth** - OAuth integration with all platforms

## Installation

### From Source

```bash
# Clone repository
git clone https://github.com/your-username/flow-affiliate-pro.git
cd flow-affiliate-pro

# Install dependencies
npm install

# Build extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
flow-affiliate-pro/
├── public/
│   ├── icons/              # Extension icons
│   └── templates/          # Prompt templates
├── src/
│   ├── background/         # Service worker scripts
│   ├── config/             # API & app configuration
│   ├── content-scripts/    # Platform controllers
│   ├── hooks/              # React hooks
│   ├── popup/              # Popup UI
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS/Tailwind styles
│   ├── services/           # API services
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
└── tests/
    ├── e2e/                # E2E tests
    ├── integration/        # Integration tests
    └── unit/               # Unit tests
```

## Configuration

Create a `.env` file for development:

```env
VITE_GOOGLE_FLOW_CLIENT_ID=your-client-id
VITE_GOOGLE_FLOW_CLIENT_SECRET=your-client-secret
VITE_TIKTOK_CLIENT_KEY=your-tiktok-key
VITE_SHOPEE_PARTNER_ID=your-shopee-id
VITE_LAZADA_APP_KEY=your-lazada-key
```

## Usage

### Quick Start

1. Click the extension icon to open the popup
2. Connect your Google Flow account
3. Paste a product URL or enter a description
4. Select template and settings
5. Click "Generate" to create your video

### Batch Mode

1. Go to "Bulk Creator" tab
2. Paste multiple product URLs (one per line)
3. Configure batch settings
4. Click "Start Batch Generation"

### Templates

Choose from built-in templates:
- **Product Review** - Classic review style
- **Unboxing** - Exciting reveal videos
- **Deal Alert** - Urgency-driven promotions
- **Before/After** - Transformation content
- **Tutorial** - How-to guides

## Tech Stack

- **Build**: Vite 5.0 + CRXJS 2.0
- **Frontend**: React 18 + TypeScript 5.3
- **Styling**: TailwindCSS 3.4
- **State**: Zustand 4.4 with persist
- **UI**: Radix UI + Lucide Icons
- **Testing**: Jest + React Testing Library

## API Integrations

| Platform | Purpose | Status |
|----------|---------|--------|
| Google Flow | Video Generation | ✅ Ready |
| TikTok | Video Posting | ✅ Ready |
| Shopee | Product Scraping | ✅ Ready |
| Lazada | Product Scraping | ✅ Ready |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- 📧 Email: support@flowaffiliate.pro
- 💬 Discord: [Join Community](https://discord.gg/flowaffiliate)
- 📖 Docs: [Documentation](https://docs.flowaffiliate.pro)

---

Made with ❤️ for Thai Affiliate Marketers
