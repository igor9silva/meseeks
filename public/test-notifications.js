// Test script for web push notifications
// Run this in the browser console to test notifications

window.testMeseeksNotifications = {
  // Test basic browser notification
  testBrowserNotification() {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('🧪 Test from Console', {
        body: 'This is a test notification from the browser console!',
        icon: '/static/logo-light-192.png',
        tag: 'console-test'
      });
      console.log('✅ Test notification sent');
    } else if (Notification.permission === 'denied') {
      console.warn('❌ Notification permission denied');
    } else {
      console.warn('⚠️ Notification permission not granted. Current:', Notification.permission);
    }
  },

  // Check notification permission status
  checkPermission() {
    console.log('🔔 Notification permission:', Notification.permission);
    console.log('📱 Notifications supported:', 'Notification' in window);
    console.log('👷 Service Worker supported:', 'serviceWorker' in navigator);
    console.log('📤 Push Manager supported:', 'PushManager' in window);
  },

  // Check service worker status
  async checkServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('✅ Service Worker registered:', registration);
          const subscription = await registration.pushManager.getSubscription();
          console.log('📧 Push subscription:', subscription ? 'Active' : 'None');
        } else {
          console.log('❌ No Service Worker registered');
        }
      } catch (error) {
        console.error('Error checking Service Worker:', error);
      }
    } else {
      console.log('❌ Service Worker not supported');
    }
  },

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    console.log('🔔 Permission result:', permission);
    return permission;
  },

  // Test service worker messaging
  async testServiceWorkerMessage() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: 'TEST_MESSAGE',
            data: { test: true, timestamp: Date.now() }
          });
          console.log('✅ Message sent to Service Worker');
        } else {
          console.log('❌ No active Service Worker');
        }
      } catch (error) {
        console.error('Error sending message to Service Worker:', error);
      }
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🧪 Running Meseeks Notification Tests...\n');
    
    this.checkPermission();
    console.log('');
    
    await this.checkServiceWorker();
    console.log('');
    
    if (Notification.permission !== 'granted') {
      console.log('🔔 Requesting notification permission...');
      await this.requestPermission();
      console.log('');
    }
    
    this.testBrowserNotification();
    console.log('');
    
    await this.testServiceWorkerMessage();
    
    console.log('✅ All tests completed!');
  }
};

console.log('🧪 Meseeks Notification Test Utils loaded!');
console.log('📖 Available commands:');
console.log('  • testMeseeksNotifications.runAllTests() - Run all tests');
console.log('  • testMeseeksNotifications.testBrowserNotification() - Test basic notification');
console.log('  • testMeseeksNotifications.checkPermission() - Check permission status');
console.log('  • testMeseeksNotifications.checkServiceWorker() - Check SW status');
console.log('  • testMeseeksNotifications.requestPermission() - Request permission');
console.log(''); 