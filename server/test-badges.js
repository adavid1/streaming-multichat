import { getTwitchBadgesPublic, extractSubscriptionBadges } from './src/twitch-api.ts';

// Test badge fetching
async function testBadgeFetching() {
  console.log('Testing Twitch badge fetching...');
  
  // Try different channels that might have custom subscription badges
  const testChannels = ['pokimane', 'xqc', 'shroud', 'ninja'];
  
  for (const testChannel of testChannels) {
    console.log(`\n🔍 Testing channel: ${testChannel}`);
    
    try {
      const badges = await getTwitchBadgesPublic(testChannel);
      
      if (badges) {
        console.log(`✅ Successfully fetched badges for ${testChannel}!`);
        console.log('Available badge sets:', Object.keys(badges.badge_sets));
        
        // Show details about each badge set
        Object.entries(badges.badge_sets).forEach(([badgeSet, badgeData]) => {
          console.log(`\n📛 Badge Set: ${badgeSet}`);
          if (badgeData.versions) {
            const versions = Object.keys(badgeData.versions);
            console.log(`   Versions: ${versions.join(', ')}`);
            
            if (badgeSet === 'subscriber') {
              console.log('   🎯 This is a subscription badge set!');
              // Show a few example URLs
              versions.slice(0, 3).forEach(version => {
                const url = badgeData.versions[version].image_url_1x;
                console.log(`   ${version} months: ${url}`);
                // Check if this looks like a custom badge (not the default Twitch one)
                if (!url.includes('5d9f2208-5dd8-4e87-b33e-1f74cf0d46f1')) {
                  console.log(`   🎨 This appears to be a CUSTOM subscription badge!`);
                }
              });
            }
          }
        });
        
        const subscriptionBadges = extractSubscriptionBadges(badges);
        console.log(`\n🎯 Extracted ${Object.keys(subscriptionBadges).length} subscription badge versions`);
        
        // Check if any are custom badges
        const customBadges = Object.entries(subscriptionBadges).filter(([months, url]) => 
          !url.includes('5d9f2208-5dd8-4e87-b33e-1f74cf0d46f1')
        );
        
        if (customBadges.length > 0) {
          console.log(`🎨 Found ${customBadges.length} custom subscription badges!`);
          customBadges.forEach(([months, url]) => {
            console.log(`  ${months} months: ${url}`);
          });
        } else {
          console.log('📋 Using default Twitch subscription badges');
        }
        
        // Only test the first channel that works to avoid spam
        break;
      } else {
        console.log(`❌ Failed to fetch badges for ${testChannel}`);
      }
    } catch (error) {
      console.error(`❌ Error during badge fetching for ${testChannel}:`, error.message);
    }
  }
}

// Run the test
testBadgeFetching();
