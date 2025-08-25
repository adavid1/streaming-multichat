import { addCustomChannelBadges } from './src/twitch-api.ts';

// Test custom badge functionality
async function testCustomBadges() {
  console.log('Testing custom subscription badge functionality...');
  
  const testChannel = 'mycustomchannel';
  
  // Add custom subscription badges for the test channel
  const customBadges = {
    '1': 'https://example.com/custom-badges/1-month.png',
    '3': 'https://example.com/custom-badges/3-months.png',
    '6': 'https://example.com/custom-badges/6-months.png',
    '9': 'https://example.com/custom-badges/9-months.png',
    '12': 'https://example.com/custom-badges/12-months.png',
    '18': 'https://example.com/custom-badges/18-months.png',
    '24': 'https://example.com/custom-badges/24-months.png',
    '36': 'https://example.com/custom-badges/36-months.png',
    '48': 'https://example.com/custom-badges/48-months.png',
    '60': 'https://example.com/custom-badges/60-months.png',
  };
  
  console.log(`\n🎨 Adding custom badges for channel: ${testChannel}`);
  addCustomChannelBadges(testChannel, customBadges);
  
  console.log('\n✅ Custom badges added successfully!');
  console.log('\n📋 How to use custom badges:');
  console.log('1. Add your custom badge URLs to the CUSTOM_CHANNEL_BADGES object in twitch-api.ts');
  console.log('2. Or use the addCustomChannelBadges() function in your code');
  console.log('3. The app will automatically use custom badges for the specified channel');
  console.log('4. If no custom badges are found, it will fall back to default Twitch badges');
  
  console.log('\n🎯 Example usage in your code:');
  console.log(`
import { addCustomChannelBadges } from './src/twitch-api.js';

// Add custom badges for your channel
addCustomChannelBadges('yourchannel', {
  '1': 'https://your-domain.com/badges/1-month.png',
  '3': 'https://your-domain.com/badges/3-months.png',
  '6': 'https://your-domain.com/badges/6-months.png',
  // ... add more months as needed
});
  `);
}

// Run the test
testCustomBadges();
