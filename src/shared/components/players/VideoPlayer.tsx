import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css'
import { isProduction } from '../../env.const';
import { useAuth } from '../../../hooks/useAuth';
import axios from 'axios';

interface VideoPlayerProps {
  videoUrl: string
}

const VideoPlayer = ({ videoUrl }: VideoPlayerProps) => {
  const [user] = useAuth()
  const executed = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [showDownload, setShowDownload] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);

  const probeAndSetSrc = async () => {
    try {
      const response = await axios.post('/api/probe', { url: videoUrl }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      const { codec } = response.data;
      if (codec === 'hevc') {
        // H265, transcode
        setIsTranscoding(true);
        const transcodeResponse = await axios.post('/api/transcode', { url: videoUrl }, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        const transcodedUrl = transcodeResponse.data.url;
        if (playerRef.current) {
          playerRef.current.src({
            src: transcodedUrl,
            type: 'video/mp4'
          });
        }
        setIsTranscoding(false);
      } else {
        // H264 or other, play normal
        if (playerRef.current) {
          playerRef.current.src(videoUrl);
        }
      }
    } catch (error) {
      console.error('Probe or transcode failed:', error);
      // Fallback to normal
      if (playerRef.current) {
        playerRef.current.src(videoUrl);
      }
    }
  };

  useEffect(() => {
    if (!executed.current) {
      //@ts-ignore
      videojs.Vhs.xhr.beforeRequest = function (options: any) {
        options.headers = {
          ...options.headers,
        };
        if (user?.token) {
          options.headers.Authorization = `Bearer ${user.token}`;
        }
        return options;
      };

      const defaultOptions = {
        preload: 'auto',
        autoplay: true,
        sources: [
          {
            src: videoUrl,
            type: 'application/vnd.apple.mpegurl',
            withCredentials: true,
          },
        ],
        controls: true,
        controlBar: {
          skipButtons: { forward: 10, backward: 5 },
        },
        playbackRates: [0.5, 1, 2, 4, 8],
        fluid: true,
      };

      //TODO add rotations on IOS and android devices

      if (!isProduction) console.log('playerRef.current', playerRef.current)

      if (videoRef.current) {
        if (!isProduction) console.log('mount new player')
        playerRef.current = videojs(videoRef.current, { ...defaultOptions }, () => {
          if (!isProduction) console.log('player is ready')
          // Probe and set src
          probeAndSetSrc();
        });
      }
      if (!isProduction) console.log('VideoPlayer rendered')
      return () => {
        if (playerRef.current !== null) {
          playerRef.current.dispose();
          playerRef.current = null;
          if (!isProduction) console.log('unmount player')
        }
      };
    }
    executed.current = true
  }, []);


  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.src(videoUrl);
      if (!isProduction) console.log('player change src')
    }
  }, [videoUrl]);

  useEffect(() => {
    if (playerRef.current && executed.current) {
      probeAndSetSrc();
    }
  }, [videoUrl]);

  const handleTranscode = async () => {
    setIsTranscoding(true);
    try {
      const response = await axios.post('/api/transcode', { url: videoUrl }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      const transcodedUrl = response.data.url;
      // Change src to transcoded MP4
      if (playerRef.current) {
        playerRef.current.src({
          src: transcodedUrl,
          type: 'video/mp4'
        });
        setShowDownload(false);
      }
    } catch (error) {
      console.error('Transcoding failed:', error);
      alert('Error al transcodificar el video');
    } finally {
      setIsTranscoding(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div data-vjs-player>
        {/* Setting an empty data-setup is required to override the default values and allow video to be fit the size of its parent */}
        <video ref={videoRef} className="small-player video-js vjs-default-skin" data-setup="{}" controls playsInline />
      </div>
      {isTranscoding && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          zIndex: 10
        }}>
          Transcodificando H265 a H264...
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

