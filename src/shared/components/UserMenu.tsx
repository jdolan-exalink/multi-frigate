import { Avatar, Button, Flex, Group, Menu, Text, Select } from "@mantine/core";
import { useMediaQuery } from '@mantine/hooks';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dimensions } from '../dimensions/dimensions';
import ColorSchemeToggle from './buttons/ColorSchemeToggle';
import { useAuth } from '../../hooks/useAuth';


interface UserMenuProps {
    user: { name: string; image: string }
}

const UserMenu = ({ user }: UserMenuProps) => {

    const { t, i18n } = useTranslation()

    const [userAuth, setUser] = useAuth();

    const languages = [
        { lng: 'en', name: 'English' },
        { lng: 'es', name: 'Español' },
    ]

    const isMiddleScreen = useMediaQuery(dimensions.middleScreenSize)

    const handleLogout = () => {
        setUser(null);
        window.location.href = '/login';
    }

    const handleChangeLanguage = async (lng: string) => {
        await i18n.changeLanguage(lng)
    }

    const languageSelector = useCallback(() => {
        return (
            <Select
                label="Idioma"
                placeholder="Selecciona idioma"
                data={languages.map(lang => ({ value: lang.lng, label: lang.name }))}
                value={i18n.resolvedLanguage}
                onChange={(value) => value && handleChangeLanguage(value)}
                size="xs"
                style={{ margin: '0.5rem' }}
            />
        )
    }, [i18n.resolvedLanguage])

    return (
        <Menu
            width={260}
            transitionProps={{ transition: 'pop-top-right' }}
            withinPortal
        >
            <Menu.Target>
                <Button variant="subtle" uppercase pl={0}>
                    <Group spacing={7}>
                        <Avatar src={user.image} alt={user.name} radius="xl" size={33} mr={5} />
                        <Text weight={600} size="sm" sx={{ lineHeight: 1 }} mr={3}>
                            {user.name}
                        </Text>
                    </Group>
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                {
                    isMiddleScreen ?
                        <Flex w='100%' justify='space-between' align='center'>
                            <Text fz='sm' ml='0.7rem'>{t('changeTheme')}</Text>
                            <ColorSchemeToggle />
                        </Flex>
                        :
                        <></>
                }
                {
                    languageSelector()
                }
                <Menu.Item onClick={handleLogout}>
                    {t('logout')}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};

export default UserMenu;