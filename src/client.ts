// Re-export the BufferClient class and factory function
// This file should contain your BufferClient implementation from index.ts
// Moving it here for better organization

import {
    BufferProfile,
    BufferPost,
    PostAnalytics,
    AnalyticsSummary,
    PostListOptions,
    CreatePostData,
    AnalyticsOptions,
    APIResponse,
    BufferAPIError,
    AuthTokens,
    TimeRange,
    SocialPlatform, HTTPClient, BufferClientConfig, BufferTypes
} from './types';

import axios from 'axios';
import RetryConfig = BufferTypes.RetryConfig;
import RateLimitState = BufferTypes.RateLimitState;

// HTTP Client interface to maintain type safety

export class BufferClient {
    private httpClient: HTTPClient;
    private config: Required<BufferClientConfig> | any;
    private retryConfig: RetryConfig | any;
    private rateLimitState: RateLimitState | any;
    private clientConfig: Partial<BufferClientConfig>;

    constructor(config: Partial<BufferClientConfig>) {
        this.httpClient = axios;
        this.clientConfig = config;
    }

    public async initialize(): Promise<this> {
        const response: any = await this.exchangeCodeForTokens(this.clientConfig.bufferSDK)
        // Set defaults
        this.config = {
            accessToken: response?.data.access_token,
            baseUrl: 'http://localhost:8083/api/v1/sdk',
            timeout: this.clientConfig.timeout || 10000,
            retryAttempts: this.clientConfig.retryAttempts || 3,
            retryDelay: this.clientConfig.retryDelay || 1000,
            rateLimit: {
                requests: this.clientConfig.rateLimit?.requests || 100,
                window: this.clientConfig.rateLimit?.window || 3600000, // 1 hour in ms
            },
            bufferSDK: this.clientConfig.bufferSDK
        };

        this.retryConfig = {
            attempts: this.config.retryAttempts,
            delay: this.config.retryDelay,
            backoffFactor: 2,
        };

        this.rateLimitState = {
            requests: 0,
            resetTime: Date.now() + this.config.rateLimit.window,
        };

        // Set up HTTP client
        if (this.httpClient) {
            this.httpClient = this.setupHttpClient(this.httpClient);
        } else {
            throw new Error('HTTP client is required. Please provide an HTTP client (e.g., axios instance)');
        }
        return this;
    }

    private setupHttpClient(httpClient: HTTPClient): HTTPClient {
        // If it's an axios instance, set up interceptors
        if (httpClient.defaults && httpClient.interceptors) {
            // Set default headers
            httpClient.defaults.baseURL = this.config.baseUrl;
            httpClient.defaults.timeout = this.config.timeout;
            httpClient.defaults.headers['Authorization'] = `Bearer ${this.config.accessToken}`;
            httpClient.defaults.headers['Content-Type'] = 'application/json';
            httpClient.defaults.headers['User-Agent'] = 'BufferOptimizer/1.0.0';
            // Request interceptor for rate limiting
            httpClient.interceptors.request.use(async (config: any) => {
                await this.checkRateLimit();
                return config;
            });

            // Response interceptor for error handling
            httpClient.interceptors.response.use(
                (response: any) => response,
                (error: any) => {
                    throw this.handleAPIError(error);
                }
            );
        }

        return httpClient;
    }

