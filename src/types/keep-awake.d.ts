declare module 'react-native-keep-awake' {
  import { Component } from 'react';

  export default class KeepAwake extends Component<Record<string, never>> {
    static activate(): void;
    static deactivate(): void;
  }
}
