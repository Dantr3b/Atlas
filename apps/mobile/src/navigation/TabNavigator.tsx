import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import InProgressScreen from '../screens/InProgressScreen';
import InboxScreen from '../screens/InboxScreen';
import BriefScreen from '../screens/BriefScreen';
import WeekScreen from '../screens/WeekScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: 95,
          paddingBottom: 40,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Aujourd\'hui',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="InProgress"
        component={InProgressScreen}
        options={{
          tabBarLabel: 'En Cours',
          tabBarIcon: ({ color, size }) => (
            <Feather name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <Feather name="inbox" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Brief"
        component={BriefScreen}
        options={{
          tabBarLabel: 'Brief',
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Week"
        component={WeekScreen}
        options={{
          tabBarLabel: 'Semaine',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