    private async checkRateLimit(): Promise<void> {
        const now = Date.now();

        // Reset rate limit window if expired
        if (now > this.rateLimitState.resetTime) {
            this.rateLimitState.requests = 0;
            this.rateLimitState.resetTime = now + this.config.rateLimit.window;
        }

        // Check if we've exceeded rate limit
        if (this.rateLimitState.requests >= this.config.rateLimit.requests) {
            const waitTime = this.rateLimitState.resetTime - now;
            throw new BufferAPIError(
                'RATE_LIMIT_EXCEEDED',
                `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
                429
            );
        }

        this.rateLimitState.requests++;
    }

    private handleAPIError(error: any): BufferAPIError {
        if (error.response) {
            const { status, data } = error.response;
            const errorData = data as any;

            return new BufferAPIError(
                errorData?.code || `HTTP_${status}`,
                errorData?.message || error.message,
                status,
                errorData
            );
        }

        if (error.request) {
            return new BufferAPIError(
                'NETWORK_ERROR',
                'No response received from Buffer API',
                undefined,
                { originalError: error.message }
            );
        }

        return new BufferAPIError(
            'REQUEST_ERROR',
            error.message,
            undefined,
            { originalError: error.message }
        );
    }

    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        currentAttempt = 1
    ): Promise<T> {
        try {
            return await requestFn();
        } catch (error) {
            if (currentAttempt >= this.retryConfig.attempts) {
                throw error;
            }

            // Only retry on certain error types
            if (error instanceof BufferAPIError) {
                const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'HTTP_500', 'HTTP_502', 'HTTP_503'];
                if (!retryableCodes.includes(error.code)) {
                    throw error;
                }
            }

            const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoffFactor, currentAttempt - 1);
            await this.sleep(delay);

            return this.retryRequest(requestFn, currentAttempt + 1);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Profiles API
    public readonly profiles = {
        list: async (): Promise<BufferProfile[]> => {
            if (this.config.bufferSDK.sdkMockMode) {
                return this.generateMockProfiles();
            }

            return this.retryRequest(async () => {
                const response = await this.httpClient.get<APIResponse<BufferProfile[]>>('/profiles.json');
                return response.data?.data || [];
            });
        },

        get: async (profileId: string): Promise<BufferProfile> => {
            if (this.config.bufferSDK.sdkMockMode) {
                const profiles = await this.generateMockProfiles();
                const profile = profiles.find(p => p.id === profileId);
                if (!profile) {
                    throw new BufferAPIError('PROFILE_NOT_FOUND', `Profile ${profileId} not found`, 404);
                }
                return profile;
            }

            return this.retryRequest(async () => {
                const response = await this.httpClient.get<APIResponse<BufferProfile>>(`/profiles/${profileId}.json`);
                if (!response.data?.data) {
                    throw new BufferAPIError('PROFILE_NOT_FOUND', `Profile ${profileId} not found`, 404);
                }
                return response.data.data;
            });
        },
    };

    // Posts API
    public readonly posts = {
        list: async (profileId: string, options: PostListOptions = {}): Promise<BufferPost[]> => {
            if (this.config.bufferSDK.sdkMockMode) {
                return this.generateMockPosts(profileId, options);
            }

            return this.retryRequest(async () => {
                const params = new URLSearchParams();
                if (options.page) params.append('page', options.page.toString());
                if (options.count) params.append('count', options.count.toString());
                if (options.since) params.append('since', options.since);
                if (options.until) params.append('until', options.until);
                if (options.status) params.append('status', options.status);

                const response = await this.httpClient.get<APIResponse<BufferPost[]>>(
                    `/profiles/${profileId}/updates.json?${params}`
                );
                return response.data?.data || [];
            });
        },

        get: async (postId: string): Promise<BufferPost> => {
            if (this.config.bufferSDK.sdkMockMode) {
                return this.generateMockPost(postId);
            }

            return this.retryRequest(async () => {
                const response = await this.httpClient.get<APIResponse<BufferPost>>(`/updates/${postId}.json`);
                if (!response.data?.data) {
                    throw new BufferAPIError('POST_NOT_FOUND', `Post ${postId} not found`, 404);
                }
                return response.data.data;
            });
        },

        create: async (profileId: string, data: CreatePostData): Promise<BufferPost> => {
            if (this.config.bufferSDK.sdkMockMode) {
                return this.generateMockPost(`mock_${Date.now()}`, data);
            }

            return this.retryRequest(async () => {
                const response = await this.httpClient.post<APIResponse<BufferPost>>(
                    `/updates/${profileId}.json`,
                    data
                );
                if (!response.data?.data) {
                    throw new BufferAPIError('POST_CREATE_FAILED', 'Failed to create post');
                }
                return response.data.data;
            });
        },

        analytics: async (postId: string): Promise<PostAnalytics> => {
            if (this.config.bufferSDK.sdkMockMode) {
                return this.generateMockPostAnalytics(postId);
            }

            return this.retryRequest(async () => {
                const response = await this.httpClient.get<APIResponse<PostAnalytics>>(
                    `/updates/${postId}/interactions.json`
                );
                if (!response.data?.data) {
                    throw new BufferAPIError('ANALYTICS_NOT_FOUND', `Analytics for post ${postId} not found`, 404);
                }
                return response.data.data;
            });
        },
    };

    // Analytics API
    // Helper method to create complete options with defaults
    private createCompleteAnalyticsOptions(options: Partial<AnalyticsOptions> = {}): AnalyticsOptions {
        const defaultStart = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const defaultEnd = new Date().toISOString().split('T')[0];

        return {
            timeRange: options.timeRange || '30d',
            start: options.start || defaultStart,
            end: options.end || defaultEnd,
            period: options.period || 'day',
            platforms: options.platforms,
            includeMetrics: options.includeMetrics,
            groupBy: options.groupBy,
            customDateRange: options.customDateRange,
        };
    }

// Helper method to build URL parameters for analytics requests
    private buildAnalyticsParams(options: Partial<AnalyticsOptions> = {}): URLSearchParams {
        const params = new URLSearchParams();

        // Handle different date specification methods
        if (options.start || options.end) {
            // Use explicit start/end dates if provided
            if (options.start) params.append('start', options.start);
            if (options.end) params.append('end', options.end);
        } else if (options.timeRange) {
            // Convert timeRange to start/end dates
            const { start, end } = this.convertTimeRangeToDateRange(options.timeRange);
            params.append('start', start);
            params.append('end', end);
        } else {
            // Default to last 30 days if nothing specified
            const { start, end } = this.convertTimeRangeToDateRange('30d');
            params.append('start', start);
            params.append('end', end);
        }

        // Add optional parameters
        if (options.period) params.append('period', options.period);
        if (options.groupBy) params.append('groupBy', options.groupBy);

        return params;
    }

// Helper method to convert timeRange to actual date strings
    private convertTimeRangeToDateRange(timeRange: TimeRange): { start: string; end: string } {
        const timeRangeMap: Record<TimeRange, number> = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365,
            'custom': 30 // fallback
        };

        const days = timeRangeMap[timeRange] || 30;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }

// Generic analytics request handler
    private async executeAnalyticsRequest<T>(
        endpoint: string,
        options: Partial<AnalyticsOptions>,
        profileId: string,
        mockDataGenerator: (profileId: string, options: AnalyticsOptions) => T,
        errorCode: string,
        errorMessage: string
    ): Promise<T> {
        if (this.config.bufferSDK.sdkMockMode) {
            const completeOptions = this.createCompleteAnalyticsOptions(options);
            return mockDataGenerator(profileId, completeOptions);
        }

        return this.retryRequest(async () => {
            const params = this.buildAnalyticsParams(options);
            const url = `${this.config.baseUrl}/profiles/${profileId}/${endpoint}?${params}`;

            const response = await this.httpClient.get<APIResponse<T>>(url);
            if (!response.data?.data) {
                throw new BufferAPIError(errorCode, errorMessage, 404);
            }

            return response.data.data;
        });
    }

// Clean analytics API with DRY principles
    public readonly analytics = {
        posts: async (profileId: string, options: Partial<AnalyticsOptions> = {}): Promise<PostAnalytics[]> => {
            return this.executeAnalyticsRequest(
                'analytics/posts.json',
                options,
                profileId,
                (id, opts) => this.generateMockAnalytics(id, opts),
                'POSTS_NOT_FOUND',
                `Analytics posts for profile ${profileId} not found`
            );
        },

        summary: async (profileId: string, options: Partial<AnalyticsOptions> = {}): Promise<AnalyticsSummary> => {
            return this.executeAnalyticsRequest(
                'analytics/summary.json',
                options,
                profileId,
                (id, opts) => this.generateMockSummary(id, opts),
                'SUMMARY_NOT_FOUND',
                `Summary for profile ${profileId} not found`
            );
        },

        // Easy to add new analytics endpoints without duplication
        insights: async (profileId: string, options: Partial<AnalyticsOptions> = {}): Promise<any> => {
            return this.executeAnalyticsRequest(
                'analytics/insights.json',
                options,
                profileId,
                () => ({ insights: 'mock data' }), // Mock generator
                'INSIGHTS_NOT_FOUND',
                `Insights for profile ${profileId} not found`
            );
        },
    };

    private async exchangeCodeForTokens({clientId, clientSecret, code, redirectUri}:
                                            {
                                                clientId: string,
                                                clientSecret: string,
                                                code: string,
                                                redirectUri: string
                                            }
    ): Promise<AuthTokens> {
        const response = await this.httpClient.post('http://localhost:8083/api/v1/auth/oauth2/token.json', {
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
            grant_type: 'authorization_code',
        });

        return response.data;
    }

    // Mock data generators for demo purposes
    private generateMockProfiles(): BufferProfile[] {
        return [
            {
                id: 'profile_x_001',
                service: 'x',
                service_username: 'bufferoptimizer',
                service_id: '1234567890',
                formatted_username: '@bufferoptimizer',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                timezone: 'America/Los_Angeles',
                schedules: [
                    {
                        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
                        times: ['09:00', '13:00', '17:00', '20:00'],
                    },
                    {
                        days: ['sat', 'sun'],
                        times: ['11:00', '15:00'],
                    },
                ],
                default: true,
            },
            {
                id: 'profile_linkedin_002',
                service: 'linkedin',
                service_username: 'buffer-content-optimizer',
                service_id: '0987654321',
                formatted_username: 'Buffer Content Optimizer',
                avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
                timezone: 'America/Los_Angeles',
                schedules: [
                    {
                        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
                        times: ['08:00', '12:00', '16:00'],
                    },
                ],
                default: false,
            },
            {
                id: 'profile_facebook_003',
                service: 'facebook',
                service_username: 'BufferContentOptimizer',
                service_id: '1122334455',
                formatted_username: 'Buffer Content Optimizer',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                timezone: 'America/Los_Angeles',
                schedules: [
                    {
                        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                        times: ['10:00', '14:00', '19:00'],
                    },
                ],
                default: false,
            },
            {
                id: 'profile_instagram_004',
                service: 'instagram',
                service_username: 'buffer.optimizer',
                service_id: '5566778899',
                formatted_username: '@buffer.optimizer',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=150&h=150&fit=crop&crop=face',
                timezone: 'America/Los_Angeles',
                schedules: [
                    {
                        days: ['mon', 'wed', 'fri'],
                        times: ['12:00', '17:00'],
                    },
                    {
                        days: ['sat', 'sun'],
                        times: ['10:00', '14:00', '18:00'],
                    },
                ],
                default: false,
            },
        ];
    }

    private generateMockPosts(profileId: string, options: PostListOptions): BufferPost[] {
        const posts: BufferPost[] = [];
        const count = options.count || 20;

        for (let i = 0; i < count; i++) {
            posts.push({
                id: `post_${profileId}_${i}`,
                profile_id: profileId,
                status: Math.random() > 0.8 ? 'buffer' : 'sent',
                text: `Sample post content ${i + 1} with engaging text and hashtags #buffer #socialmedia`,
                text_formatted: `Sample post content ${i + 1} with engaging text and hashtags <strong>#buffer</strong> <strong>#socialmedia</strong>`,
                created_at: Date.now() - (i * 86400000), // One day apart
                due_at: Date.now() + (i * 3600000), // One hour apart
                sent_at: Math.random() > 0.5 ? Date.now() - (i * 3600000) : undefined,
                statistics: {
                    reach: Math.floor(Math.random() * 10000),
                    clicks: Math.floor(Math.random() * 500),
                    retweets: Math.floor(Math.random() * 100),
                    favorites: Math.floor(Math.random() * 200),
                    mentions: Math.floor(Math.random() * 50),
                    comments: Math.floor(Math.random() * 30),
                    shares: Math.floor(Math.random() * 40),
                },
            });
        }

