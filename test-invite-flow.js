/**
 * Test script for Telegram invite flow
 * Run: node test-invite-flow.js
 *
 * This script tests:
 * 1. Creating a user without Telegram ID (generates invite link)
 * 2. Creating a user with Telegram ID (immediately active)
 * 3. Verifying auth guard prevents pending_telegram users from login
 * 4. Simulating webhook callback
 */

const crypto = require('crypto');

const API_BASE = 'http://localhost:3000';
const ADMIN_TOKEN = 'test-admin-token'; // You'll need a real token

// Helper to make API requests
async function apiCall(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test scenarios
async function runTests() {
  console.log('🧪 Telegram Invite Flow Test Suite\n');
  console.log('=' .repeat(50));

  // ─── Test 1: Create user without Telegram ID ─────────────────────────────
  console.log('\n📝 Test 1: Create user WITHOUT Telegram ID');
  console.log('-'.repeat(50));

  const userData1 = {
    name: 'Dr. Priya Sharma',
    email: `priya.${Date.now()}@sims.edu`,
    telegram_id: '', // Empty = will generate invite link
    role: 'faculty',
    department: 'Pharmacology',
    designation: 'Assistant Professor',
  };

  console.log('Request:', JSON.stringify(userData1, null, 2));

  const { status: status1, data: response1 } = await apiCall(
    'POST',
    '/users',
    userData1,
    ADMIN_TOKEN
  );

  console.log(`\nResponse Status: ${status1}`);

  if (response1.error) {
    console.log('❌ Error:', response1.message);
    console.log('Note: You may need a valid admin token to test this');
    console.log('Get token: Login as admin at http://localhost:5173, check localStorage');
  } else {
    console.log('✅ User created successfully');
    console.log(`   Status: ${response1.user?.status}`);
    console.log(`   Telegram Token: ${response1.user?.telegram_invite_token?.substring(0, 20)}...`);
    console.log(`   Expires At: ${response1.user?.telegram_invite_expires_at}`);
    console.log(`   Invite Link: ${response1.invite_link}`);

    const inviteToken = response1.user?.telegram_invite_token;
    const userId = response1.user?.id;

    // ─── Test 2: Verify auth guard ──────────────────────────────────────
    if (inviteToken) {
      console.log('\n📝 Test 2: Verify auth guard for pending_telegram user');
      console.log('-'.repeat(50));

      const { status: status2, data: response2 } = await apiCall(
        'POST',
        '/auth/request-otp',
        { email: userData1.email }
      );

      console.log(`Response Status: ${status2}`);
      if (response2.code === 'TELEGRAM_NOT_LINKED') {
        console.log('✅ Auth guard working correctly');
        console.log(`   Message: ${response2.message}`);
      } else if (response2.error) {
        console.log(`⚠️  Got error: ${response2.message}`);
      } else {
        console.log('❌ Auth guard not working - user should not be able to login yet');
      }
    }

    // ─── Test 3: Simulate webhook callback ──────────────────────────────
    if (inviteToken) {
      console.log('\n📝 Test 3: Simulate Telegram webhook callback');
      console.log('-'.repeat(50));

      const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 'test-secret';
      const chatId = '123456789';

      const webhookPayload = {
        message: {
          text: `/start invite_${inviteToken}`,
          chat: { id: chatId },
        },
      };

      console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));

      const { status: status3, data: response3 } = await apiCall(
        'POST',
        `/bot/webhook/${webhookSecret}`,
        webhookPayload
      );

      console.log(`Response Status: ${status3}`);
      if (status3 === 200) {
        console.log('✅ Webhook call accepted');
        console.log('   (Check server logs for activation details)');
      } else if (status3 === 403) {
        console.log('⚠️  Webhook secret mismatch (403 Forbidden)');
        console.log('   Set correct TELEGRAM_WEBHOOK_SECRET in .env');
      } else {
        console.log(`❌ Webhook error: ${response3.message}`);
      }
    }
  }

  // ─── Test 4: Create user WITH Telegram ID ──────────────────────────────
  console.log('\n📝 Test 4: Create user WITH Telegram ID');
  console.log('-'.repeat(50));

  const userData2 = {
    name: 'Dr. Raj Kumar',
    email: `raj.${Date.now()}@sims.edu`,
    telegram_id: '987654321', // Provided = immediately active
    role: 'admin',
    department: 'Engineering',
  };

  console.log('Request:', JSON.stringify(userData2, null, 2));

  const { status: status4, data: response2 } = await apiCall(
    'POST',
    '/users',
    userData2,
    ADMIN_TOKEN
  );

  console.log(`\nResponse Status: ${status4}`);

  if (response2.error) {
    console.log('❌ Error:', response2.message);
  } else {
    console.log('✅ User created successfully');
    console.log(`   Status: ${response2.user?.status}`);
    console.log(`   Telegram ID: ${response2.user?.telegram_id}`);
    console.log(`   Verified: ${response2.user?.telegram_verified}`);
    console.log(`   Invite Link: ${response2.invite_link}`);

    if (response2.user?.status === 'active' && !response2.invite_link) {
      console.log('✅ User is immediately active (no invite needed)');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Summary:');
  console.log('1. Path A (no telegram_id): Generates 7-day invite token');
  console.log('2. Path B (with telegram_id): Immediately active');
  console.log('3. Webhook: Activates pending_telegram accounts');
  console.log('\n💡 Tip: Get admin token from browser localStorage');
  console.log('   Open DevTools → Application → localStorage → token');
}

// Run tests
runTests().catch(console.error);
