import { MD3DarkTheme as DefaultTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System', 
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FFFFFF',      
    onPrimary: '#000000',   
    primaryContainer: '#222222', 
    onPrimaryContainer: '#FFFFFF',
    secondary: '#888888',
    onSecondary: '#000000',
    secondaryContainer: '#333333',
    onSecondaryContainer: '#FFFFFF',
    tertiary: '#444444',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#111111',
    onTertiaryContainer: '#FFFFFF',
    background: '#000000',   
    onBackground: '#FFFFFF', 
    surface: '#0A0A0A',      
    onSurface: '#FFFFFF',
    surfaceVariant: '#121212',
    onSurfaceVariant: '#DDDDDD',
    outline: '#333333',
    inverseSurface: '#FFFFFF',
    inverseOnSurface: '#000000',
    inversePrimary: '#000000',
    error: '#FFFFFF',        
    onError: '#000000',
    elevation: {
      level0: 'transparent',
      level1: '#0A0A0A',
      level2: '#121212',
      level3: '#1A1A1A',
      level4: '#222222',
      level5: '#2A2A2A',
    },
  },
  roundness: 12, 
};

export default theme;
