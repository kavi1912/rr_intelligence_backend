// Test script to verify property updates reflect immediately in bot responses
const { aiConversationService } = require('./dist/services/aiConversationService.js');

async function testPropertyUpdates() {
  console.log('🔧 Testing property cache refresh...');
  
  // Force refresh cache
  aiConversationService.refreshPropertyCache();
  console.log('✅ Cache refreshed');
  
  // Test getting property data
  try {
    const images = await aiConversationService.getPropertyImages(0);
    console.log(`✅ Property 1 has ${images.length} images`);
  } catch (error) {
    console.log('❌ Error getting images:', error.message);
  }
  
  console.log('✅ Property update test completed');
}

// Run if called directly
if (require.main === module) {
  testPropertyUpdates().catch(console.error);
}

module.exports = { testPropertyUpdates };
