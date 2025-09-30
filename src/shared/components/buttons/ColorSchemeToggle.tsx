import { useMantineColorScheme, useMantineTheme, Switch,  MantineStyleSystemProps, DefaultProps } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import React from 'react';

interface ColorSchemeToggleProps extends MantineStyleSystemProps, DefaultProps {}


const ColorSchemeToggle = ( props: ColorSchemeToggleProps ) => {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const theme = useMantineTheme();
    
    // Get VS Code colors from theme
    const vscColors = theme.other?.vscColors || {};
    
    return (
        <Switch
          {...props}
          checked={colorScheme === 'dark'}
          onChange={() => toggleColorScheme()}
          size="lg"
          onLabel={<IconMoon color={vscColors.activityBarForeground || theme.white} size="1.25rem" stroke={1.5} />}
          offLabel={<IconSun color={vscColors.warning || theme.colors.yellow[6]} size="1.25rem" stroke={1.5} />}
          styles={{
            track: {
              backgroundColor: colorScheme === 'dark' 
                ? vscColors.input || theme.colors.dark[5]
                : vscColors.border || theme.colors.gray[3],
              borderColor: vscColors.border || theme.colors.gray[4],
            },
            thumb: {
              backgroundColor: colorScheme === 'dark'
                ? vscColors.button || theme.colors.blue[6]
                : vscColors.button || theme.colors.blue[6],
            }
          }}
        />
    );
};

export default ColorSchemeToggle;