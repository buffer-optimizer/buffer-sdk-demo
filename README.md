# Buffer SDK
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **⚠️ IMPORTANT DISCLAIMER: This project is created solely for demonstration purposes as part of a job application to Buffer. It is not affiliated with, endorsed by, or representative of Buffer's actual products or services. This is a technical showcase designed to demonstrate SDK development skills and is not intended for commercial use.**

Buffer SDK for Node.js and Browser environments - A demonstration implementation showcasing social media management API integration capabilities.

## Features

- 🚀 **Full TypeScript Support** - Complete type definitions for all APIs
- 🔄 **Auto-retry Logic** - Built-in retry mechanism with exponential backoff
- ⚡ **Rate Limiting** - Automatic rate limit handling
- 📊 **Analytics & Insights** - Comprehensive social media analytics
- 🎯 **Multi-platform** - Supports X (Twitter), LinkedIn, Facebook, Instagram
- 🛡️ **Error Handling** - Detailed error information and recovery
- 🔧 **Mock Mode** - Built-in mock data for development and testing

## Installation

```bash
npm install @buffer/sdk
```

```bash
yarn add @buffer/sdk
```

```bash
pnpm add @buffer/sdk
```

## Quick Start

### Basic Usage

```typescript
import { createBufferClient } from '@buffer/sdk';

// Initialize the client
const client = await createBufferClient({
  accessToken: 'your-access-token',
  bufferSDK: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'your-redirect-uri',
    sdkMockMode: false // Set to true for development
  }
});

// Get all profiles
const profiles = await client.profiles.list();
console.log('Connected profiles:', profiles);

// Create a post
const post = await client.posts.create('profile-id', {
  text: 'Hello from Buffer SDK! 🚀',
  scheduled_at: '2024-01-01T12:00:00Z'
});

// Get analytics
const analytics = await client.analytics.summary('profile-id', {
  timeRange: '30d'
});
```

### Mock Mode for Development

```typescript
const client = await createBufferClient({
  accessToken: 'mock-token',
  bufferSDK: {
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    sdkMockMode: true // Enable mock mode
  }
});

// All API calls will return realistic mock data
const profiles = await client.profiles.list();
// Returns mock profiles for X, LinkedIn, Facebook, Instagram
```

## API Reference

### Profiles

```typescript
// List all profiles
const profiles = await client.profiles.list();

// Get a specific profile
const profile = await client.profiles.get('profile-id');
```

### Posts

```typescript
// List posts for a profile
const posts = await client.posts.list('profile-id', {
  count: 20,
  status: 'sent'
});

// Get a specific post
const post = await client.posts.get('post-id');

// Create a new post
const newPost = await client.posts.create('profile-id', {
  text: 'Your post content here',
  scheduled_at: '2024-01-01T12:00:00Z'
});

// Get post analytics
const analytics = await client.posts.analytics('post-id');
```

### Analytics

```typescript
// Get summary analytics
const summary = await client.analytics.summary('profile-id', {
  timeRange: '30d',
  platforms: ['x', 'linkedin']
});

// Get detailed post analytics
const postAnalytics = await client.analytics.posts('profile-id', {
  timeRange: '7d',
  period: 'day'
});

// Get insights
const insights = await client.analytics.insights('profile-id', {
  start: '2024-01-01',
  end: '2024-01-31'
});
```

## Configuration Options

```typescript
interface BufferClientConfig {
  accessToken: string;
  baseUrl?: string; // Default: Buffer API URL
  timeout?: number; // Default: 10000ms
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms
  rateLimit?: {
    requests: number; // Default: 100
    window: number; // Default: 3600000 (1 hour)
  };
  bufferSDK: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    sdkMockMode: boolean;
  };
}
```

## Error Handling

The SDK provides detailed error information through the `BufferAPIError` class:

```typescript
import { BufferAPIError } from '@buffer/sdk';

try {
  const post = await client.posts.get('invalid-post-id');
} catch (error) {
  if (error instanceof BufferAPIError) {
    console.log('Error code:', error.code);
    console.log('Status code:', error.statusCode);
    console.log('Message:', error.message);
    console.log('Details:', error.details);
  }
}
```

### Common Error Codes

