import { MantineThemeOverride } from '@mantine/core';

// VS Code Dark+ Theme Colors
const vscDarkColors = {
  background: '#1e1e1e',           // Editor background
  foreground: '#d4d4d4',          // Editor foreground
  sidebar: '#252526',             // Sidebar background
  sidebarForeground: '#cccccc',   // Sidebar foreground
  activityBar: '#333333',         // Activity bar background
  activityBarForeground: '#ffffff', // Activity bar foreground
  statusBar: '#007acc',           // Status bar background
  statusBarForeground: '#ffffff', // Status bar foreground
  panel: '#1e1e1e',              // Panel background
  border: '#3c3c3c',             // Border color
  input: '#3c3c3c',              // Input background
  button: '#0e639c',             // Button background
  buttonHover: '#1177bb',        // Button hover
  selection: '#264f78',          // Selection background
  findMatch: '#515c6a',          // Find match background
  error: '#f44747',              // Error color
  warning: '#ffcc02',            // Warning color
  info: '#75beff',               // Info color
  success: '#89d185',            // Success color
};

// VS Code Light+ Theme Colors
const vscLightColors = {
  background: '#ffffff',          // Editor background
  foreground: '#000000',          // Editor foreground
  sidebar: '#f3f3f3',            // Sidebar background
  sidebarForeground: '#616161',   // Sidebar foreground
  activityBar: '#2c2c2c',        // Activity bar background
  activityBarForeground: '#ffffff', // Activity bar foreground
  statusBar: '#007acc',          // Status bar background
  statusBarForeground: '#ffffff', // Status bar foreground
  panel: '#f8f8f8',             // Panel background
  border: '#e5e5e5',            // Border color
  input: '#ffffff',             // Input background
  button: '#0e639c',            // Button background
  buttonHover: '#1177bb',       // Button hover
  selection: '#add6ff',         // Selection background
  findMatch: '#f5f5f5',         // Find match background
  error: '#e51400',             // Error color
  warning: '#bf8803',           // Warning color
  info: '#1a85ff',              // Info color
  success: '#13ce66',           // Success color
};

