import { Burger, Drawer, Flex, UnstyledButton, createStyles } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React from 'react';
import { LinkItem } from '../../../widgets/header/HeaderAction';
import { useNavigate } from 'react-router-dom';
import { useAdminRole } from '../../../hooks/useAdminRole';

const useStyles = createStyles((theme) => ({
    burger: {
        [theme.fn.largerThan('sm')]: {
            display: 'none',
        },
    },
    drawerButton: {
        color: theme.colorScheme === 'dark' ? '#9cdcfe' : '#0066cc',
        fontWeight: 600,
        fontSize: '1.2rem',
        margin: '0.3rem',
        height: '2.5rem',
        textAlign: 'center',
        borderRadius: '0.5rem',
        transition: 'background-color 0.5s',
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? '#37373d' : '#e8e8e8',
        },
        '&:active': {
            backgroundColor: theme.colorScheme === 'dark' ? '#2d2d30' : '#d6d6d6',
        }
    },
}))

interface DrawerMenuProps {
    links: LinkItem[],
}

const DrawerMenu = ({
    links
}: DrawerMenuProps) => {
    const navigate = useNavigate()
    const isAdmin = useAdminRole()


    const { classes } = useStyles();
    const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false)

    const handleNavigate = (link: string) => {
        navigate(link)
        closeDrawer()
    }

    const items = links.filter(link => !(link.admin && !isAdmin)).map(item => (
        <UnstyledButton
            className={classes.drawerButton}
            key={item.link}
            onClick={() => handleNavigate(item.link)}
            >
            {item.label}
        </UnstyledButton>
    ))


    return (
        <>
            <Burger opened={drawerOpened} onClick={toggleDrawer} className={classes.burger} size='md' ml='1rem' />
            <Drawer
                opened={drawerOpened}
                onClose={closeDrawer}
                size="100%"
                padding="md"
                title="Menu"
                zIndex={1000000}
            >
                <Flex direction='column' w='100%'>
                    {items}
                </Flex>
            </Drawer>
        </>
    );
};



export default DrawerMenu;