        return posts;
    }

    private generateMockPost(postId: string, data?: CreatePostData): BufferPost {
        return {
            id: postId,
            profile_id: 'profile_mock_001',
            status: 'buffer',
            text: data?.text || `Mock post content for ${postId}`,
            text_formatted: data?.text || `Mock post content for ${postId}`,
            created_at: Date.now(),
            due_at: data?.scheduled_at ? new Date(data.scheduled_at).getTime() : Date.now() + 3600000,
            statistics: {
                reach: 0,
                clicks: 0,
                retweets: 0,
                favorites: 0,
                mentions: 0,
                comments: 0,
                shares: 0,
            },
        };
    }

    private generateMockPostAnalytics(postId: string): PostAnalytics {
        return {
            postId,
            profileId: 'profile_mock_001',
            service: 'x',
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            text: 'Sample post for analytics',
            metrics: {
                likes: Math.floor(Math.random() * 200),
                comments: Math.floor(Math.random() * 50),
                shares: Math.floor(Math.random() * 30),
                clicks: Math.floor(Math.random() * 100),
                retweets: Math.floor(Math.random() * 25),
            },
            engagementRate: Math.random() * 0.1,
            reach: Math.floor(Math.random() * 5000),
            impressions: Math.floor(Math.random() * 10000),
        };
    }

    private generateMockAnalytics(profileId: string, options: AnalyticsOptions): PostAnalytics[] {
        const analytics: PostAnalytics[] = [];
        const platforms = ['x', 'linkedin', 'facebook', 'instagram'] as const;

        // Determine time range from options
        const timeRangeDays = this.getTimeRangeDays(options);
        const totalPosts = this.calculatePostCount(timeRangeDays, options);

        // Filter platforms if specified in options
        const platformsToUse = options.platforms && options.platforms.length > 0
            ? options.platforms.filter(p => platforms.includes(p as any))
            : platforms;

        let postIndex = 0;
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const postsPerDay = Math.ceil(totalPosts / timeRangeDays);

        // Generate posts distributed over the time range
        for (let day = 0; day < timeRangeDays; day++) {
            const dailyPostCount = Math.min(postsPerDay, totalPosts - postIndex);

            for (let i = 0; i < dailyPostCount && postIndex < totalPosts; i++) {
                const platformIndex = postIndex % platformsToUse.length;
                const platform = platformsToUse[platformIndex] as 'x' | 'linkedin' | 'facebook' | 'instagram';

                // Calculate post date within the specified range
                const postDate = new Date(Date.now() - (day * millisecondsPerDay) - (i * (millisecondsPerDay / dailyPostCount)));

                // Skip if outside custom date range
                if (options.start && postDate < new Date(options.start)) continue;
                if (options.end && postDate > new Date(options.end)) continue;

                // Get platform-specific data
                const currentProfileId = this.getProfileIdForPlatform(platform, profileId);
                const content = this.generatePlatformContent(platform, postIndex);
                const baseEngagement = this.getBaseEngagementForPlatform(platform);
                const variation = (Math.random() - 0.5) * 0.02;
                const engagementRate = Math.max(0.01, baseEngagement + variation);
                const reach = this.getPlatformReach(platform);
                const impressions = Math.floor(reach * this.getPlatformImpressionMultiplier(platform));

                analytics.push({
                    postId: `post_${platform}_${postIndex}`,
                    profileId: currentProfileId,
                    service: platform,
                    publishedAt: postDate.toISOString(),
                    text: content,
                    metrics: this.generatePlatformMetrics(platform, engagementRate, reach),
                    engagementRate,
                    reach,
                    impressions,
                });

                postIndex++;
            }
        }

        return analytics.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

// Helper method to convert options to days
    private getTimeRangeDays(options: AnalyticsOptions): number {
        // If custom date range is provided
        if (options.start && options.end) {
            const start = new Date(options.start);
            const end = new Date(options.end);
            return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        }

        // Convert timeRange to days
        const timeRangeMap: Record<string, number> = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365,
            'custom': 30
        };

        return timeRangeMap[options.timeRange || '30d'] || 30;
    }

