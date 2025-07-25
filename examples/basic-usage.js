/**
 * Buffer SDK Demo - Basic Usage Example
 *
 * ⚠️ DISCLAIMER: This is a demonstration project created for job application purposes.
 * Not affiliated with Buffer Inc. All data is simulated for demonstration.
 */

const { createBufferClient } = require('@buffer/sdk-demo');

async function basicExample() {
    try {
        // Initialize the Buffer client
        const client = await createBufferClient({
            accessToken: process.env.BUFFER_ACCESS_TOKEN,
            bufferSDK: {
                clientId: process.env.BUFFER_CLIENT_ID,
                clientSecret: process.env.BUFFER_CLIENT_SECRET,
                redirectUri: process.env.BUFFER_REDIRECT_URI,
                sdkMockMode: true, // Set to false for production
            },
        });

        console.log('✅ Buffer SDK Demo initialized successfully (Mock Mode)');

        // Get all connected profiles (simulated)
        const profiles = await client.profiles.list();
        console.log(`📱 Found ${profiles.length} simulated profiles:`);

        profiles.forEach(profile => {
            console.log(`  - ${profile.formatted_username} (${profile.service}) [DEMO]`);
        });

        if (profiles.length === 0) {
            console.log('❌ No demo profiles found. Mock data should be available.');
            return;
        }

        // Use the first profile for examples
        const profile = profiles[0];
        console.log(`\n🎯 Using demo profile: ${profile.formatted_username}`);

        // Get recent posts (simulated)
        const posts = await client.posts.list(profile.id, { count: 5 });
        console.log(`\n📝 Demo posts (${posts.length}):`);

        posts.forEach(post => {
            const date = new Date(post.created_at).toLocaleDateString();
            console.log(`  - ${date}: ${post.text.substring(0, 50)}... [DEMO DATA]`);
        });

        // Create a new post (simulated)
        console.log('\n📤 Creating a demo post...');
        const newPost = await client.posts.create(profile.id, {
            text: `Hello from Buffer SDK Demo! 🚀 Posted at ${new Date().toLocaleString()}`,
            scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        });

        console.log(`✅ Demo post created successfully! ID: ${newPost.id} [SIMULATED]`);

        // Get analytics summary (simulated)
        console.log('\n📊 Getting demo analytics summary...');
        const analytics = await client.analytics.summary(profile.id, {
            timeRange: '30d',
        });

        console.log(`📈 Demo Analytics Summary (30 days) [SIMULATED DATA]:`);
        console.log(`  - Total posts: ${analytics.totalPosts}`);
        console.log(`  - Average engagement rate: ${(analytics.averageEngagementRate * 100).toFixed(2)}%`);
        console.log(`  - Total engagement: ${analytics.totalEngagement}`);
        console.log(`  - Best performing time: ${analytics.topPerformingTime}`);

        // Platform breakdown
        if (analytics.platformBreakdown.length > 0) {
            console.log('\n🌐 Demo platform breakdown:');
            analytics.platformBreakdown.forEach(platform => {
                console.log(`  - ${platform.platform}: ${platform.postCount} posts, ${(platform.engagementRate * 100).toFixed(2)}% engagement [DEMO]`);
            });
        }

        console.log('\n🎯 This demonstration showcases SDK architecture and API integration patterns.');
        console.log('📝 All data is simulated - no real social media connections were made.');

    } catch (error) {
        console.error('❌ Demo Error:', error.message);
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
    }
}

// Run the example
if (require.main === module) {
    basicExample();
}

module.exports = basicExample;