export const createVSCodeTheme = (colorScheme: 'light' | 'dark'): MantineThemeOverride => {
  const colors = colorScheme === 'dark' ? vscDarkColors : vscLightColors;
  
  return {
    colorScheme,
    colors: {
      // Redefine Mantine's color palette to match VS Code
      dark: colorScheme === 'dark' ? [
        colors.foreground,      // dark.0 - lightest
        '#b3b3b3',              // dark.1
        '#969696',              // dark.2
        '#6f6f6f',              // dark.3
        colors.border,          // dark.4
        colors.input,           // dark.5
        colors.sidebar,         // dark.6
        '#1a1a1a',              // dark.7
        colors.background,      // dark.8 - darkest
        '#0d0d0d',              // dark.9
      ] : [
        '#f8f9fa',              // light theme dark colors
        '#e9ecef',
        '#dee2e6',
        '#ced4da',
        '#adb5bd',
        '#6c757d',
        '#495057',
        '#343a40',
        '#212529',
        '#000000',
      ],
      gray: colorScheme === 'light' ? [
        '#f8f9fa',
        '#f1f3f4',
        '#e8eaed',
        '#dadce0',
        '#bdc1c6',
        '#9aa0a6',
        '#80868b',
        '#5f6368',
        '#3c4043',
        '#202124',
      ] : [
        colors.foreground,
        '#c9c9c9',
        '#b3b3b3',
        '#969696',
        '#7a7a7a',
        '#6f6f6f',
        '#525252',
        colors.border,
        colors.sidebar,
        colors.background,
      ],
      blue: [
        '#e7f5ff',
        '#d0ebff',
        '#a5d8ff',
        '#74c0fc',
        '#339af0',
        colors.statusBar,       // Primary blue
        colors.button,          // Button blue
        '#1c7ed6',
        '#1971c2',
        '#1864ab',
      ],
      red: [
        '#fff5f5',
        '#ffe3e3',
        '#ffc9c9',
        '#ffa8a8',
        '#ff8787',
        '#ff6b6b',
        colors.error,           // Error red
        '#e03131',
        '#c92a2a',
        '#a61e1e',
      ],
      yellow: [
        '#fff9db',
        '#fff3bf',
        '#ffec99',
        '#ffe066',
        '#ffd43b',
        colors.warning,         // Warning yellow
        '#fab005',
        '#f59f00',
        '#f08c00',
        '#e67700',
      ],
      green: [
        '#ebfbee',
        '#d3f9d8',
        '#b2f2bb',
        '#8ce99a',
        '#69db7c',
        '#51cf66',
        colors.success,         // Success green
        '#37b24d',
        '#2f9e44',
        '#2b8a3e',
      ],
    },
    primaryColor: 'blue',
    primaryShade: { light: 6, dark: 5 },
    other: {
      vscColors: colors,
    },
    components: {
      Button: {
        defaultProps: {
          radius: 'sm',
        },
        styles: (theme) => ({
          root: {
            backgroundColor: colorScheme === 'dark' ? colors.button : colors.button,
            color: colors.statusBarForeground,
            '&:hover': {
              backgroundColor: colorScheme === 'dark' ? colors.buttonHover : colors.buttonHover,
            },
          },
        }),
      },
      ActionIcon: {
        styles: (theme) => ({
          root: {
            '&:hover': {
              backgroundColor: colorScheme === 'dark' ? colors.border : colors.border,
            },
          },
        }),
      },
      AppShell: {
        styles: (theme) => ({
          root: {
            backgroundColor: colorScheme === 'dark' ? colors.background : colors.background,
          },
          main: {
            backgroundColor: colorScheme === 'dark' ? colors.background : colors.background,
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
        }),
      },
      Header: {
        styles: (theme) => ({
          root: {
            backgroundColor: colorScheme === 'dark' ? colors.sidebar : colors.sidebar,
            borderBottom: `1px solid ${colors.border}`,
          },
        }),
      },
      Navbar: {
        styles: (theme) => ({
          root: {
            backgroundColor: colorScheme === 'dark' ? colors.sidebar : colors.sidebar,
            borderRight: `1px solid ${colors.border}`,
          },
        }),
      },
      Paper: {
        styles: (theme) => ({
          root: {
            backgroundColor: colorScheme === 'dark' ? colors.panel : colors.panel,
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
        }),
      },
      Modal: {
        styles: (theme) => ({
          modal: {
            backgroundColor: colorScheme === 'dark' ? colors.sidebar : colors.sidebar,
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
        }),
      },
      Menu: {
        styles: (theme) => ({
          dropdown: {
            backgroundColor: colorScheme === 'dark' ? colors.sidebar : colors.sidebar,
            borderColor: colors.border,
          },
          item: {
            color: colorScheme === 'dark' ? colors.sidebarForeground : colors.sidebarForeground,
            '&:hover': {
              backgroundColor: colorScheme === 'dark' ? colors.border : colors.selection,
            },
          },
        }),
      },
      Select: {
        styles: (theme) => ({
          input: {
            backgroundColor: colorScheme === 'dark' ? colors.input : colors.input,
            borderColor: colors.border,
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
          dropdown: {
            backgroundColor: colorScheme === 'dark' ? colors.sidebar : colors.sidebar,
            borderColor: colors.border,
          },
          item: {
            color: colorScheme === 'dark' ? colors.sidebarForeground : colors.sidebarForeground,
            '&[data-selected]': {
              backgroundColor: colors.selection,
              color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
            },
            '&:hover': {
              backgroundColor: colorScheme === 'dark' ? colors.border : colors.selection,
            },
          },
        }),
      },
      TextInput: {
        styles: (theme) => ({
          input: {
            backgroundColor: colorScheme === 'dark' ? colors.input : colors.input,
            borderColor: colors.border,
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
        }),
      },
      Text: {
        styles: (theme) => ({
          root: {
            color: colorScheme === 'dark' ? colors.foreground : colors.foreground,
          },
        }),
      },
    },
  };
};

export { vscDarkColors, vscLightColors };