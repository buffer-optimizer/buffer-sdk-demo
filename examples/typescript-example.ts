/**
 * Buffer SDK Demo - TypeScript Example
 *
 * ⚠️ DISCLAIMER: This is a demonstration project created for job application purposes.
 * Not affiliated with Buffer Inc. All data is simulated for demonstration.
 */

import {
    createBufferClient,
    BufferClient,
    BufferProfile,
    PostAnalytics,
    AnalyticsSummary,
    BufferAPIError,
    SocialPlatform
} from '@buffer/sdk-demo';

interface AnalyticsDashboard {
    overview: AnalyticsSummary;
    topPosts: PostAnalytics[];
    platformPerformance: Array<{
        platform: SocialPlatform;
        posts: number;
        avgEngagement: number;
        totalReach: number;
    }>;
}

/**
 * Demonstration Social Media Manager Class
 * Showcases TypeScript patterns for API client development
 */
class SocialMediaManager {
    private client: BufferClient;

    constructor(client: BufferClient) {
        this.client = client;
    }

    async getConnectedProfiles(): Promise<BufferProfile[]> {
        try {
            return await this.client.profiles.list();
        } catch (error) {
            if (error instanceof BufferAPIError) {
                console.error(`Demo API Error: ${error.code} - ${error.message}`);
            }
            throw error;
        }
    }

    async schedulePost(
        profileId: string,
        content: string,
        scheduledTime: Date
    ): Promise<void> {
        try {
            const post = await this.client.posts.create(profileId, {
                text: content,
                scheduled_at: scheduledTime.toISOString(),
            });

            console.log(`✅ Demo post scheduled successfully! ID: ${post.id} [SIMULATED]`);
        } catch (error) {
            if (error instanceof BufferAPIError) {
                console.error(`Failed to schedule demo post: ${error.message}`);
            }
            throw error;
        }
    }

    async generateAnalyticsDashboard(profileId: string): Promise<AnalyticsDashboard> {
        try {
            // Get overview analytics
            const overview = await this.client.analytics.summary(profileId, {
                timeRange: '30d',
            });

            // Get detailed post analytics
            const postAnalytics = await this.client.analytics.posts(profileId, {
                timeRange: '30d',
            });

            // Find top performing posts
            const topPosts = postAnalytics
                .sort((a, b) => b.engagementRate - a.engagementRate)
                .slice(0, 5);

            // Calculate platform performance
            const platformMap = new Map<SocialPlatform, PostAnalytics[]>();
            postAnalytics.forEach(post => {
                const existing = platformMap.get(post.service) || [];
                existing.push(post);
                platformMap.set(post.service, existing);
            });

            const platformPerformance = Array.from(platformMap.entries()).map(([platform, posts]) => ({
                platform,
                posts: posts.length,
                avgEngagement: posts.reduce((sum, post) => sum + post.engagementRate, 0) / posts.length,
                totalReach: posts.reduce((sum, post) => sum + post.reach, 0),
            }));

            return {
                overview,
                topPosts,
                platformPerformance,
            };
        } catch (error) {
            if (error instanceof BufferAPIError) {
                console.error(`Analytics error: ${error.code} - ${error.message}`);
            }
            throw error;
        }
    }

    async optimizePostingSchedule(profileId: string): Promise<string[]> {
        try {
            const analytics = await this.client.analytics.posts(profileId, {
                timeRange: '90d',
            });

            // Group posts by hour and calculate average engagement
            const hourlyEngagement = new Map<number, number[]>();

            analytics.forEach(post => {
                const hour = new Date(post.publishedAt).getHours();
                const existing = hourlyEngagement.get(hour) || [];
                existing.push(post.engagementRate);
                hourlyEngagement.set(hour, existing);
            });

            // Calculate average engagement per hour
            const hourlyAverages = Array.from(hourlyEngagement.entries())
                .map(([hour, rates]) => ({
                    hour,
                    avgEngagement: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
                    sampleSize: rates.length,
                }))
                .filter(data => data.sampleSize >= 3) // Only include hours with enough data
                .sort((a, b) => b.avgEngagement - a.avgEngagement);

            // Return top 3 hours as recommendations
            return hourlyAverages
                .slice(0, 3)
                .map(data => `${data.hour}:00 (${(data.avgEngagement * 100).toFixed(1)}% avg engagement)`);

        } catch (error) {
            console.error('Failed to optimize posting schedule:', error);
            return ['Unable to generate recommendations'];
        }
    }
}

