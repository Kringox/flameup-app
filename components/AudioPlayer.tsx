import React, { useState, useRef, useEffect } from 'react';
import PlayIcon from './icons/PlayIcon.tsx';
import PauseIcon from './icons/PauseIcon.tsx';

interface AudioPlayerProps {
  src: string;
  isOwnMessage: boolean;
  // FIX: Add optional duration prop to accept pre-calculated audio duration.
  duration?: number;
}

const formatTime = (time: number) => {
  // FIX: Handle NaN and Infinity values that can come from audio duration.
  if (isNaN(time) || !isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isOwnMessage, duration: initialDuration }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // FIX: Initialize duration state with the passed prop for immediate display.
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const rates = [1, 1.5, 2];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      // Update duration from the audio element once metadata is loaded, if it's a valid number.
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => {
      if (isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
      setCurrentTime(audio.currentTime);
    };

    const handleEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0); // Reset time on end
    };

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnd);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changePlaybackRate = () => {
    const audio = audioRef.current;
    if (audio) {
        const currentIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        const newRate = rates[nextIndex];
        audio.playbackRate = newRate;
        setPlaybackRate(newRate);
    }
  };

  const textColor = isOwnMessage ? 'text-white' : 'text-gray-700 dark:text-gray-300';
  const progressBg = isOwnMessage ? 'bg-white/30' : 'bg-gray-200 dark:bg-zinc-600';
  const progressFill = isOwnMessage ? 'bg-white' : 'bg-flame-orange';

  // FIX: Display the current playback time if playing, otherwise show the total duration.
  const displayedTime = isPlaying ? formatTime(currentTime) : formatTime(duration);

  return (
    <div className={`flex items-center gap-2 w-48 ${textColor}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlayPause}>
        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div className={`w-full h-1 rounded-full ${progressBg}`}>
          <div className={`h-1 rounded-full ${progressFill}`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs mt-1">{displayedTime}</span>
      </div>
      <button onClick={changePlaybackRate} className="text-xs font-bold w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
        {playbackRate}x
      </button>
    </div>
  );
};

export default AudioPlayer;
