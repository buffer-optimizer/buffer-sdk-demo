// Social media platform types
export type SocialPlatform = 'x' | 'linkedin' | 'facebook' | 'instagram';

// Time range types for analytics
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

// Buffer Profile interface
export interface BufferProfile {
    id: string;
    service: SocialPlatform;
    service_username: string;
    service_id: string;
    formatted_username: string;
    avatar: string;
    timezone: string;
    schedules: Array<{
        days: string[];
        times: string[];
    }>;
    default: boolean;
}

// Post Analytics interface
export interface PostAnalytics {
    postId: string;
    profileId: string;
    service: SocialPlatform;
    publishedAt: string;
    text: string;
    metrics: {
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        retweets?: number;
        reactions?: number;
        saves?: number;
    };
    engagementRate: number;
    reach: number;
    impressions: number;
}

// Dashboard Statistics interface
export interface DashboardStats {
    totalPosts: number;
    averageEngagementRate: number;
    bestPerformingPlatform: SocialPlatform;
    recommendedPostTime: string;
    weekOverWeekGrowth: number;
    topPerformingPost: {
        id: string;
        text: string;
        engagementRate: number;
    };
}

// Optimal Timing Analysis interface
export interface OptimalTimingAnalysis {
    profileId: string;
    service: SocialPlatform;
    recommendations: Array<{
        dayOfWeek: number;
        hour: number;
        engagementScore: number;
        confidence: number;
        sampleSize: number;
    }>;
    analysis: {
        bestDays: Array<{
            dayOfWeek: number;
            dayName: string;
            averageEngagement: number;
            postCount: number;
            rank: number;
        }>;
        bestHours: Array<{
            hour: number;
            averageEngagement: number;
            postCount: number;
            rank: number;
        }>;
    };
    confidence: number;
    lastUpdated: string;
}

// Analytics Summary interface (referenced in your import but not defined)
export interface AnalyticsSummary {
    profileId: string;
    timeRange: TimeRange;
    totalPosts: number;
    totalEngagement: number;
    averageEngagementRate: number;
    bestPerformingPost: string;
    topPerformingTime: string;
    topMetrics: {
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        reach: number;
        impressions: number;
    };
    platformBreakdown: Array<{
        platform: SocialPlatform;
        postCount: number;
        engagementRate: number;
        reach: number;
    }>;
    trending: {
        direction: 'up' | 'down' | 'stable';
        percentage: number;
    };
}

// Analytics Options interface (referenced in your import but not defined)
export interface AnalyticsOptions {
    timeRange: TimeRange;
    platforms?: SocialPlatform[];
    includeMetrics?: Array<'likes' | 'comments' | 'shares' | 'clicks' | 'reach' | 'impressions'>;
    groupBy?: 'day' | 'week' | 'month';
    customDateRange?: {
        startDate: string;
        endDate: string;
    };
    start: string;
    end: string;
    period: any;
}

// Utility types for common use cases
export interface PlatformMetrics {
    platform: SocialPlatform;
    metrics: PostAnalytics['metrics'];
    engagementRate: number;
    reach: number;
    impressions: number;
}

export interface ScheduleSlot {
    day: string;
    time: string;
    timezone: string;
}

export interface EngagementTrend {
    date: string;
    engagementRate: number;
    postCount: number;
}

// Buffer Post interface
export interface BufferPost {
    id: string;
    profile_id: string;
    status: 'buffer' | 'sent' | 'failed' | 'draft';
    text: string;
    text_formatted: string;
    created_at: number;
    due_at?: number;
    sent_at?: number;
    via?: string;
    statistics?: {
        reach: number;
        clicks: number;
        retweets: number;
        favorites: number;
        mentions: number;
        comments: number;
        shares: number;
    };
    media?: Array<{
        id: string;
        type: 'image' | 'video' | 'gif';
        url: string;
        thumbnail?: string;
    }>;
}

// Post List Options interface
export interface PostListOptions {
    page?: number;
    count?: number;
    since?: string;
    until?: string;
    status?: 'buffer' | 'sent' | 'failed' | 'draft';
}

// Create Post Data interface
export interface CreatePostData {
    text: string;
    now?: boolean;
    scheduled_at?: string;
    media?: Array<{
        type: 'image' | 'video' | 'gif';
        url: string;
        alt_text?: string;
    }>;
    shorten?: boolean;
    attachment?: boolean;
}

// API Response wrapper
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    code?: string;
    error?: string;
}

// Authentication Tokens interface
export interface AuthTokens {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
}

// Buffer API Error class
export class BufferAPIError extends Error {
    public code: string;
    public statusCode?: number;
    public details?: any;

