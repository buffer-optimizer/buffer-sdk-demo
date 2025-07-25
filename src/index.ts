/**
 * Buffer SDK Demo - Demonstration Implementation
 *
 * ⚠️ DISCLAIMER: This project is created solely for demonstration purposes
 * as part of a job application to Buffer. It is not affiliated with, endorsed by,
 * or representative of Buffer's actual products or services.
 *
 * @author Kingsley Baah Brew
 * @version 1.0.0
 * @license MIT
 */

// Main client export
export { BufferClient, createBufferClient } from './client';

// Type exports
export type {
    // Core types
    SocialPlatform,
    TimeRange,
    BufferProfile,
    BufferPost,
    PostAnalytics,
    AnalyticsSummary,
    DashboardStats,
    OptimalTimingAnalysis,

    // Options and data types
    AnalyticsOptions,
    PostListOptions,
    CreatePostData,

    // API types
    APIResponse,
    AuthTokens,
    BufferClientConfig,
    HTTPClient,

    // Utility types
    PlatformMetrics,
    ScheduleSlot,
    EngagementTrend,
    BatchOperationResult,
    BufferClientStats,
    WebhookEvent,

    // Plugin system types
    Plugin,
    PluginConfig,
    PluginExecutionContext,
    PluginExecutionResult,
    PluginManager,
    PluginRegistry,
    TimeSlotRecommendation,

    // Namespace export
    BufferTypes,
} from './types';

// Error class export
export { BufferAPIError, PluginExecutionError } from './types';

// Version info
export const VERSION = '1.0.0';

// Default configuration
export const DEFAULT_CONFIG = {
    baseUrl: 'https://api.bufferapp.com/1',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimit: {
        requests: 100,
        window: 3600000, // 1 hour
    },
} as const;