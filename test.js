// TEST YOUR GEMINI API KEY
// Save this as test-gemini.js in your backend folder
// Run: node test-gemini.js

require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("\n🔍 Testing Gemini API Key...\n");
console.log("API Key:", GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 20)}...` : "❌ NOT FOUND IN .env");

if (!GEMINI_API_KEY) {
    console.log("\n❌ ERROR: GEMINI_API_KEY not found in .env file!");
    process.exit(1);
}

// Test 1: List available models
console.log("\n📋 Test 1: Listing available models...\n");

fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`)
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.log("❌ Error:", data.error.message);
            console.log("\n💡 This might mean:");
            console.log("   1. Your API key is invalid");
            console.log("   2. Gemini API is not enabled");
            console.log("   3. You need a new API key from https://aistudio.google.com/app/apikey");
            return;
        }

        console.log("✅ Available models:\n");
        data.models.forEach(model => {
            if (model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`   ✓ ${model.name}`);
            }
        });

        // Test 2: Try to generate content
        console.log("\n📝 Test 2: Testing generateContent with gemini-1.5-flash...\n");

        return fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Say hello in one word" }]
                    }]
                })
            }
        );
    })
    .then(res => res ? res.json() : null)
    .then(data => {
        if (!data) return;

        if (data.error) {
            console.log("❌ Error:", data.error.message);
            
            // Try gemini-pro as fallback
            console.log("\n📝 Test 3: Trying gemini-pro as fallback...\n");
            
            return fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: "Say hello in one word" }]
                        }]
                    })
                }
            ).then(res => res.json());
        }

        const response = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("✅ SUCCESS! API is working!");
        console.log("Response:", response);
        console.log("\n🎉 Your chatbot will work now!\n");
        return data;
    })
    .then(data => {
        if (data && data.error) {
            console.log("❌ Gemini-pro also failed:", data.error.message);
            console.log("\n🔑 SOLUTION: Create a NEW API key:");
            console.log("   1. Go to: https://aistudio.google.com/app/apikey");
            console.log("   2. Delete old keys");
            console.log("   3. Click 'Create API key'");
            console.log("   4. Update .env file with new key");
            console.log("   5. Run this test again\n");
        } else if (data && !data.error) {
            console.log("✅ SUCCESS with gemini-pro!");
            console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text);
            console.log("\n💡 Use 'gemini-pro' in your gemini.js file\n");
        }
    })
    .catch(err => {
        console.log("\n❌ Network Error:", err.message);
        console.log("\n💡 Check your internet connection\n");
    });