import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

let apiPromise;
function loadAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => { apiPromise = null; script.remove(); reject(new Error('Không tải được trình phát YouTube. Kiểm tra mạng rồi mở lại bài học.')); }, 20000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(window.YT); };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); script.remove(); apiPromise = null; reject(new Error('Không tải được trình phát YouTube.')); };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export default forwardRef(function YouTubePlayer({ videoId, title, onTime, onError }, ref) {
  const host = useRef();
  const api = useRef();
  const ready = useRef(false);
  const pendingSeek = useRef(null);
  const callbacks = useRef({ onTime, onError });
  callbacks.current = { onTime, onError };
  useImperativeHandle(ref, () => ({
    playFrom: seconds => {
      if (!ready.current) { pendingSeek.current = seconds; return true; }
      api.current.seekTo(seconds, true); api.current.playVideo(); return true;
    },
    pause: () => { if (ready.current) api.current.pauseVideo(); },
    play: () => { if (ready.current) api.current.playVideo(); }
  }), []);
  useEffect(() => {
    let disposed = false, timer;
    const mount = document.createElement('div');
    host.current.dataset.ready = 'false';
    host.current.appendChild(mount);
    const sample = () => {
      if (!ready.current || disposed) return;
      callbacks.current.onTime({ time: api.current.getCurrentTime(), state: api.current.getPlayerState() });
    };
    loadAPI().then(YT => {
      if (disposed) return;
      api.current = new YT.Player(mount, {
        videoId, width: '100%', height: '100%',
        playerVars: { origin: location.origin, playsinline: 1, rel: 0 },
        events: {
          onReady: event => { ready.current = true; host.current.dataset.ready = 'true'; event.target.getIframe().title = title; if (pendingSeek.current !== null) { event.target.seekTo(pendingSeek.current, true); event.target.playVideo(); pendingSeek.current = null; } sample(); timer = setInterval(sample, 100); },
          onStateChange: sample,
          onError: event => callbacks.current.onError(`YouTube không phát được video (${event.data}). Bạn có thể mở video trên YouTube hoặc chọn video khác.`)
        }
      });
    }).catch(error => { if (!disposed) callbacks.current.onError(error.message); });
    return () => { disposed = true; ready.current = false; pendingSeek.current = null; clearInterval(timer); api.current?.destroy(); api.current = null; mount.remove(); };
  }, [videoId]);
  return <div ref={host} className="youtube-player" />;
});
