import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './globals.css';

const Layout = () => {
  return (
    <GestureHandlerRootView>
      <Stack screenOptions={{
        headerShown: false
      }} />
    </GestureHandlerRootView>
  );
}

export default Layout;