async function main(): Promise<void> {
    try {
        // Initialize Buffer client
        const client = await createBufferClient({
            accessToken: process.env.BUFFER_ACCESS_TOKEN || 'mock-token',
            bufferSDK: {
                clientId: process.env.BUFFER_CLIENT_ID || 'mock-client-id',
                clientSecret: process.env.BUFFER_CLIENT_SECRET || 'mock-secret',
                redirectUri: process.env.BUFFER_REDIRECT_URI || 'http://localhost:3000/callback',
                sdkMockMode: true, // Enable mock mode for demo
            },
        });

        const manager = new SocialMediaManager(client);

        // Get connected profiles
        console.log('🔍 Fetching connected profiles...');
        const profiles = await manager.getConnectedProfiles();

        if (profiles.length === 0) {
            console.log('❌ No profiles connected');
            return;
        }

        console.log(`✅ Found ${profiles.length} demo profiles:`);
        profiles.forEach(profile => {
            console.log(`  📱 ${profile.formatted_username} (${profile.service}) [DEMO]`);
        });

        // Use first profile for demo
        const profile = profiles[0];
        console.log(`\n🎯 Working with demo profile: ${profile.formatted_username}`);

        // Generate analytics dashboard (simulated)
        console.log('\n📊 Generating demo analytics dashboard...');
        const dashboard = await manager.generateAnalyticsDashboard(profile.id);

        console.log('\n📈 Demo Analytics Overview [SIMULATED DATA]:');
        console.log(`  Total Posts: ${dashboard.overview.totalPosts}`);
        console.log(`  Avg Engagement: ${(dashboard.overview.averageEngagementRate * 100).toFixed(2)}%`);
        console.log(`  Total Reach: ${dashboard.overview.topMetrics.reach.toLocaleString()}`);

        console.log('\n🏆 Top Performing Demo Posts:');
        dashboard.topPosts.forEach((post, index) => {
            console.log(`  ${index + 1}. ${(post.engagementRate * 100).toFixed(2)}% - ${post.text.substring(0, 50)}... [DEMO]`);
        });

        console.log('\n🌐 Demo Platform Performance:');
        dashboard.platformPerformance.forEach(platform => {
            console.log(`  ${platform.platform}: ${platform.posts} posts, ${(platform.avgEngagement * 100).toFixed(2)}% avg engagement [DEMO]`);
        });

        // Get posting recommendations (simulated)
        console.log('\n⏰ Optimizing demo posting schedule...');
        const recommendations = await manager.optimizePostingSchedule(profile.id);
        console.log('📅 Demo best times to post [SIMULATED]:');
        recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });

        // Schedule a test post (simulated)
        console.log('\n📝 Scheduling a demo test post...');
        const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
        await manager.schedulePost(
            profile.id,
            `🚀 Testing Buffer SDK Demo with TypeScript! Scheduled for ${scheduledTime.toLocaleString()}`,
            scheduledTime
        );

        console.log('\n🎯 Demo completed successfully!');
        console.log('📝 This demonstration showcases TypeScript SDK patterns and API integration.');
        console.log('🔧 All data is simulated - no real social media connections were made.');
        console.log('\n📊 Generating analytics dashboard...');
        const dashboard = await manager.generateAnalyticsDashboard(profile.id);

        console.log('\n📈 Analytics Overview:');
        console.log(`  Total Posts: ${dashboard.overview.totalPosts}`);
        console.log(`  Avg Engagement: ${(dashboard.overview.averageEngagementRate * 100).toFixed(2)}%`);
        console.log(`  Total Reach: ${dashboard.overview.topMetrics.reach.toLocaleString()}`);

        console.log('\n🏆 Top Performing Posts:');
        dashboard.topPosts.forEach((post, index) => {
            console.log(`  ${index + 1}. ${(post.engagementRate * 100).toFixed(2)}% - ${post.text.substring(0, 50)}...`);
        });

        console.log('\n🌐 Platform Performance:');
        dashboard.platformPerformance.forEach(platform => {
            console.log(`  ${platform.platform}: ${platform.posts} posts, ${(platform.avgEngagement * 100).toFixed(2)}% avg engagement`);
        });

        // Get posting recommendations
        console.log('\n⏰ Optimizing posting schedule...');
        const recommendations = await manager.optimizePostingSchedule(profile.id);
        console.log('📅 Best times to post:');
        recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });

        // Schedule a test post
        console.log('\n📝 Scheduling a test post...');
        const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
        await manager.schedulePost(
            profile.id,
            `🚀 Testing Buffer SDK with TypeScript! Scheduled for ${scheduledTime.toLocaleString()}`,
            scheduledTime
        );

    } catch (error) {
        console.error('❌ Demo Application Error:', error);

        if (error instanceof BufferAPIError) {
            console.error(`  Code: ${error.code}`);
            console.error(`  Status: ${error.statusCode}`);
            console.error(`  Details:`, error.details);
        }

        console.log('\n📝 This error handling demonstrates proper SDK error management patterns.');
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}

export { SocialMediaManager, main };