// Calculate appropriate post count based on time range
    private calculatePostCount(days: number, options: AnalyticsOptions): number {
        const platformCount = options.platforms?.length || 4;
        const basePostsPerDay = platformCount; // 1 post per platform per day

        // Adjust based on period grouping
        let multiplier = 1;
        if (options.period === 'week') multiplier = 0.5;
        if (options.period === 'month') multiplier = 0.3;

        return Math.min(Math.floor(days * basePostsPerDay * multiplier), 500); // Cap at 500 for performance
    }

// Platform-specific helper methods (add these to your BufferClient class)
    private getProfileIdForPlatform(platform: 'x' | 'linkedin' | 'facebook' | 'instagram', fallbackId: string): string {
        const profileMap = {
            x: 'profile_x_001',
            linkedin: 'profile_linkedin_002',
            facebook: 'profile_facebook_003',
            instagram: 'profile_instagram_004',
        };
        return profileMap[platform] || fallbackId;
    }

    private getBaseEngagementForPlatform(platform: 'x' | 'linkedin' | 'facebook' | 'instagram'): number {
        const baseRates = {
            x: 0.045,           // 4.5% average
            linkedin: 0.054,    // 5.4% average (higher for B2B)
            facebook: 0.063,    // 6.3% average
            instagram: 0.071,   // 7.1% average (highest visual engagement)
        };
        return baseRates[platform];
    }

    private getPlatformReach(platform: 'x' | 'linkedin' | 'facebook' | 'instagram'): number {
        const reachRanges = {
            x: { min: 800, max: 8000 },
            linkedin: { min: 500, max: 3000 },
            facebook: { min: 1200, max: 12000 },
            instagram: { min: 600, max: 6000 },
        };

        const range = reachRanges[platform];
        return Math.floor(Math.random() * (range.max - range.min) + range.min);
    }

    private getPlatformImpressionMultiplier(platform: 'x' | 'linkedin' | 'facebook' | 'instagram'): number {
        const multipliers = {
            x: 1.8,
            linkedin: 1.4,
            facebook: 2.2,
            instagram: 1.6,
        };
        return multipliers[platform] + (Math.random() * 0.4);
    }

    private generatePlatformContent(platform: 'x' | 'linkedin' | 'facebook' | 'instagram', index: number): string {
        const contentTemplates = {
            x: [
                `🚀 Exciting updates coming to our platform! What feature would you like to see next? #innovation #tech #startup`,
                `📊 Data shows that engaged teams are 3x more productive. How do you keep your team motivated? #productivity #leadership`,
                `💡 Pro tip: Schedule your social media posts during peak engagement hours for maximum reach! #socialmedia #marketing`,
                `🔥 Just launched our new analytics dashboard! The insights are incredible. Check it out 👇 #analytics #data`,
            ],
            linkedin: [
                `Thrilled to share insights from our latest industry report. Key findings that every professional should know about the future of social media marketing.`,
                `Leadership isn't about having all the answers—it's about asking the right questions and empowering your team to find innovative solutions.`,
                `The future of work is hybrid, and companies that adapt quickly will thrive. How is your organization preparing for this transformation?`,
                `Data-driven decision making has revolutionized our business operations. Here's how we leverage analytics to drive sustainable growth and innovation.`,
            ],
            facebook: [
                `We're so grateful for our amazing community! 🙏 Thank you for your continued support and feedback. Your input helps us build better tools every day.`,
                `Behind the scenes look at our team working hard to bring you the best social media optimization features. The dedication is incredible! 💪`,
                `What's your favorite way to stay productive while working from home? Share your tips below – we love learning from our community! 🏠`,
                `Celebrating another milestone! 🎉 Thanks to everyone who's been part of this incredible journey. Here's to many more achievements together.`,
            ],
            instagram: [
                `✨ Creating magic one post at a time. What inspires your content creation journey? Drop a comment below! #contentcreator #inspiration`,
                `🌟 Monday motivation: Your only limit is your mind. Dream big, work hard, and make it happen! #mondaymotivation #dreambig #hustle`,
                `📷 Captured this amazing moment during our team retreat last week. Nothing beats good vibes and great people! #teamretreat #goodvibes`,
                `🎨 Design is not just what it looks like—design is how it works. Function meets beauty in everything we create. #designthinking #ux`,
            ],
        };

        const templates = contentTemplates[platform];
        return templates[index % templates.length];
    }

    private generatePlatformMetrics(
        platform: 'x' | 'linkedin' | 'facebook' | 'instagram',
        engagementRate: number,
        reach: number
    ): PostAnalytics['metrics'] {
        const totalEngagement = Math.floor(reach * engagementRate);

        // Platform-specific metric distributions
        const distributions = {
            x: {
                likes: 0.6,
                retweets: 0.15,
                comments: 0.15,
                clicks: 0.1
            },
            linkedin: {
                likes: 0.5,
                comments: 0.25,
                shares: 0.15,
                clicks: 0.1
            },
            facebook: {
                likes: 0.55,
                comments: 0.2,
                shares: 0.15,
                clicks: 0.1
            },
            instagram: {
                likes: 0.75,
                comments: 0.15,
                saves: 0.08,
                clicks: 0.02
            }
        };

        const dist: any = distributions[platform];

        const baseMetrics: PostAnalytics['metrics'] = {
            likes: Math.floor(totalEngagement * dist.likes),
            comments: Math.floor(totalEngagement * (dist.comments || 0)),
            clicks: Math.floor(totalEngagement * (dist.clicks || 0)),
            shares: Math.floor(totalEngagement * (dist.shares || 0)),
        };

        // Add platform-specific metrics
        switch (platform) {
            case 'x':
                return {
                    ...baseMetrics,
                    retweets: Math.floor(totalEngagement * (dist.retweets || 0)),
                };

            case 'linkedin':
                return {
                    ...baseMetrics,
                    shares: Math.floor(totalEngagement * (dist.shares || 0)),
                };

            case 'facebook':
                return {
                    ...baseMetrics,
                    shares: Math.floor(totalEngagement * (dist.shares || 0)),
                    reactions: baseMetrics.likes,
                };

            case 'instagram':
                return {
                    ...baseMetrics,
                    saves: Math.floor(totalEngagement * (dist.saves || 0)),
                };

            default:
                return baseMetrics;
        }
    }

    private generateMockSummary(profileId: string, options: Partial<AnalyticsOptions> = {}): AnalyticsSummary {
        // Get analytics data to base summary on
        const posts = this.generateMockAnalytics(profileId, options as AnalyticsOptions);

        // Calculate real metrics from the posts
        const totalEngagement = posts.reduce((sum, post) => {
            return sum + Object.values(post.metrics).reduce((metricSum, val) => metricSum + (val || 0), 0);
        }, 0);

        const avgEngagementRate = posts.length > 0
            ? posts.reduce((sum, post) => sum + post.engagementRate, 0) / posts.length
            : 0;

        // Find best performing post
        const bestPost = posts.reduce((best, current) =>
                current.engagementRate > best.engagementRate ? current : best
            , posts[0]);

        // Calculate platform breakdown
        const platformBreakdown = ['x', 'linkedin', 'facebook', 'instagram'].map(platform => {
            const platformPosts = posts.filter(post => post.service === platform);
            const platformEngagement = platformPosts.reduce((sum, post) => sum + post.engagementRate, 0);
            const avgRate = platformPosts.length > 0 ? platformEngagement / platformPosts.length : 0;
            const totalReach = platformPosts.reduce((sum, post) => sum + post.reach, 0);

            return {
                platform: platform as SocialPlatform,
                postCount: platformPosts.length,
                engagementRate: avgRate,
                reach: totalReach,
            };
        }).filter(item => item.postCount > 0);

        return {
            profileId,
            timeRange: options.timeRange || '30d',
            totalPosts: posts.length,
            totalEngagement,
            averageEngagementRate: avgEngagementRate,
            bestPerformingPost: bestPost?.postId || `post_${profileId}_best`,
            topPerformingTime: '14:00', // Could be calculated from actual post times
            topMetrics: {
                likes: posts.reduce((sum, post) => sum + (post.metrics.likes || 0), 0),
                comments: posts.reduce((sum, post) => sum + (post.metrics.comments || 0), 0),
                shares: posts.reduce((sum, post) => sum + (post.metrics.shares || 0), 0),
                clicks: posts.reduce((sum, post) => sum + (post.metrics.clicks || 0), 0),
                reach: posts.reduce((sum, post) => sum + post.reach, 0),
                impressions: posts.reduce((sum, post) => sum + post.impressions, 0),
            },
            platformBreakdown,
            trending: {
                direction: avgEngagementRate > 0.05 ? 'up' : 'down',
                percentage: Math.floor(Math.random() * 20) + 5,
            },
        };
    }
}

// Export factory function for easy instantiation
export const createBufferClient = async (config: Partial<BufferClientConfig>): Promise<BufferClient> => {
    return await (new BufferClient(config)).initialize();
};
