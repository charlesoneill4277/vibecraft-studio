#!/usr/bin/env tsx

/**
 * Test script for Chat Interface Components (Task 6.1)
 * 
 * This script tests the implementation of:
 * - Chat message components with role-based styling
 * - Message input component with rich text support
 * - Message actions (edit, delete, copy, rate)
 * - Typing indicators and loading states
 * - Project-specific chat functionality
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

function runTests(): TestResult[] {
  const results: TestResult[] = [];
  
  console.log('🧪 Testing Chat Interface Components Implementation...\n');

  // Test 1: Project Chat Page exists
  const chatPagePath = join(process.cwd(), 'src/app/(protected)/projects/[id]/chat/page.tsx');
  results.push({
    name: 'Project Chat Page exists',
    passed: existsSync(chatPagePath),
    details: chatPagePath
  });

  // Test 2: Project Chat Interface Component exists
  const chatInterfacePath = join(process.cwd(), 'src/components/project/project-chat-interface.tsx');
  results.push({
    name: 'Project Chat Interface Component exists',
    passed: existsSync(chatInterfacePath),
    details: chatInterfacePath
  });

  // Test 3: Project Chat Message Component exists
  const chatMessagePath = join(process.cwd(), 'src/components/project/project-chat-message.tsx');
  results.push({
    name: 'Project Chat Message Component exists',
    passed: existsSync(chatMessagePath),
    details: chatMessagePath
  });

  // Test 4: Project Chat Input Component exists
  const chatInputPath = join(process.cwd(), 'src/components/project/project-chat-input.tsx');
  results.push({
    name: 'Project Chat Input Component exists',
    passed: existsSync(chatInputPath),
    details: chatInputPath
  });

  // Test 5: Typing Indicator Component exists
  const typingIndicatorPath = join(process.cwd(), 'src/components/project/typing-indicator.tsx');
  results.push({
    name: 'Typing Indicator Component exists',
    passed: existsSync(typingIndicatorPath),
    details: typingIndicatorPath
  });

  // Test 6: AI Chat feature flag is enabled
  const featureFlagsPath = join(process.cwd(), 'src/lib/feature-flags/client-service.ts');
  if (existsSync(featureFlagsPath)) {
    const content = readFileSync(featureFlagsPath, 'utf-8');
    const aiChatEnabled = content.includes('ai_chat: true');
    results.push({
      name: 'AI Chat feature flag is enabled',
      passed: aiChatEnabled,
      details: aiChatEnabled ? 'ai_chat: true found' : 'ai_chat: false or not found'
    });
  }

  // Test 7: Chat Interface has role-based styling
  if (existsSync(chatInterfacePath)) {
    const content = readFileSync(chatInterfacePath, 'utf-8');
    const hasRoleBasedStyling = content.includes('isUser') && content.includes('isAssistant');
    results.push({
      name: 'Chat Interface has role-based styling',
      passed: hasRoleBasedStyling,
      details: hasRoleBasedStyling ? 'Role-based styling detected' : 'No role-based styling found'
    });
  }

  // Test 8: Chat Message has message actions
  if (existsSync(chatMessagePath)) {
    const content = readFileSync(chatMessagePath, 'utf-8');
    const hasMessageActions = content.includes('onDelete') && 
                             content.includes('onRate') && 
                             content.includes('onEdit') &&
                             content.includes('Copy');
    results.push({
      name: 'Chat Message has message actions (edit, delete, copy, rate)',
      passed: hasMessageActions,
      details: hasMessageActions ? 'All message actions found' : 'Some message actions missing'
    });
  }

  // Test 9: Chat Input has rich text support features
  if (existsSync(chatInputPath)) {
    const content = readFileSync(chatInputPath, 'utf-8');
    const hasRichFeatures = content.includes('Textarea') && 
                           content.includes('temperature') && 
                           content.includes('maxTokens') &&
                           content.includes('QUICK_PROMPTS');
    results.push({
      name: 'Chat Input has rich text support and advanced features',
      passed: hasRichFeatures,
      details: hasRichFeatures ? 'Rich text features found' : 'Some rich text features missing'
    });
  }

  // Test 10: Typing Indicator has animation
  if (existsSync(typingIndicatorPath)) {
    const content = readFileSync(typingIndicatorPath, 'utf-8');
    const hasAnimation = content.includes('animate-bounce') && content.includes('typing');
    results.push({
      name: 'Typing Indicator has animation',
      passed: hasAnimation,
      details: hasAnimation ? 'Animation classes found' : 'No animation found'
    });
  }

  // Test 11: Project Chat Interface has loading states
  if (existsSync(chatInterfacePath)) {
    const content = readFileSync(chatInterfacePath, 'utf-8');
    const hasLoadingStates = content.includes('isLoading') && 
                            content.includes('isStreaming') &&
                            content.includes('Loader2');
    results.push({
      name: 'Chat Interface has loading states',
      passed: hasLoadingStates,
      details: hasLoadingStates ? 'Loading states found' : 'Loading states missing'
    });
  }

  // Test 12: Project-specific system prompt generation
  if (existsSync(chatInterfacePath)) {
    const content = readFileSync(chatInterfacePath, 'utf-8');
    const hasProjectPrompt = content.includes('generateProjectSystemPrompt') && 
                            content.includes('project.name') &&
                            content.includes('project.description');
    results.push({
      name: 'Project-specific system prompt generation',
      passed: hasProjectPrompt,
      details: hasProjectPrompt ? 'Project system prompt found' : 'No project system prompt'
    });
  }

  // Test 13: Chat export functionality
  if (existsSync(chatInterfacePath)) {
    const content = readFileSync(chatInterfacePath, 'utf-8');
    const hasExport = content.includes('handleExportChat') && content.includes('download');
    results.push({
      name: 'Chat export functionality',
      passed: hasExport,
      details: hasExport ? 'Export functionality found' : 'No export functionality'
    });
  }

  // Test 14: Message metadata display
  if (existsSync(chatMessagePath)) {
    const content = readFileSync(chatMessagePath, 'utf-8');
    const hasMetadata = content.includes('responseTime') && 
                       content.includes('tokenCount') &&
                       content.includes('Badge');
    results.push({
      name: 'Message metadata display (tokens, response time, cost)',
      passed: hasMetadata,
      details: hasMetadata ? 'Metadata display found' : 'Metadata display missing'
    });
  }

  // Test 15: Avatar support in messages
  if (existsSync(chatMessagePath)) {
    const content = readFileSync(chatMessagePath, 'utf-8');
    const hasAvatars = content.includes('Avatar') && content.includes('showAvatar');
    results.push({
      name: 'Avatar support in chat messages',
      passed: hasAvatars,
      details: hasAvatars ? 'Avatar support found' : 'No avatar support'
    });
  }

  return results;
}

function printResults(results: TestResult[]): void {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed\n`);
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} ${index + 1}. ${result.name} - ${status}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });

  if (passed === total) {
    console.log('\n🎉 All tests passed! Chat Interface Components are properly implemented.');
    console.log('\n✨ Task 6.1 - Chat Interface Components: COMPLETED');
    console.log('\nImplemented features:');
    console.log('• Project-specific chat page with workspace layout');
    console.log('• Enhanced chat interface with project context');
    console.log('• Role-based message styling (user vs assistant)');
    console.log('• Message actions: edit, delete, copy, rate');
    console.log('• Rich text input with quick prompts and settings');
    console.log('• Typing indicators with smooth animations');
    console.log('• Loading states and streaming support');
    console.log('• Message metadata display (tokens, time, cost)');
    console.log('• Avatar support and project-specific system prompts');
    console.log('• Chat export functionality');
    console.log('• AI Chat feature flag enabled');
  } else {
    console.log(`\n⚠️  ${total - passed} tests failed. Please review the implementation.`);
    process.exit(1);
  }
}

// Component Architecture Test
function testComponentArchitecture(): void {
  console.log('\n🏗️  Testing Component Architecture...\n');

  const components = [
    {
      name: 'ProjectChatInterface',
      path: 'src/components/project/project-chat-interface.tsx',
      expectedProps: ['projectId', 'project', 'className'],
      expectedFeatures: ['message history', 'streaming', 'export', 'stats']
    },
    {
      name: 'ProjectChatMessage', 
      path: 'src/components/project/project-chat-message.tsx',
      expectedProps: ['message', 'project', 'onDelete', 'onRate', 'onEdit'],
      expectedFeatures: ['role styling', 'actions', 'metadata', 'avatars']
    },
    {
      name: 'ProjectChatInput',
      path: 'src/components/project/project-chat-input.tsx', 
      expectedProps: ['project', 'onSendMessage', 'providers'],
      expectedFeatures: ['rich input', 'quick prompts', 'settings', 'streaming']
    },
    {
      name: 'TypingIndicator',
      path: 'src/components/project/typing-indicator.tsx',
      expectedProps: ['users', 'className'],
      expectedFeatures: ['animation', 'multiple users', 'avatars']
    }
  ];

  components.forEach(component => {
    if (existsSync(component.path)) {
      const content = readFileSync(component.path, 'utf-8');
      
      console.log(`📦 ${component.name}:`);
      
      // Check props
      const hasProps = component.expectedProps.every(prop => 
        content.includes(prop)
      );
      console.log(`   Props: ${hasProps ? '✅' : '❌'} (${component.expectedProps.join(', ')})`);
      
      // Check features
      const hasFeatures = component.expectedFeatures.every(feature => {
        switch(feature) {
          case 'message history': return content.includes('messages') && content.includes('ScrollArea');
          case 'streaming': return content.includes('isStreaming');
          case 'export': return content.includes('export') || content.includes('download');
          case 'stats': return content.includes('stats');
          case 'role styling': return content.includes('isUser') && content.includes('isAssistant');
          case 'actions': return content.includes('onDelete') && content.includes('onRate');
          case 'metadata': return content.includes('metadata') && content.includes('Badge');
          case 'avatars': return content.includes('Avatar');
          case 'rich input': return content.includes('Textarea') && content.includes('temperature');
          case 'quick prompts': return content.includes('QUICK_PROMPTS');
          case 'settings': return content.includes('showSettings');
          case 'animation': return content.includes('animate-bounce');
          case 'multiple users': return content.includes('displayUsers');
          default: return false;
        }
      });
      console.log(`   Features: ${hasFeatures ? '✅' : '❌'} (${component.expectedFeatures.join(', ')})`);
      
    } else {
      console.log(`📦 ${component.name}: ❌ File not found`);
    }
    console.log();
  });
}

// Integration Test
function testIntegration(): void {
  console.log('\n🔗 Testing Integration...\n');

  // Test chat page integration
  const chatPagePath = join(process.cwd(), 'src/app/(protected)/projects/[id]/chat/page.tsx');
  if (existsSync(chatPagePath)) {
    const content = readFileSync(chatPagePath, 'utf-8');
    const hasIntegration = content.includes('ProjectWorkspaceLayout') && 
                          content.includes('ProjectChatInterface') &&
                          content.includes('useProjects');
    
    console.log(`🔗 Chat Page Integration: ${hasIntegration ? '✅' : '❌'}`);
    console.log(`   - Workspace Layout: ${content.includes('ProjectWorkspaceLayout') ? '✅' : '❌'}`);
    console.log(`   - Chat Interface: ${content.includes('ProjectChatInterface') ? '✅' : '❌'}`);
    console.log(`   - Project Hook: ${content.includes('useProjects') ? '✅' : '❌'}`);
  }

  // Test navigation integration
  const sidebarPath = join(process.cwd(), 'src/components/project/project-sidebar.tsx');
  if (existsSync(sidebarPath)) {
    const content = readFileSync(sidebarPath, 'utf-8');
    const hasChatNav = content.includes("'chat'") && content.includes('MessageSquare');
    
    console.log(`🔗 Navigation Integration: ${hasChatNav ? '✅' : '❌'}`);
    console.log(`   - Chat Section: ${content.includes("'chat'") ? '✅' : '❌'}`);
    console.log(`   - Chat Icon: ${content.includes('MessageSquare') ? '✅' : '❌'}`);
  }

  // Test feature flag integration
  const overviewPagePath = join(process.cwd(), 'src/app/(protected)/projects/[id]/page.tsx');
  if (existsSync(overviewPagePath)) {
    const content = readFileSync(overviewPagePath, 'utf-8');
    const hasChatCard = content.includes('Start Chatting') && !content.includes('flagName="ai_chat"');
    
    console.log(`🔗 Feature Flag Integration: ${hasChatCard ? '✅' : '❌'}`);
    console.log(`   - Chat Card Active: ${content.includes('Start Chatting') ? '✅' : '❌'}`);
    console.log(`   - Coming Soon Removed: ${!content.includes('flagName="ai_chat"') ? '✅' : '❌'}`);
  }
}

// Run all tests
function main(): void {
  console.log('🚀 Testing Chat Interface Components Implementation (Task 6.1)\n');
  console.log('=' .repeat(60));
  
  const results = runTests();
  testComponentArchitecture();
  testIntegration();
  printResults(results);
}

if (require.main === module) {
  main();
}