    constructor(code: string, message: string, statusCode?: number, details?: any) {
        super(message);
        this.name = 'BufferAPIError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BufferAPIError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}

// Additional utility interfaces for the Buffer client
export interface BufferClientStats {
    requestCount: number;
    errorCount: number;
    lastRequestTime: number;
    rateLimitRemaining: number;
    rateLimitReset: number;
}

export interface WebhookEvent {
    id: string;
    type: 'post.sent' | 'post.failed' | 'profile.connected' | 'profile.disconnected';
    timestamp: number;
    data: any;
}

export interface BatchOperationResult<T> {
    success: boolean;
    results: Array<{
        success: boolean;
        data?: T;
        error?: BufferAPIError;
    }>;
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}

// Plugin System Types
export interface TimeSlotRecommendation {
    dayOfWeek: number;
    hour: number;
    engagementScore: number;
    confidence: number;
    sampleSize: number;
}

export interface PluginConfig {
    requiresAuth: boolean;
    configSchema: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        label: string;
        description: string;
        required: boolean;
        default?: any;
        options?: any[];
    }>;
    defaultConfig: Record<string, any>;
}

export interface PluginExecutionContext {
    profileId?: string;
    timeRange?: {
        start?: string;
        end?: string;
    };
    config?: Record<string, any>;
    apiClient: any; // Will be typed as BufferClient when imported
    userId?: string;
    metadata?: Record<string, any>;
}

export interface PluginResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: Record<string, any>;
}

export interface PluginExecutionResult<T = any> {
    success: boolean;
    data?: T;
    error?: PluginExecutionError;
    executionTime: number;
    pluginId: string;
    metadata?: Record<string, any>;
    warnings?: string[];
}

export class PluginExecutionError extends Error {
    public code: string;
    public pluginId: string;
    public details?: any;
    public recoverable: boolean;

    constructor(
        code: string,
        message: string,
        pluginId: string,
        details?: any,
        recoverable: boolean = false
    ) {
        super(message);
        this.name = 'PluginExecutionError';
        this.code = code;
        this.pluginId = pluginId;
        this.details = details;
        this.recoverable = recoverable;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PluginExecutionError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            pluginId: this.pluginId,
            details: this.details,
            recoverable: this.recoverable,
        };
    }
}

export interface Plugin {
    // Plugin Metadata
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    category: 'analytics' | 'optimization' | 'content' | 'scheduling' | 'reporting';
    enabled: boolean;
    lastExecuted?: string;
    permissions?: string[];
    downloads?: number;
    rating?: number;

    // Configuration
    config: PluginConfig;

    // Plugin Lifecycle Methods
    initialize(context: PluginExecutionContext): Promise<void>;
    execute(context: PluginExecutionContext): Promise<any>;
    validate?(context: PluginExecutionContext): Promise<boolean>;
    cleanup?(): Promise<void>;
}

export interface PluginManager {
    plugins: Map<string, Plugin>;
    register(plugin: Plugin): void;
    unregister(pluginId: string): void;
    execute(pluginId: string, context: PluginExecutionContext): Promise<PluginExecutionResult>;
    getPlugin(pluginId: string): Plugin | undefined;
    listPlugins(): Plugin[];
    enablePlugin(pluginId: string): void;
    disablePlugin(pluginId: string): void;
}

// Plugin Registry Types
export interface PluginRegistry {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    category: Plugin['category'];
    downloadUrl: string;
    dependencies?: string[];
    compatibility: {
        minVersion: string;
        maxVersion?: string;
    };
    verified: boolean;
    rating: number;
    downloads: number;
    createdAt: string;
    updatedAt: string;
}

// Optimal Timing Analysis interface
export interface OptimalTimingAnalysis {
    profileId: string;
    service: SocialPlatform;
    recommendations: TimeSlotRecommendation[];
    analysis: {
        bestDays: Array<{
            dayOfWeek: number;
            dayName: string;
            averageEngagement: number;
            postCount: number;
            rank: number;
        }>;
        bestHours: Array<{
            hour: number;
            averageEngagement: number;
            postCount: number;
            rank: number;
        }>;
    };
    confidence: number;
    lastUpdated: string;
}

// Export all types as a namespace as well for convenience
export namespace BufferTypes {
    export type Platform = SocialPlatform;
    export type Profile = BufferProfile;
    export type Post = BufferPost;
    export type Analytics = PostAnalytics;
    export type Dashboard = DashboardStats;
    export type OptimalTiming = OptimalTimingAnalysis;
    export type Summary = AnalyticsSummary;
    export type Options = AnalyticsOptions;
    export type CreateData = CreatePostData;
    export type ListOptions = PostListOptions;
    export type Response<T> = APIResponse<T>;
    export type Tokens = AuthTokens;
    export type Error = BufferAPIError;
    export type PluginType = Plugin;
    export type PluginContext = PluginExecutionContext;
    export type PluginExecResult<T = any> = PluginExecutionResult<T>;
    export type PluginExecError = PluginExecutionError;
    export type TimeSlot = TimeSlotRecommendation;
}