- `RATE_LIMIT_EXCEEDED` - Too many requests
- `PROFILE_NOT_FOUND` - Profile doesn't exist
- `POST_NOT_FOUND` - Post doesn't exist
- `NETWORK_ERROR` - Network connectivity issues
- `AUTHENTICATION_ERROR` - Invalid or expired token

## TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import type { 
  BufferProfile, 
  BufferPost, 
  PostAnalytics, 
  AnalyticsSummary,
  SocialPlatform 
} from '@buffer/sdk';

// All API responses are fully typed
const profiles: BufferProfile[] = await client.profiles.list();
const analytics: AnalyticsSummary = await client.analytics.summary('profile-id');
```

## Rate Limiting

The SDK automatically handles rate limiting:

- **Default limits**: 100 requests per hour
- **Automatic retry**: Failed requests are retried with exponential backoff
- **Configurable**: Adjust limits based on your API plan

```typescript
const client = await createBufferClient({
  accessToken: 'your-token',
  rateLimit: {
    requests: 200, // Increase if you have higher limits
    window: 3600000 // 1 hour window
  },
  // ... other config
});
```

## Supported Platforms

- **X (Twitter)** - Posts, analytics, scheduling
- **LinkedIn** - Company and personal pages
- **Facebook** - Pages and personal profiles
- **Instagram** - Business accounts

## Examples

### Scheduling Posts Across Multiple Platforms

```typescript
const profiles = await client.profiles.list();

const postData = {
  text: 'Exciting news coming soon! 🎉',
  scheduled_at: '2024-01-01T15:00:00Z'
};

// Schedule to all connected profiles
for (const profile of profiles) {
  await client.posts.create(profile.id, postData);
}
```

### Analytics Dashboard

```typescript
async function getAnalyticsDashboard(profileId: string) {
  const [summary, posts] = await Promise.all([
    client.analytics.summary(profileId, { timeRange: '30d' }),
    client.analytics.posts(profileId, { timeRange: '30d' })
  ]);

  return {
    overview: summary,
    topPosts: posts
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5),
    platformBreakdown: summary.platformBreakdown
  };
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/bufferapp/buffer-sdk.git
cd buffer-sdk

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build

# Watch mode for development
npm run dev
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.buffer.com/sdk) *(Demo documentation)*
- 🐛 [Issue Tracker](https://github.com/bufferapp/buffer-sdk/issues) *(Demo repository)*
- 💬 [Community Discussions](https://github.com/bufferapp/buffer-sdk/discussions) *(Demo discussions)*
- 📧 [Contact](mailto:kingsleybrew@gmail.com) *(Creator contact)*

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and updates.

---

## ⚠️ **IMPORTANT DISCLAIMER**

**This Buffer SDK is created exclusively for demonstration purposes as part of a job application process. It is not affiliated with, endorsed by, or representative of Buffer Inc. or any of its products or services.**

### Technical Demonstration

This project showcases:
- **SDK Architecture**: Modern TypeScript SDK implementation
- **API Integration**: Social media management API patterns
- **Type Safety**: Comprehensive TypeScript definitions
- **Error Handling**: Robust error management and retry logic
- **Mock Implementation**: Realistic data simulation for development
- **Testing Framework**: Complete test suite with mock utilities
- **Documentation**: Professional SDK documentation standards
- **Build System**: Multi-format builds (CommonJS, ESM, TypeScript)

### Legal Notice

- **Demo Implementation**: Simulates Buffer-like API interactions
- **Mock Data**: No real social media integrations or data
- **Educational Purpose**: Created to demonstrate frontend/SDK engineering skills
- **No Commercial Use**: Not intended for production or commercial use
- **Buffer Compatibility**: Designed for demonstration of API design patterns

**All data is generated for demonstration purposes. No actual Buffer API calls or real social media integrations occur.**

### Contact Information

**Kingsley Baah Brew**
- Email: kingsleybrew@gmail.com
- LinkedIn: [linkedin.com/in/kingsley-brew-56881b172](https://gh.linkedin.com/in/kingsley-brew-56881b172)
- GitHub: [github.com/kingsbrew94](https://github.com/kingsbrew94)

---

*Created with ❤️ by Kingsley Baah Brew for Buffer - Demonstrating SDK development excellence*