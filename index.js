/**
 * @format
 */

import 'react-native-gesture-handler';

if (!global.crypto?.getRandomValues) {
  global.crypto = {
    ...global.crypto,
    getRandomValues: a => {
      for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
      return a;
    },
  };
}

import { enableScreens } from 'react-native-screens';
enableScreens();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
