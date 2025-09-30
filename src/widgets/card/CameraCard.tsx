import { Button, Card, Flex, Grid, Group, Text, createStyles } from '@mantine/core';
import { IconVideo, IconCalendarEvent, IconEdit } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAdminRole } from '../../hooks/useAdminRole';
import { useOnWhenVisible } from '../../hooks/useOnWhenVisible';
import { eventsQueryParams } from '../../pages/EventsPage';
import { recordingsPageQuery } from '../../pages/RecordingsPage';
import { routesPath } from '../../router/routes.path';
import { mapHostToHostname, proxyApi } from '../../services/frigate.proxy/frigate.api';
import { GetCameraWHostWConfig } from '../../services/frigate.proxy/frigate.schema';
import AutoUpdatedImage from '../../shared/components/images/AutoUpdatedImage';
import CameraTagsList from '../CameraTagsList';

const useStyles = createStyles((theme) => ({
    mainCard: {
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
        backgroundColor: theme.colorScheme === 'dark' ? theme.fn.darken(theme.colors.gray[7], 0.5) : theme.colors.gray[2],
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? '#37373d' : '#e8e8e8', // VS Code hover colors
        },
    },
    cameraImage: {
        width: '100%',
        height: '100%',
        alignSelf: 'center',
        justifyContent: 'center'
    },
    bottomGroup: {
        marginTop: 'auto',
    },
    headText: {
        color: theme.colorScheme === 'dark' ? theme.colors.gray[4] : theme.colors.gray[9],
        fontWeight: 'bold'
    },
    recordingsButton: {
        backgroundColor: theme.colorScheme === 'dark' ? '#d73a49' : '#d73a49', // VS Code red
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? '#cb2431' : '#cb2431',
        },
        color: 'white',
        border: 'none',
        fontSize: '10px', // Fuente más pequeña
        height: 'auto', // Alto automático basado en contenido
        padding: '4px 8px', // Padding más pequeño
        minHeight: 'unset', // Quitar altura mínima
    },
    eventsButton: {
        backgroundColor: theme.colorScheme === 'dark' ? '#f9826c' : '#e3516e', // VS Code orange/pink
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? '#f74c00' : '#cd3964',
        },
        color: 'white',
        border: 'none',
        fontSize: '10px', // Fuente más pequeña
        height: 'auto', // Alto automático basado en contenido
        padding: '4px 8px', // Padding más pequeño
        minHeight: 'unset', // Quitar altura mínima
    },
    editButton: {
        backgroundColor: theme.colorScheme === 'dark' ? '#569cd6' : '#0066cc', // VS Code blue
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? '#4e94ce' : '#005bb5',
        },
        color: 'white',
        border: 'none',
        fontSize: '10px', // Fuente más pequeña
        height: 'auto', // Alto automático basado en contenido
        padding: '4px 8px', // Padding más pequeño
        minHeight: 'unset', // Quitar altura mínima
    }
}))

interface CameraCardProps {
    camera: GetCameraWHostWConfig
}

const CameraCard = ({
    camera
}: CameraCardProps) => {
    const { t } = useTranslation()
    const { classes } = useStyles();
    const [ref, isVisible] = useOnWhenVisible({ threshold: 0.5 })
    const navigate = useNavigate()
    const hostName = mapHostToHostname(camera.frigateHost)
    const imageUrl = hostName ? proxyApi.cameraImageURL(hostName, camera.name) : '' //todo implement get URL from live cameras
    const { isAdmin } = useAdminRole()


    const handleOpenLiveView = () => {
        const url = routesPath.LIVE_PATH.replace(':id', camera.id)
        navigate(url)
    }
    const handleOpenRecordings = () => {
        const url = `${routesPath.RECORDINGS_PATH}?${recordingsPageQuery.hostId}=${camera.frigateHost?.id}&${recordingsPageQuery.cameraId}=${camera.id}`
        navigate(url)
    }
    const handleOpenEvents = () => {
        const url = `${routesPath.EVENTS_PATH}?${eventsQueryParams.hostId}=${camera.frigateHost?.id}&${eventsQueryParams.cameraId}=${camera.id}`
        navigate(url)
    }

    const handleOpenEditCamera = () => {
        if (camera.frigateHost) {
            const url = routesPath.EDIT_PATH.replace(':id', camera.id)
            navigate(url)
        }
    }

    return (
        <Grid.Col md={6} lg={3} p='0.2rem'>
            <Card ref={ref} h='100%' radius="lg" padding='0.5rem' className={classes.mainCard}>
                <Text align='center' size='md' className={classes.headText} >{camera.name} / {camera.frigateHost?.name}</Text>
                {!isVisible ? null :
                    <AutoUpdatedImage onClick={handleOpenLiveView} enabled={camera.config?.enabled} imageUrl={imageUrl} />
                }
                <Group
                    className={classes.bottomGroup}>
                    <Flex justify='flex-start' align='center' mt='0.5rem' w='100%' wrap='wrap' gap="0.25rem">
                        <Button 
                            size='xs' 
                            onClick={handleOpenRecordings}
                            className={classes.recordingsButton}
                            leftIcon={<IconVideo size={12} />}
                        >
                            {t('recordings')}
                        </Button>
                        <Button 
                            size='xs' 
                            onClick={handleOpenEvents}
                            className={classes.eventsButton}
                            leftIcon={<IconCalendarEvent size={12} />}
                        >
                            {t('events')}
                        </Button>
                        {!isAdmin ? null : 
                            <Button 
                                size='xs' 
                                onClick={handleOpenEditCamera}
                                className={classes.editButton}
                                leftIcon={<IconEdit size={12} />}
                            >
                                {t('edit')}
                            </Button>
                        }
                    </Flex>
                </Group>
                <CameraTagsList camera={camera} />
            </Card>
        </Grid.Col >
    );
};

export default CameraCard;